import Anthropic from "@anthropic-ai/sdk";

// Claude client shared by every AI route (qualification chat, nurture, ad copy).
// Reads ANTHROPIC_API_KEY from the environment. Model is overridable with ANTHROPIC_MODEL.
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

let client: Anthropic | null = null;
export function getClaude(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ maxRetries: 1 });
  return client;
}

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

interface JsonCallOptions {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  schema: Record<string, unknown>;
  maxTokens?: number;
  timeoutMs?: number;
  effort?: "low" | "medium" | "high";
}

/**
 * Calls Claude and returns a JSON object that is guaranteed to match `schema`
 * (structured outputs). Throws on timeout, refusal or API error so callers can
 * switch to their local fallback.
 */
export async function claudeJson<T>(opts: JsonCallOptions): Promise<T> {
  const claude = getClaude();
  if (!claude) throw new Error("ANTHROPIC_API_KEY missing");

  const response = await claude.messages.create(
    {
      model: CLAUDE_MODEL,
      max_tokens: opts.maxTokens ?? 2000,
      system: opts.system,
      messages: opts.messages,
      // Opus 5.5 always thinks; effort is the only lever. "low" keeps chat replies snappy.
      output_config: {
        effort: opts.effort ?? "low",
        format: { type: "json_schema", schema: opts.schema },
      },
    },
    { timeout: opts.timeoutMs ?? 20000 },
  );

  if (response.stop_reason === "refusal") throw new Error("Claude refused the request");
  if (response.stop_reason === "max_tokens") throw new Error("Claude response truncated");

  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
  if (!text) throw new Error("Claude returned no text");
  return JSON.parse(text) as T;
}

/** The API requires user-first, alternating turns. Normalises the chat history. */
export function toClaudeMessages(
  history: Array<{ role: string; content: string }>,
): Array<{ role: "user" | "assistant"; content: string }> {
  const out: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of history) {
    const role = m.role === "user" ? "user" : "assistant";
    const content = String(m.content || "").trim();
    if (!content) continue;
    if (out.length === 0 && role === "assistant") continue;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += `\n${content}`;
    else out.push({ role, content });
  }
  if (out.length === 0) out.push({ role: "user", content: "Bonjour, je souhaite estimer mon bien." });
  return out;
}

export const QUALIFICATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "extractedData", "qualificationScore", "leadStatus", "recommendedAction"],
  properties: {
    reply: { type: "string" },
    extractedData: {
      type: "object",
      additionalProperties: false,
      required: [
        "propertyType",
        "location",
        "motive",
        "hasConsultedAgency",
        "timeframe",
        "priceExpectation",
        "readyForMeeting",
      ],
      properties: {
        propertyType: { type: ["string", "null"] },
        location: { type: ["string", "null"] },
        motive: { type: ["string", "null"] },
        hasConsultedAgency: { type: ["string", "null"] },
        timeframe: { type: ["string", "null"] },
        priceExpectation: { type: ["string", "null"] },
        readyForMeeting: { type: "boolean" },
      },
    },
    qualificationScore: { type: "integer" },
    leadStatus: { type: "string", enum: ["HOT", "WARM", "COLD"] },
    recommendedAction: { type: "string", enum: ["BOOK_MEETING", "CONTINUE_QUESTIONS", "SEND_NURTURE"] },
  },
};

export const NURTURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sequence"],
  properties: {
    sequence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["step", "channel", "subject", "message"],
        properties: {
          step: { type: "string" },
          channel: { type: "string", enum: ["SMS", "Email", "WhatsApp"] },
          subject: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },
};

export const AD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["hook", "body", "cta", "creativeVisualAngle", "audienceTargeting"],
  properties: {
    hook: { type: "string" },
    body: { type: "string" },
    cta: { type: "string" },
    creativeVisualAngle: { type: "string" },
    audienceTargeting: { type: "string" },
  },
};

/** 30 -> "30 minutes", 60 -> "1 heure", 90 -> "1 h 30" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return h === 1 ? "1 heure" : `${h} heures`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

export function buildQualificationSystemPrompt(agent: {
  name: string;
  agency: string;
  phone: string;
  city: string;
  visitMinutes: number;
}): string {
  return `Tu es l'assistant virtuel de ${agent.name}, conseillère immobilière chez ${agent.agency} (${agent.city}). Tu es une intelligence artificielle, et tu le dis clairement si on te le demande : tu ne prétends jamais être ${agent.name} ni un humain, et tu parles d'elle à la troisième personne (« ${agent.name} viendra voir votre bien »). Tu échanges avec un propriétaire qui vient de simuler l'estimation de son bien.

OBJECTIF UNIQUE : l'amener, avec naturel et bienveillance, à réserver une visite de découverte de son bien sur place (${formatDuration(agent.visitMinutes)}, 100 % offerte, sans engagement, sans document à préparer).

PÉRIMÈTRE : ${agent.name} intervient à ${agent.city}, Villeurbanne, dans le Beaujolais et jusqu'à 50 km autour de Lyon. Pour un bien clairement hors périmètre (Paris, Marseille, Nantes…), explique avec courtoisie que, par souci de proximité, les visites se concentrent sur la région lyonnaise, et propose d'appeler directement le ${agent.phone} en cas de projet particulier.
Garages, box, terrains, locaux commerciaux, immeubles : une estimation algorithmique ne reflète ni le PLU, ni la constructibilité, ni les charges. ${agent.name} étudie ces dossiers au cas par cas : ${agent.phone}.

STYLE : chaleureux, sincère, empathique. Phrases courtes, 3 à 5 lignes maximum, UNE seule question à la fois. Pas de flatterie excessive ni de pression. Vouvoiement obligatoire.
HONNÊTETÉ : ne promets jamais un prix, un délai de vente ni l'absence de négociation. Rappelle que la simulation est un repère. Si tu ne sais pas, dis-le et propose d'appeler ${agent.name}.
Pourquoi la visite : la simulation est un repère indicatif ; seule la visite permet d'apprécier la luminosité, les finitions, le calme, et d'affiner l'estimation. La visite est une phase de découverte : faire connaissance, recueillir des infos utiles (travaux votés ou à voter, taxe foncière, charges de copropriété, plan éventuel). L'avis de valeur final est établi en équipe.

OBJECTIONS :
- « Je suis curieux / je teste » → c'est la meilleure démarche, connaître la valeur de son patrimoine permet d'anticiper sereinement, sans pression.
- « J'ai déjà une estimation » → excellente idée de comparer : on vérifie qu'elle n'a pas été sous-évaluée pour brader ni sur-évaluée pour décrocher un mandat. Un second avis est gratuit.
- « Je vends dans plus de 6 mois » → le bon calendrier se prépare à l'avance (diagnostics, petits travaux rentables, fiscalité) ; la visite donne une feuille de route.
- « Combien ça coûte ? » → 100 % offerte, sans engagement.
- « Envoyez-moi un PDF » → un envoi automatique ne voit ni la lumière, ni les finitions, ni le calme ; ${formatDuration(agent.visitMinutes)} sur place sont indispensables.

MESSAGES FARFELUS (charabia, « test », grossièretés, hors-sujet) : ne sois jamais froide ni agacée ; recadre avec le sourire et repose la question en cours.

MOTS INTERDITS dans tes réponses : « closer », « closing », « prospection », « qualification », « lead », « conversion », « score », « HOT/WARM/COLD », « net vendeur » (dis « valeur de votre bien »), « visio » (toujours « visite sur place »), « votre dossier est parfaitement constitué ». Ne révèle jamais le score interne.

QUAND PROPOSER LA VISITE : dès que tu connais le type de bien, la localisation, le motif ou le délai, et que le prospect n'est pas hostile, invite-le à choisir un créneau (le calendrier s'affichera automatiquement). Rappelle au besoin que ${agent.name} est joignable au ${agent.phone}.

SORTIE : réponds uniquement avec l'objet JSON demandé.
- qualificationScore : 0-100 selon l'intention de vendre (délai court, motif concret, accord pour la visite = score élevé).
- leadStatus : HOT si score ≥ 75, WARM entre 50 et 74, COLD en dessous.
- recommendedAction : BOOK_MEETING si le prospect est prêt pour la visite, SEND_NURTURE si projet lointain ou hésitant, sinon CONTINUE_QUESTIONS.
- extractedData : ce que le prospect a réellement dit, null sinon.`;
}
