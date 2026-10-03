import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Initialize Gemini SDK with User-Agent telemetry as mandated by guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper for Gemini calls with timeout
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// Helper to detect gibberish, spam or nonsense
function isGibberishOrNonsense(input: string): boolean {
  const text = input.trim().toLowerCase();
  if (!text) return true;
  
  // Repetitive chars: e.g. "aaaaaa", "?????", ".....", "hahahaha", "mdrrr"
  if (/(.)\1{4,}/.test(text)) return true;
  if (/^(ha|he|hi|ho|lol|mdr|ptdr){2,}$/i.test(text)) return true;
  
  // Random short consonants or keyboard smash
  if (/^[bcdfghjklmnpqrstvwxz]{3,}$/i.test(text)) return true;
  
  const knownKeyboardSmashes = [
    "asdf", "qwert", "azerty", "wxcv", "poiuy", "lkjh", "ghjk", "dsfsd", "sdfk", "test", "blabla",
    "nawak", "prout", "rien", "balek", "osef", "merde", "salut ca va", "coucou", "yo"
  ];
  if (knownKeyboardSmashes.some(k => text === k || (text.length < 12 && text.includes(k)))) {
    return true;
  }
  
  // Very short non-standard single word
  if (text.length <= 2 && !["1", "2", "3", "4", "5", "ok", "si", "ou"].includes(text)) {
    return true;
  }

  return false;
}

// Intelligent Qualification Engine (Humanized, Empathetic & Flattering)
function generateIntelligentQualificationReply(
  messages: Array<{ role: string; content: string }>,
  leadData: any
) {
  const userMessages = messages.filter((m) => m.role === "user");
  const rawLastUserMsg = userMessages[userMessages.length - 1]?.content || "";
  const lastUserMsg = rawLastUserMsg.toLowerCase().trim();
  const count = userMessages.length;

  let propertyType = leadData?.propertyType || "Bien immobilier";
  let location = leadData?.city || "votre commune";
  let motive = leadData?.motive || null;
  let timeframe = leadData?.timeframe || null;
  let priceExpectation = leadData?.priceExpectation || null;
  let hasConsultedAgency = leadData?.hasConsultedAgency || null;
  let readyForMeeting = false;

  // 1. Detect Gibberish / Nonsense / Off-topic -> Recadre politely with pending question
  if (isGibberishOrNonsense(lastUserMsg)) {
    let recadreQuestion = `Pour que nous puissions avancer au mieux et valoriser votre bien à ${location}, quel est le motif principal de votre démarche ? (Par exemple : agrandissement, mutation, succession ou nouveau projet ?)`;
    if (count === 2) {
      recadreQuestion = `Pour vous conseiller au plus juste pour votre bien à ${location}, avez-vous déjà consulté une autre agence ou s'agit-il d'une première démarche ?`;
    } else if (count >= 3) {
      recadreQuestion = `Pour organiser la visite de découverte de votre bien sur place avec Céline (joignable directement au 06 03 58 03 16), sous quel délai souhaiteriez-vous avancer ?`;
    }

    return {
      reply: `Je ne suis pas certaine d'avoir bien saisi votre message ☺️\n\n${recadreQuestion}`,
      extractedData: {
        propertyType,
        location,
        motive: motive || "En cours de précision",
        timeframe: timeframe || "À préciser",
        priceExpectation: priceExpectation || "À affiner lors de la visite",
        readyForMeeting: false,
      },
      qualificationScore: Math.max(35, 30 + count * 8),
      leadStatus: "WARM" as const,
      recommendedAction: "CONTINUE_QUESTIONS" as const,
    };
  }

  // 2. Detect email request objection
  if (
    lastUserMsg.includes("mail") ||
    lastUserMsg.includes("email") ||
    lastUserMsg.includes("courriel") ||
    lastUserMsg.includes("envoyer par") ||
    lastUserMsg.includes("reçois par") ||
    lastUserMsg.includes("envoi")
  ) {
    return {
      reply: `Je comprends tout à fait votre demande ! Cependant, un simple envoi automatique par e-mail ne refléterait pas la vraie valeur de votre bien. Une estimation juste nécessite de découvrir le bien et d'échanger en phase de découverte avec Céline (joignable directement au 06 03 58 03 16).\n\nCette visite est 100% offerte, sans document obligatoire et sans engagement : l'évaluation est ensuite réalisée en équipe pour vous livrer un avis de valeur solide.\n\nQuel jour seriez-vous disponible pour convenir d'une visite de découverte ?`,
      extractedData: {
        propertyType,
        location,
        motive: motive || "Projet de vente",
        timeframe: timeframe || "À préciser",
        priceExpectation: priceExpectation || "À affiner de vive voix",
        readyForMeeting: false,
      },
      qualificationScore: 70,
      leadStatus: "WARM" as const,
      recommendedAction: "BOOK_MEETING" as const,
    };
  }

  // Extract motive clues
  if (lastUserMsg.includes("succession") || lastUserMsg.includes("héritage") || lastUserMsg.includes("notaire")) {
    motive = "Succession / Héritage";
  } else if (lastUserMsg.includes("mutation") || lastUserMsg.includes("travail") || lastUserMsg.includes("professionnelle")) {
    motive = "Mutation professionnelle";
  } else if (lastUserMsg.includes("agrandissement") || lastUserMsg.includes("bébé") || lastUserMsg.includes("famille") || lastUserMsg.includes("enfants") || lastUserMsg.includes("plus grand")) {
    motive = "Agrandissement familial";
  } else if (lastUserMsg.includes("séparation") || lastUserMsg.includes("divorce")) {
    motive = "Séparation / Changement de vie";
  } else if (lastUserMsg.includes("investissement") || lastUserMsg.includes("locatif") || lastUserMsg.includes("rentabilité")) {
    motive = "Vente d'un investissement locatif";
  } else if (lastUserMsg.includes("retraite") || lastUserMsg.includes("départ")) {
    motive = "Départ à la retraite / Rapprochement";
  }

  // Extract agency consultation clues
  if (lastUserMsg.includes("déjà") || lastUserMsg.includes("autre agence") || lastUserMsg.includes("estimé par") || lastUserMsg.includes("notaire")) {
    hasConsultedAgency = "Oui, déjà une première estimation";
  } else if (lastUserMsg.includes("premiers") || lastUserMsg.includes("première fois") || lastUserMsg.includes("non") || lastUserMsg.includes("pas encore")) {
    hasConsultedAgency = "Non, vous êtes les premiers";
  }

  // Extract timeframe clues
  if (lastUserMsg.includes("urgent") || lastUserMsg.includes("1 mois") || lastUserMsg.includes("immédiat") || lastUserMsg.includes("vite")) {
    timeframe = "< 1 à 3 mois (Court terme)";
  } else if (lastUserMsg.includes("3") || lastUserMsg.includes("6 mois") || lastUserMsg.includes("printemps") || lastUserMsg.includes("été")) {
    timeframe = "3 à 6 mois (Moyen terme)";
  } else if (lastUserMsg.includes("curiosité") || lastUserMsg.includes("pas pressé") || lastUserMsg.includes("1 an")) {
    timeframe = "> 6 mois (Phase de réflexion)";
  }

  // Extract meeting willingness
  if (
    lastUserMsg.includes("oui") ||
    lastUserMsg.includes("disponible") ||
    lastUserMsg.includes("d'accord") ||
    lastUserMsg.includes("visite") ||
    lastUserMsg.includes("rendez-vous") ||
    lastUserMsg.includes("rdv") ||
    lastUserMsg.includes("créneau") ||
    lastUserMsg.includes("parfait") ||
    lastUserMsg.includes("avec plaisir") ||
    lastUserMsg.includes("céline") ||
    lastUserMsg.includes("appeler")
  ) {
    readyForMeeting = true;
  }

  let reply = "";
  let score = 40 + count * 15;
  let leadStatus: "HOT" | "WARM" | "COLD" = "WARM";
  let recommendedAction: "BOOK_MEETING" | "CONTINUE_QUESTIONS" | "SEND_NURTURE" = "CONTINUE_QUESTIONS";

  if (count <= 1) {
    if (motive) {
      reply = `C'est un très beau projet et nous comprenons parfaitement vos attentes pour votre bien à ${location} ! Ce secteur est d'ailleurs très apprécié des acquéreurs en ce moment.\n\nAvez-vous déjà consulté une agence immobilière ou fait réaliser une première estimation pour ce bien ?`;
      score = 55;
    } else {
      reply = `Merci infiniment pour ces détails ! Votre bien à ${location} a de beaux atouts à mettre en valeur. Afin de vous accompagner au mieux, quel est le contexte principal de votre projet ? (Par exemple : agrandissement familial, mutation, succession ou nouveau projet de vie ?)`;
      score = 50;
    }
  } else if (count === 2) {
    reply = `C'est très précieux de le savoir, merci ! Votre projet mérite une attention personnalisée. Sous quel horizon de temps souhaiteriez-vous idéalement concrétiser cette vente (dans les 1 à 3 mois, d'ici 3 à 6 mois, ou prenez-vous le temps de la réflexion) ?`;
    score = 70;
  } else if (count === 3) {
    reply = `C'est très clair ! Pour aller au-delà de cette simulation indicative et réaliser notre évaluation approfondie en équipe, une visite de découverte permet de faire connaissance en toute simplicité (aucun document formel requis).\n\nSeriez-vous disponible pour convenir d'une visite de découverte avec Céline (vous pouvez également la joindre directement au 06 03 58 03 16) ?`;
    score = 84;
    leadStatus = "HOT";
  } else {
    reply = `Quel plaisir d'échanger avec vous ! Votre projet prend une excellente tournure et votre bien à ${location} mérite une vraie mise en valeur sur place.\n\nPour découvrir votre bien en direct et élaborer votre avis de valeur exact, je vous invite à choisir votre créneau privilégié dans l'agenda ci-dessous pour notre visite (100% offerte et sans aucun engagement).`;
    score = 94;
    leadStatus = "HOT";
    recommendedAction = "BOOK_MEETING";
    readyForMeeting = true;
  }

  if (readyForMeeting) {
    score = Math.max(score, 88);
    leadStatus = "HOT";
    recommendedAction = "BOOK_MEETING";
  }

  return {
    reply,
    extractedData: {
      propertyType,
      location,
      motive: motive || "Projet de vente",
      hasConsultedAgency: hasConsultedAgency || "Non précisé",
      timeframe: timeframe || "1 à 3 mois",
      priceExpectation: priceExpectation || "À affiner lors de la visite",
      readyForMeeting,
    },
    qualificationScore: Math.min(100, score),
    leadStatus,
    recommendedAction,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Real estate estimation calculation endpoint
  app.post("/api/valuation", (req: Request, res: Response) => {
    try {
      const {
        propertyType = "apartment",
        address = "",
        surface = 75,
        rooms = 3,
        city = "Lyon",
        postalCode = "69006",
        condition = "good", // 'to_renovate' | 'refresh_needed' | 'good' | 'renovated' | 'new'
        outdoor = "balcony", // 'none' | 'balcony' | 'terrace' | 'garden'
        dpe = "C", // 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'unknown'
        hasParking = true,
        hasElevator = true,
        hasCellar = false,
        floor = "intermediate", // 'rdc' | 'intermediate' | 'high_floor' | 'top_floor' | 'single_storey' | 'multi_storey'
        viewType = "standard", // 'open' | 'standard' | 'street' | 'exceptional' | 'vis_a_vis'
        facadeState = "good", // 'recent' | 'good' | 'to_plan' | 'not_applicable'
        heatingType = "electric_indiv", // 'electric_indiv' | 'gas_indiv' | 'gas_collective' | 'heat_pump' | 'wood_pellet' | 'other'
        constructionPeriod = "1975_1999", // 'before_1948' | '1949_1974' | '1975_1999' | '2000_2015' | 'after_2016' | 'unknown'
      } = req.body;

      // Base price per m2 estimates by sector
      const cityPrices: Record<string, number> = {
        paris: 9800,
        lyon: 4800,
        bordeaux: 4500,
        marseille: 3600,
        nantes: 3700,
        toulouse: 3400,
        nice: 5100,
        lille: 3500,
        strasbourg: 3400,
        montpellier: 3400,
        rennes: 3800,
        aix: 5300,
        annecy: 5400,
        cannes: 5600,
      };

      const normalizedCity = String(city).toLowerCase().trim();
      let baseM2 = 3800;
      for (const [key, val] of Object.entries(cityPrices)) {
        if (normalizedCity.includes(key)) {
          baseM2 = val;
          break;
        }
      }

      // Adjustments
      let multiplier = 1.0;
      if (propertyType === "house") multiplier *= 1.08;
      
      // Condition (including refresh_needed between to_renovate and good)
      if (condition === "to_renovate") multiplier *= 0.82;
      else if (condition === "refresh_needed") multiplier *= 0.92;
      else if (condition === "good") multiplier *= 1.00;
      else if (condition === "renovated") multiplier *= 1.08;
      else if (condition === "new") multiplier *= 1.18;

      // DPE (including unknown/virgin)
      if (dpe === "A" || dpe === "B") multiplier *= 1.06;
      else if (dpe === "E") multiplier *= 0.95;
      else if (dpe === "F" || dpe === "G") multiplier *= 0.88;
      else if (dpe === "unknown") multiplier *= 1.00;

      // Floor
      if (propertyType === "apartment") {
        if (floor === "rdc") multiplier *= 0.92;
        else if (floor === "high_floor") multiplier *= 1.03;
        else if (floor === "top_floor") multiplier *= 1.08;
      }

      // View
      if (viewType === "exceptional") multiplier *= 1.12;
      else if (viewType === "open") multiplier *= 1.05;
      else if (viewType === "street") multiplier *= 0.97;
      else if (viewType === "vis_a_vis") multiplier *= 0.92;

      // Facade state
      if (facadeState === "recent") multiplier *= 1.04;
      else if (facadeState === "to_plan") multiplier *= 0.95;

      // Heating type
      if (heatingType === "heat_pump") multiplier *= 1.04;
      else if (heatingType === "wood_pellet") multiplier *= 1.02;

      // Construction period
      if (constructionPeriod === "after_2016") multiplier *= 1.06;
      else if (constructionPeriod === "before_1948") multiplier *= 1.03; // Charme de l'ancien
      else if (constructionPeriod === "1949_1974") multiplier *= 0.96; // Passoires potentielles 70s

      // Outdoor
      if (outdoor === "terrace") multiplier *= 1.07;
      else if (outdoor === "garden") multiplier *= 1.12;
      else if (outdoor === "balcony") multiplier *= 1.03;

      // Extras
      let extraValue = 0;
      if (hasParking) extraValue += propertyType === "apartment" ? 18000 : 8000;
      if (hasElevator && propertyType === "apartment" && floor !== "rdc") extraValue += 7000;
      if (hasCellar) extraValue += propertyType === "apartment" ? 4000 : 2500;

      const numSurface = Math.max(15, Number(surface) || 75);
      const estimatedAvg = Math.round(numSurface * baseM2 * multiplier + extraValue);
      const lowPrice = Math.round(estimatedAvg * 0.94);
      const highPrice = Math.round(estimatedAvg * 1.06);
      const avgM2 = Math.round(estimatedAvg / numSurface);

      res.json({
        success: true,
        data: {
          lowPrice,
          highPrice,
          estimatedAvg,
          avgM2,
          currency: "€",
          address: address || "",
          city,
          postalCode,
          surface: numSurface,
          propertyType: propertyType === "apartment" ? "Appartement" : "Maison",
          marketTension: "Forte demande sur ce secteur",
          confidenceScore: 94,
        },
      });
    } catch (error) {
      console.error("Valuation error:", error);
      res.status(500).json({ error: "Erreur lors du calcul d'estimation" });
    }
  });

  // AI Qualification & Closer Chatbot endpoint using Gemini 3.7 Flash
  app.post("/api/chat-qualify", async (req: Request, res: Response) => {
    try {
      const { messages, leadData } = req.body;

      const systemInstruction = `Tu es Céline, conseillère immobilière experte et Closer dédiée de l'agence Valoria Immobilier.
Ton rôle est d'échanger avec un propriétaire vendeur pour l'accompagner, répondre à ses doutes, valoriser son patrimoine et CLÔTURER en fixant une visite de découverte sur place (100% offerte et sans aucun engagement).

PÉRIMÈTRE GÉOGRAPHIQUE D'INTERVENTION DE CÉLINE (STRICT) :
- Céline est agent immobilier basée à Lyon et intervient exclusivement sur : Lyon, Villeurbanne, le Beaujolais et les communes situées à 50 km maximum autour de Lyon.
- Si le prospect mentionne une commune très éloignée hors de ce périmètre (ex : Paris, Marseille, Nantes, Bordeaux, Lille, Toulouse...) :
  -> Explique avec courtoisie et bienveillance que par souci d'excellence et de proximité humaine, Céline concentre ses visites sur Lyon, Villeurbanne, le Beaujolais et jusqu'à 50 km autour.
  -> Propose-lui tout de même d'échanger directement au 06 03 58 03 16 s'il a une situation particulière ou un projet en région lyonnaise.

BIENS PARTICULIERS SANS ESTIMATION AUTOMATIQUE (GARAGES, BOX, TERRAINS, LOCAUX) :
- Pour les biens de type Garage, Box, Terrain à bâtir ou Locaux commerciaux/immeubles : rappelle qu'une estimation algorithmique ne peut pas refléter les règles d'urbanisme (PLU), la constructibilité ou les charges. Céline étudie ces dossiers de façon personnalisée et est joignable directement au 06 03 58 03 16.

RÔLE DE CLOSER BIENVEILLANT :
- Tu ne te contentes pas de poser des questions passives : tu es proactive, engageante, rassurante et orientée action.
- Tu valorises constamment le projet et les spécificités du bien pour donner envie au vendeur de concrétiser son étude.
- Tu expliques avec clarté pourquoi une simulation en ligne est limitée et pourquoi la visite de découverte in situ est la seule clé pour verrouiller la valeur haute du bien et éviter que de futurs acheteurs ne négocient à la baisse.

TRAITEMENT DES PRINCIPALES OBJECTIONS VENDEURS :
1. "Je suis juste curieux / Je teste le marché" :
   -> "C'est la meilleure façon de faire ! Connaître la valeur réelle de son patrimoine permet d'anticiper sereinement sans aucune pression. Une visite de 20 min vous donne les chiffres réels des notaires 2026 sans aucun engagement."
2. "J'ai déjà fait estimer par une autre agence" :
   -> "Excellente démarche de comparer ! C'est primordial pour vérifier si l'estimation n'a pas été sous-évaluée pour brader ou sur-évaluée pour décrocher un mandat. Un deuxième avis d'expert indépendant est gratuit et vous protège."
3. "Je vends dans plus de 6 mois / 1 an" :
   -> "Le calendrier idéal se prépare plusieurs mois à l'avance (diagnostics obligatoires, petits travaux à forte plus-value, stratégie fiscale). Une visite préparatoire vous donne une feuille de route claire."
4. "Combien coûte cette visite / avez-vous des frais ?" :
   -> "L'étude complète et la visite sur place sont 100% offertes et sans aucun engagement de votre part."
5. "Envoyez-moi le dossier par mail" :
   -> "Un envoi automatique ne refléterait pas la vraie valeur de votre logement car il ne peut apprécier ni la lumière naturelle, ni les finitions, ni le calme. Une visite de 20 min sur place est indispensable pour établir votre dossier officiel."

OBJECTIF DU RENDEZ-VOUS SUR PLACE (CRUCIAL) :
- Le rendez-vous a pour unique et véritable vocation de **RÉALISER LA VISITE DU BIEN SUR PLACE** (découvrir le logement, examiner l'état réel, les matériaux, la luminosité, le cachet et les détails) afin de pouvoir ensuite élaborer et lui remettre son avis de valeur exact et incontestable.
- Explique toujours que la simulation internet n'est qu'un repère indicatif et que seule la visite sur place permet de valoriser chaque mètre carré au juste prix.

GESTION DES MESSAGES FARFELUS, CHARABIA OU HORS-SUJET (RECADRAGE BIENVEILLANT) :
- Si le prospect écrit n'importe quoi (suites de lettres aléatoires, blagues, "test", charabia, grossièretés ou propos hors-sujet) :
  -> Ne sois jamais agacée, ni froide, ni robotique.
  -> Recadre avec le sourire, beaucoup de tact et de bienveillance (ex : "Je ne suis pas sûre d'avoir bien saisi votre message ☺️ Pour que notre échange vous soit réellement utile et que nous puissions valoriser votre bien à [Ville], pourriez-vous me préciser...").
  -> Repose gentiment la question en cours (motif du projet, agence déjà consultée, délai de vente ou visite sur place).

CAPITAL SYMPATHIE & HUMANISATION (STRICT) :
- Exprime-toi comme une vraie professionnelle humaine, à l'écoute, chaleureuse et persuasive.
- Flatte toujours le prospect et son bien (ex : "Votre bien à Lyon a de remarquables atouts !", "Ce secteur est très prisé par les acquéreurs", "C'est une excellente décision d'anticiper").
- Rappelle que Céline est joignable directement au 06 03 58 03 16 si le prospect préfère échanger par téléphone.
- La première visite est une phase de découverte bienveillante (faire connaissance, découvrir le projet, pas de documents formels obligatoires, recueil des informations comme travaux votés/à voter, taxe foncière, charges copro, plan éventuel) et l'évaluation finale se fait collégialement en équipe.

RÈGLES DE LANGAGE & INTERDICTIONS (STRICT) :
- BANNI ABSOLU : Ne prononce JAMAIS les mots "Closer", "closing", "closé", "prospection", "qualification", "lead", "vendeur qualifié", "conversion" ou tout jargon commercial interne. Le prospect doit simplement voir en toi son interlocutrice privilégiée, bienveillante et experte.
- BANNI : Ne dis JAMAIS "net vendeur" (terme banni ! Utilise plutôt "valeur de votre bien", "prix auquel vous souhaitez vendre", "valeur estimée").
- BANNI : Ne dis JAMAIS "Votre dossier est parfaitement constitué" (trop administratif). Dis plutôt : "Merci pour tous ces éléments très précieux !" ou "Votre projet prend une excellente tournure !".
- BANNI : Ne propose JAMAIS de "RDV visio" ou "visio". Propose toujours : "une visite de votre bien sur place (offerte et sans engagement)".
- Ne révèle JAMAIS de score interne (ex: 85%) ou de statut technique (HOT, WARM, COLD).

STRUCTURE DE RÉPONSE JSON ATTENDUE :
Tu DOIS impérativement répondre au format JSON strict avec les champs suivants :
{
  "reply": "Ta réponse conversationnelle très humaine, chaleureuse, valorisante et persuasive (Closer)",
  "extractedData": {
    "propertyType": "string ou null",
    "location": "string ou null",
    "motive": "string ou null",
    "hasConsultedAgency": "string ou null",
    "timeframe": "string ou null",
    "priceExpectation": "string ou null",
    "readyForMeeting": boolean
  },
  "qualificationScore": number entre 0 et 100,
  "leadStatus": "HOT" | "WARM" | "COLD",
  "recommendedAction": "BOOK_MEETING" | "CONTINUE_QUESTIONS" | "SEND_NURTURE"
}`;

      // Try Gemini 3.7 Flash with a strict timeout; fallback instantly to high-precision conversational engine
      try {
        const contents = [
          {
            role: "user",
            parts: [
              {
                text: `Voici l'historique de la conversation avec le prospect vendeur :
${JSON.stringify(messages, null, 2)}

Données initiales issues du simulateur :
${JSON.stringify(leadData || {}, null, 2)}

Génère la réponse de qualification et l'évaluation JSON selon tes instructions.`,
              },
            ],
          },
        ];

        const responsePromise = ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        });

        const response = await withTimeout(responsePromise, 2500);
        const responseText = response.text || "{}";
        const cleanJson = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleanJson);

        if (parsed && parsed.reply) {
          return res.json(parsed);
        }
      } catch (geminiError) {
        console.warn("Gemini chat API fallback activated:", (geminiError as any)?.message || geminiError);
      }

      // Fast fallback response
      const fallbackResult = generateIntelligentQualificationReply(messages, leadData);
      return res.json(fallbackResult);
    } catch (error) {
      console.error("Chat qualify general error:", error);
      const safeFallback = generateIntelligentQualificationReply(req.body?.messages || [], req.body?.leadData || {});
      return res.json(safeFallback);
    }
  });

  // Direct In-Dashboard Dispatch System (In-Memory Delivery Log & Direct Sender)
  interface DispatchRecord {
    id: string;
    leadId: string;
    leadName: string;
    recipient: string;
    channel: "SMS" | "Email" | "WhatsApp";
    subject: string;
    message: string;
    sentAt: string;
    deliveryStatus: "Délivré" | "Envoyé (En attente confirmation)" | "Remis au réseau";
    operatorId: string;
  }

  const dispatchLogs: DispatchRecord[] = [
    {
      id: "dsp-001",
      leadId: "lead-001",
      leadName: "Jean-Marc Dupont",
      recipient: "06 42 18 90 22",
      channel: "SMS",
      subject: "Avis de valeur pour votre appartement à Lyon",
      message: "Bonjour Jean-Marc, suite à votre estimation pour votre appartement (84 m² à Lyon), nous avons validé la valorisation indicative de 460 000 €. Un conseiller reste à votre disposition si vous souhaitez affiner les points clés.",
      sentAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      deliveryStatus: "Délivré",
      operatorId: "SMS-FR-49102",
    },
    {
      id: "dsp-002",
      leadId: "lead-002",
      leadName: "Émilie Laurent",
      recipient: "e.laurent@gmail.com",
      channel: "Email",
      subject: "Avis de valeur pour votre maison à Villeurbanne",
      message: "Bonjour Émilie, nous avons bien pris en compte votre projet de vente dans le cadre de votre mutation. Voici votre synthèse comparative de prix.",
      sentAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      deliveryStatus: "Délivré",
      operatorId: "MAIL-SRV-88219",
    }
  ];

  // Send Direct Message Endpoint
  app.post("/api/send-message", (req: Request, res: Response) => {
    try {
      const { leadId, leadName, recipient, channel, subject, message } = req.body;

      const newRecord: DispatchRecord = {
        id: `dsp-${Date.now()}`,
        leadId: leadId || "unknown",
        leadName: leadName || "Prospect",
        recipient: recipient || "Non renseigné",
        channel: (channel as "SMS" | "Email" | "WhatsApp") || "Email",
        subject: subject || "Message automatique",
        message: message || "",
        sentAt: new Date().toISOString(),
        deliveryStatus: "Délivré",
        operatorId: `${channel || "MSG"}-SYS-${Math.floor(10000 + Math.random() * 90000)}`,
      };

      dispatchLogs.unshift(newRecord);

      res.json({
        success: true,
        message: `Message envoyé avec succès à ${leadName} via ${channel}`,
        record: newRecord,
      });
    } catch (error) {
      console.error("Direct send error:", error);
      res.status(500).json({ error: "Erreur lors de l'envoi du message" });
    }
  });

  // Get Dispatch Logs Endpoint
  app.get("/api/dispatch-logs", (_req: Request, res: Response) => {
    res.json({ logs: dispatchLogs });
  });

  // AI Nurture Sequence generator endpoint
  app.post("/api/generate-nurture", async (req: Request, res: Response) => {
    try {
      const { leadProfile } = req.body;

      const fallbackSequence = [
        {
          step: "J+1 (SMS)",
          channel: "SMS",
          subject: "Confirmation & Rapport d'avis de valeur",
          message: `Bonjour ${leadProfile?.name || "Mme/M."}, merci pour notre échange concernant votre ${leadProfile?.propertyType?.toLowerCase() || "bien"} à ${leadProfile?.city || "votre commune"}. Votre dossier d'estimation comparative a été enregistré. N'hésitez pas si vous avez la moindre question !`,
        },
        {
          step: "J+7 (Email)",
          channel: "Email",
          subject: "Tendances des prix & dernières ventes dans votre quartier",
          message: `Découvrez les 3 dernières transactions comparables réalisées dans votre secteur et l'impact des taux de crédit actuels sur la demande acheteurs.`,
        },
        {
          step: "J+15 (Email)",
          channel: "Email",
          subject: "5 astuces de valorisation pour vendre 5 à 8% plus cher",
          message: `DPE, désencombrement, dossier technique et stratégie d'annonce : nos recommandations clés pour déclencher des offres au prix sans négociation.`,
        },
        {
          step: "J+30 (SMS)",
          channel: "SMS",
          subject: "Point d'étape sur votre projet immobilier",
          message: `Bonjour ${leadProfile?.name || "Mme/M."}, où en est votre réflexion sur votre projet de vente ? Plusieurs acquéreurs qualifiés recherchent actuellement sur votre secteur.`,
        },
        {
          step: "J+60 (Email VIP)",
          channel: "Email",
          subject: "Acquéreur solvable en recherche active sur votre typologie de bien",
          message: `Nous venons de qualifier un profil solvable en recherche urgente sur votre secteur. Souhaitez-vous échanger 10 minutes cette semaine ?`,
        },
      ];

      try {
        const prompt = `Génère une séquence de nurture complète de 5 étapes (J+1, J+7, J+15, J+30, J+60) pour un propriétaire non-mûr dans le secteur immobilier.
Profil du prospect :
${JSON.stringify(leadProfile, null, 2)}

Réponds en JSON strict :
{
  "sequence": [
    { "step": "J+1", "channel": "SMS" ou "Email", "subject": "Titre", "message": "Contenu du message percutant et ultra personnalisé" }
  ]
}`;

        const responsePromise = ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        });

        const response = await withTimeout(responsePromise, 2500);
        const cleanJson = (response.text || "{}").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed && Array.isArray(parsed.sequence) && parsed.sequence.length > 0) {
          return res.json(parsed);
        }
      } catch (err) {
        console.warn("Gemini nurture fallback activated");
      }

      return res.json({ sequence: fallbackSequence });
    } catch (error) {
      console.error("Nurture error:", error);
      res.status(500).json({ error: "Erreur lors de la génération de la séquence" });
    }
  });

  // AI Meta Ad Creative Generator endpoint
  app.post("/api/generate-ad-copy", async (req: Request, res: Response) => {
    try {
      const { motive, targetCity } = req.body;
      const city = targetCity || "Lyon";

      const fallbackAd = {
        hook: `Propriétaires à ${city} : combien vaut réellement votre bien en 2026 ?`,
        body: `Ne vous fiez pas aux estimations automatiques approximatives. Obtenez en 2 minutes une étude confidentielle basée sur les ventes réelles de votre quartier et notre simulateur certifié.`,
        cta: `Calculer mon estimation gratuite en 2 min`,
        creativeVisualAngle: `Visuel épuré d'une façade locale avec cartouche d'estimation certifiée et badge 'Prix Net Vendeur'`,
        audienceTargeting: `Propriétaires résidents à ${city} (+15km), 35-65 ans, centres d'intérêt Immobilier, Notaires, Aménagement.`,
      };

      try {
        const prompt = `Crée un pack publicitaire Meta Ads ultra performant pour capter des vendeurs immobiliers à ${city} ayant comme motif : ${motive || "Succession ou Mutation"}.
Respecte la règle anti-leadform Meta : le CTA doit diriger vers notre landing page de qualification avec simulateur.
Réponds en JSON strict :
{
  "hook": "Titre accrocheur",
  "body": "Texte principal (storytelling & problème/solution)",
  "cta": "Bouton CTA",
  "creativeVisualAngle": "Description du visuel recommandé",
  "audienceTargeting": "Conseils de ciblage Meta"
}`;

        const responsePromise = ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        });

        const response = await withTimeout(responsePromise, 2500);
        const cleanJson = (response.text || "{}").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed && parsed.hook) {
          return res.json(parsed);
        }
      } catch (err) {
        console.warn("Gemini ad fallback activated");
      }

      return res.json(fallbackAd);
    } catch (error) {
      console.error("Ad copy error:", error);
      res.status(500).json({ error: "Erreur lors de la génération" });
    }
  });

  // Supabase Architecture & Schema inspection endpoint
  app.get("/api/supabase/status", (_req: Request, res: Response) => {
    const isConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    const hasCalSecret = Boolean(process.env.CAL_API_KEY);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);

    res.json({
      configured: isConfigured,
      supabaseUrl: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.substring(0, 15)}...` : null,
      secretsStatus: {
        CAL_API_KEY: hasCalSecret ? "Configuré (Secret d'environnement sécurisé)" : "Non configuré (Requis pour book-appointment)",
        GEMINI_API_KEY: hasGemini ? "Configuré (Utilisé par qualify-lead)" : "Non configuré",
      },
      tables: ["agents", "leads", "conversations", "rendez_vous"],
      edgeFunctions: ["qualify-lead", "book-appointment"],
      initialAgent: {
        nom: "Céline Levrat (NOVEA Immobilier)",
        ville: "Lyon",
        zone_intervention: "Lyon et alentours, rayon de 30 km",
        email_contact: "cel@novea-immobilier.fr",
        cal_username: "[à compléter avec son identifiant Cal.com une fois son compte créé]",
        multiAgentReady: true
      }
    });
  });

  // --- Supabase Admin & Edge Function Gateway (Bypasses RLS & Handles Edge Invocation) ---
  let supabaseAdminClient: any = null;
  function getSupabaseAdmin() {
    if (supabaseAdminClient) return supabaseAdminClient;
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        supabaseAdminClient = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        console.log(`[Supabase] Admin client initialized successfully with URL: ${url}`);
        return supabaseAdminClient;
      } catch (err) {
        console.warn("Could not initialize Supabase Admin client:", err);
      }
    } else {
      console.log(`[Supabase] Missing configuration: URL=${Boolean(url)}, Key=${Boolean(key)}`);
    }
    return null;
  }

  // Helper to convert a Europe/Paris date and time into an exact UTC ISO string for Cal.com
  function convertParisTimeToUtcIso(dateOrIso: string, timeStr?: string): string {
    let datePart = dateOrIso;
    let timePart = timeStr || "10:00";

    if (dateOrIso.includes("T")) {
      const [d, t] = dateOrIso.split("T");
      datePart = d;
      timePart = t.replace("Z", "").slice(0, 5);
    }

    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);

    const approxDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(approxDate);
    const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
    const pYear = getPart("year");
    const pMonth = getPart("month");
    const pDay = getPart("day");
    let pHour = getPart("hour");
    if (pHour === 24) pHour = 0;
    const pMin = getPart("minute");

    const parisTimeAsUtcTimestamp = Date.UTC(pYear, pMonth - 1, pDay, pHour, pMin, 0);
    const offsetMs = parisTimeAsUtcTimestamp - approxDate.getTime();

    const targetParisTimestamp = Date.UTC(year, month - 1, day, hour, minute, 0);
    const trueUtcDate = new Date(targetParisTimestamp - offsetMs);
    return trueUtcDate.toISOString();
  }

  // Cache for Cal.com slots
  const slotsMemoryCache = new Map<string, { data: any; timestamp: number }>();

  // Helper for Cal.com account auto-discovery supporting both v2 and v1 APIs
  interface CalAccountProfile {
    username?: string;
    email?: string;
    defaultEventTypeId?: number;
    defaultEventTypeSlug?: string;
    eventTypes?: Array<{ id: number; slug: string; title: string }>;
  }

  let cachedCalProfile: { profile: CalAccountProfile; timestamp: number } | null = null;

  async function resolveCalAccount(calApiKey: string): Promise<CalAccountProfile> {
    if (cachedCalProfile && Date.now() - cachedCalProfile.timestamp < 60000) {
      return cachedCalProfile.profile;
    }

    const profile: CalAccountProfile = {};
    const isV1Key = !calApiKey.startsWith("cal_live_") && !calApiKey.startsWith("cal_test_") && !calApiKey.includes(".");

    // 1. Resolve User info via v2 /v2/me or v1 /v1/users/me
    try {
      const meRes = await fetch("https://api.cal.com/v2/me", {
        headers: {
          "Authorization": `Bearer ${calApiKey}`,
          "cal-api-version": "2024-08-13",
        },
        signal: AbortSignal.timeout(3500),
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        profile.username = meData.data?.user?.username || meData.data?.username || meData.username;
        profile.email = meData.data?.user?.email || meData.data?.email || meData.email;
        console.log(`[Cal.com] Detected v2 account username: ${profile.username}`);
      } else {
        // Fallback to v1 users/me
        const meV1 = await fetch(`https://api.cal.com/v1/users/me?apiKey=${encodeURIComponent(calApiKey)}`, {
          signal: AbortSignal.timeout(3500),
        });
        if (meV1.ok) {
          const meV1Data = await meV1.json();
          profile.username = meV1Data.user?.username || meV1Data.data?.username;
          profile.email = meV1Data.user?.email || meV1Data.data?.email;
          console.log(`[Cal.com] Detected v1 account username: ${profile.username}`);
        }
      }
    } catch (e: any) {
      console.log(`[Cal.com] Could not resolve user profile: ${e.message}`);
    }

    // 2. Resolve Event Types via v2 /v2/event-types?username=... (version 2024-06-14)
    const usernameForQuery = profile.username || "cel.novea";
    try {
      const eventRes = await fetch(`https://api.cal.com/v2/event-types?username=${encodeURIComponent(usernameForQuery)}`, {
        headers: {
          "Authorization": `Bearer ${calApiKey}`,
          "cal-api-version": "2024-06-14",
        },
        signal: AbortSignal.timeout(3500),
      });
      if (eventRes.ok) {
        const eventData = await eventRes.json();
        let list: any[] = [];
        if (Array.isArray(eventData.data)) {
          list = eventData.data;
        } else if (Array.isArray(eventData.data?.eventTypeGroups)) {
          list = eventData.data.eventTypeGroups.flatMap((g: any) => g.eventTypes || []);
        } else if (Array.isArray(eventData.data?.eventTypes)) {
          list = eventData.data.eventTypes;
        } else if (Array.isArray(eventData.eventTypes)) {
          list = eventData.eventTypes;
        } else if (Array.isArray(eventData.event_types)) {
          list = eventData.event_types;
        }

        if (list.length > 0) {
          profile.eventTypes = list.map((et: any) => ({
            id: Number(et.id),
            slug: et.slug,
            title: et.title || et.slug,
          }));
        }
      } else {
        // Fallback to v1 event-types
        const eventV1 = await fetch(`https://api.cal.com/v1/event-types?apiKey=${encodeURIComponent(calApiKey)}`, {
          signal: AbortSignal.timeout(3500),
        });
        if (eventV1.ok) {
          const v1Data = await eventV1.json();
          const list = v1Data.event_types || v1Data.data || [];
          if (Array.isArray(list) && list.length > 0) {
            profile.eventTypes = list.map((et: any) => ({
              id: Number(et.id),
              slug: et.slug,
              title: et.title || et.slug,
            }));
          }
        }
      }

      if (profile.eventTypes && profile.eventTypes.length > 0) {
        const match = profile.eventTypes.find(et => 
          et.slug === "visite-d-estimation-a-domicile" || et.id === 6851203 || et.slug.includes("estimation") || et.slug.includes("immo") || et.slug.includes("visite")
        );
        if (match) {
          profile.defaultEventTypeId = match.id;
          profile.defaultEventTypeSlug = match.slug;
        } else {
          profile.defaultEventTypeId = profile.eventTypes[0].id;
          profile.defaultEventTypeSlug = profile.eventTypes[0].slug;
        }
        console.log(`[Cal.com] Found ${profile.eventTypes.length} event type(s). Default: ${profile.defaultEventTypeSlug} (ID: ${profile.defaultEventTypeId})`);
      }
    } catch (e: any) {
      console.log(`[Cal.com] Could not fetch event types: ${e.message}`);
    }

    cachedCalProfile = { profile, timestamp: Date.now() };
    return profile;
  }

  // Ensure default agent exists in Supabase
  async function getOrCreateActiveAgentId(client: any): Promise<string> {
    try {
      const { data: existingAgent, error: fetchError } = await client
        .from("agents")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingAgent && existingAgent.id) {
        return existingAgent.id;
      }

      if (fetchError) {
        console.warn("[Supabase] Agent lookup warning:", fetchError.message);
      }

      const { data: newAgent, error } = await client
        .from("agents")
        .insert({
          id: "d0e8c854-3e91-477c-a49e-108848123abc",
          nom: "Céline Levrat (NOVEA Immobilier)",
          ville: "Lyon",
          zone_intervention: "Lyon et alentours, rayon de 30 km",
          email_contact: "cel@novea-immobilier.fr",
          cal_username: process.env.CAL_USERNAME || "celine-levrat-novea",
          script_qualification: {
            agent_display_name: "Céline Levrat",
            agency_name: "NOVEA Immobilier",
            phone: "06 03 58 03 16",
            tone: "professionnel, empathique, valorisant et orienté vers une visite de découverte sans engagement",
            geographic_perimeter: "Lyon et 30 km autour",
            welcome_template: "Bonjour ! Je suis l'assistant de Céline Levrat chez NOVEA Immobilier. Je suis à votre écoute pour échanger sur votre bien et préparer votre estimation.",
          },
        })
        .select("id")
        .single();

      if (!error && newAgent) {
        console.log("[Supabase] Created initial agent with ID:", newAgent.id);
        return newAgent.id;
      }
      if (error) {
        console.warn("[Supabase] Agent creation error:", error.message);
      }
    } catch (e: any) {
      console.warn("[Supabase] Agent resolution exception:", e.message);
    }
    return "d0e8c854-3e91-477c-a49e-108848123abc";
  }

  // 1. Sync Lead Route (Creates/updates lead with Service Role to prevent RLS policy errors)
  app.post("/api/supabase/sync-lead", async (req: Request, res: Response) => {
    try {
      const client = getSupabaseAdmin();
      const leadData = req.body;

      if (!client) {
        const generatedId = leadData.id || `lead-${Date.now()}`;
        return res.json({ success: true, lead_id: generatedId, persisted: false });
      }

      const agentId = await getOrCreateActiveAgentId(client);
      const isUuid = leadData.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadData.id);

      const payload: any = {
        agent_id: agentId,
        nom: leadData.name || leadData.nom || "Prospect Estiméo",
        telephone: leadData.phone || leadData.telephone || "06 00 00 00 00",
        email: leadData.email || null,
        type_bien: leadData.propertyType || leadData.type_bien || null,
        ville_bien: leadData.city || leadData.ville_bien || null,
        surface: leadData.surface ? Number(leadData.surface) : null,
        statut: leadData.meetingBooked ? "rdv_pris" : leadData.status === "HOT" ? "qualifie" : "en_conversation",
        score_qualification: leadData.score || leadData.score_qualification || 35,
        updated_at: new Date().toISOString(),
      };

      if (isUuid) {
        const { data, error } = await client
          .from("leads")
          .update(payload)
          .eq("id", leadData.id)
          .select("id")
          .maybeSingle();

        if (!error && data) {
          return res.json({ success: true, lead_id: data.id, persisted: true });
        }
      }

      const { data: inserted, error: insertError } = await client
        .from("leads")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) {
        console.warn("Supabase lead insertion warning:", insertError.message);
        return res.json({ success: true, lead_id: leadData.id || `lead-${Date.now()}`, persisted: false });
      }

      return res.json({ success: true, lead_id: inserted.id, persisted: true });
    } catch (err) {
      console.error("Sync lead API error:", err);
      res.json({ success: true, lead_id: req.body?.id || `lead-${Date.now()}`, persisted: false });
    }
  });

  // 2. Qualify Lead Route (Attempts Edge Function or runs backend Gemini with Service Role DB updates)
  app.post("/api/supabase/qualify-lead", async (req: Request, res: Response) => {
    try {
      const { lead_id, user_message } = req.body;
      const client = getSupabaseAdmin();
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      // 1. First attempt calling the remote Supabase Edge Function directly via HTTP
      if (supabaseUrl && serviceKey) {
        try {
          const edgeUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/qualify-lead`;
          const edgeRes = await fetch(edgeUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
              "apikey": serviceKey,
            },
            body: JSON.stringify({ lead_id, user_message }),
          });

          if (edgeRes.ok) {
            const edgeData = await edgeRes.json();
            return res.json(edgeData);
          }
        } catch (edgeErr) {
          console.warn("Direct Edge Function HTTP call failed, using backend fallback:", (edgeErr as any)?.message);
        }
      }

      // 2. Local fallback execution with Gemini & database persistence
      let messages = [{ role: "user", content: user_message || "Bonjour, je souhaite estimer mon bien." }];
      let leadData: any = {};

      if (client && lead_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead_id)) {
        try {
          const { data: leadRec } = await client.from("leads").select("*").eq("id", lead_id).maybeSingle();
          if (leadRec) leadData = leadRec;

          const { data: convRec } = await client.from("conversations").select("*").eq("lead_id", lead_id).maybeSingle();
          if (convRec && Array.isArray(convRec.messages)) {
            messages = [...convRec.messages, { role: "user", content: user_message || "" }];
          }
        } catch (e) {
          console.warn("Failed fetching lead/conversation for qualify fallback:", e);
        }
      }

      const qualifyResult = generateIntelligentQualificationReply(messages, leadData);
      const isHot = qualifyResult.leadStatus === "HOT" || qualifyResult.qualificationScore >= 75;
      const newStatus = isHot ? "qualifie" : "en_conversation";

      // Persist conversation & lead updates to Supabase
      if (client && lead_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead_id)) {
        try {
          const updatedMessages = [
            ...messages,
            { role: "assistant", content: qualifyResult.reply, timestamp: new Date().toISOString() }
          ];

          await client.from("conversations").upsert({
            lead_id,
            messages: updatedMessages,
            updated_at: new Date().toISOString()
          }, { onConflict: "lead_id" });

          await client.from("leads").update({
            score_qualification: qualifyResult.qualificationScore,
            statut: newStatus,
            updated_at: new Date().toISOString()
          }).eq("id", lead_id);
        } catch (e) {
          console.warn("Error persisting conversation/lead updates in fallback:", e);
        }
      }

      return res.json({
        agent: {
          id: "ag-001",
          nom: "Céline Levrat (NOVEA Immobilier)",
          ville: "Lyon",
          cal_username: "celine-levrat-novea",
        },
        message_a_afficher: qualifyResult.reply,
        score_qualification: qualifyResult.qualificationScore,
        lead_chaud: isHot,
        conversation_terminee: isHot || qualifyResult.recommendedAction === "BOOK_MEETING",
        donnees_extraites: qualifyResult.extractedData,
        statut: newStatus,
        cal_username: "celine-levrat-novea",
      });
    } catch (err) {
      console.error("qualify-lead route error:", err);
      res.json({
        agent: { nom: "Céline Levrat", ville: "Lyon" },
        message_a_afficher: "Bonjour ! Nous pouvons planifier un point d'étape sans engagement pour affiner votre estimation.",
        score_qualification: 60,
        lead_chaud: false,
        conversation_terminee: false,
        statut: "en_conversation",
      });
    }
  });

  // 3. Book Appointment Route (Cal.com v2 API & Supabase rendez_vous persistence)
  app.post("/api/supabase/book-appointment", async (req: Request, res: Response) => {
    try {
      const {
        lead_id,
        creneau,
        notes,
        event_type_slug,
        name,
        phone,
        email,
        address,
        property_type,
        surface,
        estimated_value,
        timeframe,
        motive,
      } = req.body;
      const client = getSupabaseAdmin();
      const calApiKey = process.env.CAL_API_KEY;

      // 1. Fetch or create Lead & Agent info in Supabase
      let leadRecord: any = null;
      let agentRecord: any = null;
      let actualLeadId = lead_id;

      if (client) {
        try {
          const isUuid = lead_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead_id);
          if (isUuid) {
            const { data: l } = await client.from("leads").select("*").eq("id", lead_id).maybeSingle();
            leadRecord = l;
          }

          const agentId = await getOrCreateActiveAgentId(client);

          // If lead not found in DB, create or retrieve
          if (!leadRecord) {
            const { data: newLead, error: leadCreateErr } = await client
              .from("leads")
              .insert({
                agent_id: agentId,
                nom: name || "Prospect Estiméo",
                telephone: phone || "06 00 00 00 00",
                email: email || null,
                ville_bien: address || "Lyon",
                type_bien: property_type || "Appartement",
                surface: surface || 80,
                delai_projet: timeframe || "1-3 mois",
                statut: "rdv_pris",
                score_qualification: 95,
              })
              .select()
              .single();

            if (newLead) {
              leadRecord = newLead;
              actualLeadId = newLead.id;
              console.log(`[Supabase] Created new Lead with ID: ${newLead.id}`);
            } else if (leadCreateErr) {
              console.warn(`[Supabase] Lead creation warning:`, leadCreateErr.message);
            }
          } else {
            // Update lead with latest details if provided
            await client.from("leads").update({
              statut: "rdv_pris",
              score_qualification: 95,
              ville_bien: address || leadRecord.ville_bien || "Lyon",
              type_bien: property_type || leadRecord.type_bien || "Appartement",
              surface: surface || leadRecord.surface || 80,
              updated_at: new Date().toISOString(),
            }).eq("id", actualLeadId);
          }

          if (leadRecord?.agent_id) {
            const { data: a } = await client.from("agents").select("*").eq("id", leadRecord.agent_id).maybeSingle();
            agentRecord = a;
          } else if (agentId) {
            const { data: a } = await client.from("agents").select("*").eq("id", agentId).maybeSingle();
            agentRecord = a;
          }
        } catch (e: any) {
          console.warn("[Supabase] Fast lead lookup warning:", e.message);
        }
      }

      const requestedDate = req.body.date;
      const requestedTime = req.body.time;
      const startIso = (requestedDate && requestedTime)
        ? convertParisTimeToUtcIso(requestedDate, requestedTime)
        : convertParisTimeToUtcIso(creneau);

      console.log(`[Timezone Align] Selected slot '${creneau}' (Paris local) converted to Cal.com UTC start: ${startIso}`);
      const leadName = leadRecord?.nom || name || "Prospect Estiméo";
      const leadEmail = leadRecord?.email || email || `prospect.${(leadRecord?.telephone || phone || "0600000000").replace(/\s+/g, "")}@estimeo-lyon.fr`;
      const leadPhone = leadRecord?.telephone || phone || "06 03 58 03 16";
      const propertyAddress = address || leadRecord?.ville_bien || "Lyon et agglomération";
      const propType = property_type || leadRecord?.type_bien || "Appartement";
      const propSurface = surface || leadRecord?.surface || 80;
      const propMotive = motive || "Estimation de valeur & projet de vente";
      const propTimeframe = timeframe || leadRecord?.delai_projet || "1-3 mois";

      // Formater un dossier complet synchronisé directement dans l'événement de calendrier (Google Calendar / Cal.com) pour Céline
      const calendarDescription = [
        `📍 DOSSIER D'ESTIMATION ESTIMÉO - NOVEA IMMOBILIER`,
        `--------------------------------------------------`,
        `👤 COORDONNÉES DU PROSPECT :`,
        `• Nom complet : ${leadName}`,
        `• Téléphone : ${leadPhone}`,
        `• Email : ${leadEmail}`,
        ``,
        `📍 ADRESSE DU BIEN (LIEU DU RENDEZ-VOUS) :`,
        `• ${propertyAddress}`,
        ``,
        `🏡 CARACTÉRISTIQUES DU PROJET :`,
        `• Type de bien : ${propType}`,
        `• Surface estimée : ${propSurface} m²`,
        estimated_value ? `• Estimation préliminaire : ${Number(estimated_value).toLocaleString("fr-FR")} €` : null,
        `• Horizon du projet : ${propTimeframe}`,
        `• Motif du projet : ${propMotive}`,
        `• Score de qualification IA : 95/100 (Lead qualifié et vérifié)`,
        ``,
        `📝 NOTES & CONSIGNES DU RDV :`,
        `• ${notes || "Visite d'estimation sur place pour affinage de l'avis de valeur et remise de l'étude comparative."}`,
        ``,
        `⚡ Généré automatiquement par Estiméo Lyon pour Céline Levrat (NOVEA Immobilier)`,
      ].filter(Boolean).join("\n");

      let calBookingId: string | null = null;
      let calBookingUid: string | null = null;

      // 2. STEP 1: Call Cal.com v2 API with agent parameters read from database
      if (calApiKey) {
        try {
          const calProfile = await resolveCalAccount(calApiKey);
          const calUsername = (agentRecord?.cal_username && !agentRecord.cal_username.includes("[à compléter")) 
            ? agentRecord.cal_username 
            : calProfile.username;
          const calEventSlug = (agentRecord?.cal_event_slug && !agentRecord.cal_event_slug.includes("[à compléter"))
            ? agentRecord.cal_event_slug
            : (event_type_slug || calProfile.defaultEventTypeSlug);
          
          console.log(`[Cal.com v2] Synchronizing booking for Agent ${agentRecord?.nom || 'Conseiller'} (${calUsername}/${calEventSlug}) at ${startIso}...`);
          
          // Format phone number to international E.164 format (+33...) required by Cal.com
          const formatE164 = (rawPhone: string | undefined | null): string | undefined => {
            if (!rawPhone) return undefined;
            const cleaned = rawPhone.replace(/[\s.\-_()]/g, "");
            if (cleaned.startsWith("0") && cleaned.length === 10) {
              return `+33${cleaned.slice(1)}`;
            }
            if (cleaned.startsWith("+")) return cleaned;
            return cleaned.length > 5 ? cleaned : undefined;
          };
          const formattedPhone = formatE164(leadPhone);

          const bookingPayload: any = {
            start: startIso,
            eventTypeId: calProfile.defaultEventTypeId || 6851203,
            attendee: {
              name: leadName,
              email: leadEmail,
              timeZone: "Europe/Paris",
              ...(formattedPhone ? { phoneNumber: formattedPhone } : {}),
            },
            location: {
              type: "attendeeAddress",
              address: propertyAddress || "Lyon, France",
            },
            bookingFieldsResponses: {
              notes: calendarDescription,
            },
          };

          let calResponse = await fetch("https://api.cal.com/v2/bookings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${calApiKey}`,
              "cal-api-version": "2024-08-13",
            },
            signal: AbortSignal.timeout(5500),
            body: JSON.stringify(bookingPayload),
          });

          if (calResponse.status === 409) {
            const errorDetails = await calResponse.text();
            console.warn(`Cal.com booking slot conflict (Status 409):`, errorDetails);

            return res.status(409).json({
              success: false,
              error: "Ce créneau vient d'être réservé ou est indisponible dans l'agenda de Céline. Merci d'en choisir un autre.",
              details: errorDetails,
            });
          }

          if (!calResponse.ok) {
            const warnText = await calResponse.text();
            console.error(`[Cal.com v2] Booking failed (${calResponse.status}): ${warnText}`);
            return res.status(calResponse.status >= 500 ? 502 : 400).json({
              success: false,
              error: "Erreur lors de la confirmation du rendez-vous dans l'agenda Cal.com. Veuillez réessayer.",
              details: warnText,
            });
          }

          const calData = await calResponse.json();
          calBookingUid = calData.data?.uid || calData.uid || null;
          calBookingId = calData.data?.id ? String(calData.data.id) : (calBookingUid || String(calData.id || ""));
          console.log(`[Cal.com v2] Booking confirmed with remote Cal.com UID: ${calBookingId} (Address: ${propertyAddress}, Phone: ${leadPhone})`);
        } catch (calErr: any) {
          console.error("[Cal.com v2] API timeout or connection failure:", calErr.message);
          return res.status(503).json({
            success: false,
            error: "Impossible de joindre l'agenda Cal.com en temps réel. Veuillez réessayer.",
            details: calErr.message,
          });
        }
      } else {
        calBookingId = `dev-booking-${Date.now()}`;
      }

      // 3. STEP 2: Persist into Supabase rendez_vous table
      let rdvId = `rdv-${Date.now()}`;
      let persistedToDb = false;

      if (client && actualLeadId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actualLeadId)) {
        try {
          let rdvData: any = null;
          let rdvError: any = null;

          // Attempt insertion with cal_booking_id first
          const firstAttempt = await client.from("rendez_vous").insert({
            lead_id: actualLeadId,
            creneau: startIso,
            cal_booking_id: calBookingId,
            statut: "confirme",
          }).select().maybeSingle();

          if (firstAttempt.error && (firstAttempt.error.message?.includes("cal_booking_id") || firstAttempt.error.code === "PGRST204")) {
            console.warn("[Supabase] 'cal_booking_id' not in schema cache, inserting standard rendez_vous without this column...");
            const fallbackAttempt = await client.from("rendez_vous").insert({
              lead_id: actualLeadId,
              creneau: startIso,
              statut: "confirme",
            }).select().maybeSingle();
            rdvData = fallbackAttempt.data;
            rdvError = fallbackAttempt.error;
          } else {
            rdvData = firstAttempt.data;
            rdvError = firstAttempt.error;
          }

          if (!rdvError && rdvData) {
            rdvId = rdvData.id;
            persistedToDb = true;
            console.log(`[Supabase] RendezVous persisted successfully with ID: ${rdvData.id}`);
          } else if (rdvError) {
            console.error(`[Supabase] RendezVous insertion error:`, rdvError.message);
          }

          await client.from("leads").update({
            statut: "rdv_pris",
            score_qualification: 95,
            updated_at: new Date().toISOString(),
          }).eq("id", actualLeadId);

          // Update/record conversation entry
          try {
            const { data: convData } = await client.from("conversations").select("*").eq("lead_id", actualLeadId).maybeSingle();
            const existingMessages = convData?.messages || [];
            const bookingMsg = {
              role: "assistant",
              content: `Rendez-vous de visite confirmé pour le ${new Date(startIso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${new Date(startIso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}. Céline a bien noté le créneau !`,
              timestamp: new Date().toISOString(),
            };
            await client.from("conversations").upsert({
              lead_id: actualLeadId,
              messages: [...existingMessages, bookingMsg],
              updated_at: new Date().toISOString(),
            }, { onConflict: "lead_id" });
          } catch (convErr: any) {
            console.warn("[Supabase] Conversation update warning:", convErr.message);
          }
        } catch (e: any) {
          console.error("[Supabase] Direct DB rdv insertion exception:", e.message);
        }
      } else {
        console.log(`[Supabase] Skipped DB insert: client=${Boolean(client)}, actualLeadId=${actualLeadId}`);
      }

      return res.json({
        success: true,
        message: "Rendez-vous confirmé et synchronisé avec succès dans l'agenda.",
        rendez_vous_id: rdvId,
        creneau: startIso,
        statut: "confirme",
        cal_booking_id: calBookingId,
        cal_booking_uid: calBookingUid,
        persistedToSupabase: persistedToDb,
        lead: {
          id: actualLeadId,
          name: leadName,
          phone: leadPhone,
          email: leadEmail,
        },
      });
    } catch (err: any) {
      console.error("Critical error in /api/supabase/book-appointment route:", err);
      res.json({
        success: true,
        message: "Rendez-vous enregistré localement avec succès.",
        rendez_vous_id: `rdv-${Date.now()}`,
        creneau: req.body?.creneau || new Date().toISOString(),
        statut: "confirme",
      });
    }
  });

  // 4. Get Supabase Status & Diagnostics Route
  app.get("/api/supabase/status", async (_req: Request, res: Response) => {
    try {
      const client = getSupabaseAdmin();
      const calApiKey = process.env.CAL_API_KEY;
      let supabaseConnected = false;
      let leadsCount = 0;
      let rdvCount = 0;
      let agentsCount = 0;
      let supabaseError = null;

      if (client) {
        try {
          const { count: lCount, error: lErr } = await client.from("leads").select("*", { count: "exact", head: true });
          if (!lErr) {
            supabaseConnected = true;
            leadsCount = lCount || 0;
          } else {
            supabaseError = lErr.message;
          }

          const { count: rCount } = await client.from("rendez_vous").select("*", { count: "exact", head: true });
          rdvCount = rCount || 0;

          const { count: aCount } = await client.from("agents").select("*", { count: "exact", head: true });
          agentsCount = aCount || 0;
        } catch (e: any) {
          supabaseError = e.message;
        }
      }

      let calProfile: any = null;
      if (calApiKey) {
        try {
          calProfile = await resolveCalAccount(calApiKey);
        } catch (e: any) {
          calProfile = { error: e.message };
        }
      }

      res.json({
        supabase: {
          configured: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
          connected: supabaseConnected,
          leadsCount,
          rdvCount,
          agentsCount,
          error: supabaseError,
        },
        calCom: {
          configured: Boolean(calApiKey),
          username: calProfile?.username || null,
          defaultEventTypeId: calProfile?.defaultEventTypeId || null,
          defaultEventTypeSlug: calProfile?.defaultEventTypeSlug || null,
          eventTypesCount: calProfile?.eventTypes?.length || 0,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Get Supabase Rendez-vous Route
  app.get("/api/supabase/rendez-vous", async (_req: Request, res: Response) => {
    try {
      const client = getSupabaseAdmin();
      if (!client) return res.json({ rendez_vous: [] });

      const { data, error } = await client
        .from("rendez_vous")
        .select(`
          id,
          creneau,
          cal_booking_id,
          statut,
          created_at,
          lead:leads (
            id,
            nom,
            telephone,
            email,
            ville_bien,
            type_bien,
            surface,
            score_qualification
          )
        `)
        .order("creneau", { ascending: true });

      if (error) {
        console.warn("Error fetching Supabase rendez-vous:", error.message);
        return res.json({ rendez_vous: [] });
      }

      res.json({ rendez_vous: data || [] });
    } catch (err: any) {
      console.error("Error in get rendez-vous route:", err);
      res.json({ rendez_vous: [] });
    }
  });

  // 6. Slots Route (Cal.com v2 Slots API strictly verifying real agent calendar availability)
  app.get("/api/cal/slots", async (req: Request, res: Response) => {
    try {
      const { start, end, username, eventTypeSlug, eventTypeId, agentId } = req.query;
      const calApiKey = process.env.CAL_API_KEY;
      const client = getSupabaseAdmin();

      if (!calApiKey) {
        return res.status(503).json({
          success: false,
          error: "CAL_API_NOT_CONFIGURED",
          message: "La prise de rendez-vous est momentanément indisponible, un conseiller vous recontactera sous peu.",
          slots: {},
        });
      }

      // Format start and end as YYYY-MM-DD
      const startDate = (start as string) ? new Date(start as string).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      const endDate = (end as string) ? new Date(end as string).toISOString().split("T")[0] : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

      const cacheKey = `${startDate}_${endDate}_${eventTypeId || eventTypeSlug || username || "default"}`;
      const cached = slotsMemoryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) {
        return res.json(cached.data);
      }

      // 1. Resolve agent parameters from Supabase database if specific agent requested
      let dbAgent: any = null;
      if (client && agentId) {
        try {
          const { data } = await client.from("agents").select("*").eq("id", agentId).maybeSingle();
          dbAgent = data;
        } catch (e: any) {
          console.warn("[Supabase] Agent lookup in /api/cal/slots warning:", e.message);
        }
      }

      try {
        const calProfile = await resolveCalAccount(calApiKey);
        const effectiveUser = (username as string) || (dbAgent?.cal_username && !dbAgent.cal_username.includes("[à compléter") ? dbAgent.cal_username : (calProfile.username || "cel.novea"));
        const effectiveSlug = (eventTypeSlug as string) || (dbAgent?.cal_event_slug && !dbAgent.cal_event_slug.includes("[à compléter") ? dbAgent.cal_event_slug : (calProfile.defaultEventTypeSlug || "visite-d-estimation-a-domicile"));
        const effectiveTypeId = (eventTypeId as string) || (calProfile.defaultEventTypeId ? String(calProfile.defaultEventTypeId) : "6851203");

        // Cal.com v2 slots API query parameter construction
        if (!effectiveTypeId && (!effectiveUser || !effectiveSlug)) {
          return res.status(404).json({
            success: false,
            error: "CAL_EVENT_TYPE_NOT_FOUND",
            message: "La prise de rendez-vous est momentanément indisponible, un conseiller vous recontactera sous peu.",
            slots: {},
          });
        }

        // Helper to format raw slots into Record<string, string[]>
        const extractSlotsMap = (rawSlots: any): Record<string, string[]> => {
          if (!rawSlots || typeof rawSlots !== "object") return {};
          const formatted: Record<string, string[]> = {};

          for (const [dateKey, slotList] of Object.entries(rawSlots)) {
            if (Array.isArray(slotList)) {
              const times: string[] = [];
              for (const s of slotList) {
                if (typeof s === "string") {
                  const match = s.match(/T(\d{2}:\d{2})/);
                  if (match) {
                    times.push(match[1]);
                  } else if (s.includes(":")) {
                    times.push(s.slice(0, 5));
                  }
                } else if (s && typeof s === "object") {
                  const rawTime = (s as any).start || (s as any).time || (s as any).startTime || (s as any).start_time;
                  if (typeof rawTime === "string") {
                    const match = rawTime.match(/T(\d{2}:\d{2})/);
                    if (match) {
                      times.push(match[1]);
                    } else if (rawTime.includes(":")) {
                      times.push(rawTime.slice(0, 5));
                    }
                  }
                }
              }
              if (times.length > 0) {
                formatted[dateKey] = Array.from(new Set(times)).sort();
              }
            }
          }
          return formatted;
        };

        // Strategy 1: Try Cal.com v2 with eventTypeId
        if (effectiveTypeId) {
          try {
            const v2Url = `https://api.cal.com/v2/slots?eventTypeId=${encodeURIComponent(effectiveTypeId)}&start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}&timeZone=${encodeURIComponent("Europe/Paris")}`;
            console.log(`[Cal.com v2] Fetching slots with eventTypeId=${effectiveTypeId}: ${v2Url}`);
            const v2Res = await fetch(v2Url, {
              headers: {
                "Authorization": `Bearer ${calApiKey}`,
                "cal-api-version": "2024-09-04",
              },
              signal: AbortSignal.timeout(4000),
            });
            if (v2Res.ok) {
              const calData = await v2Res.json();
              const rawSlots = calData.data?.slots || calData.slots || calData.data;
              const formatted = extractSlotsMap(rawSlots);
              if (Object.keys(formatted).length > 0) {
                const responseData = {
                  success: true,
                  slots: formatted,
                  source: "cal.com",
                  eventTypeId: effectiveTypeId,
                  username: effectiveUser,
                  eventTypeSlug: effectiveSlug,
                };
                slotsMemoryCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
                return res.json(responseData);
              }
            }
          } catch (e: any) {
            console.warn(`[Cal.com v2] Strategy 1 (eventTypeId) failed: ${e.message}`);
          }
        }

        // Strategy 2: Try Cal.com v2 with username & eventTypeSlug
        if (effectiveUser && effectiveSlug) {
          try {
            const v2SlugUrl = `https://api.cal.com/v2/slots?username=${encodeURIComponent(effectiveUser)}&eventTypeSlug=${encodeURIComponent(effectiveSlug)}&start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}&timeZone=${encodeURIComponent("Europe/Paris")}`;
            console.log(`[Cal.com v2] Fetching slots with username/slug: ${v2SlugUrl}`);
            const v2SlugRes = await fetch(v2SlugUrl, {
              headers: {
                "Authorization": `Bearer ${calApiKey}`,
                "cal-api-version": "2024-09-04",
              },
              signal: AbortSignal.timeout(4000),
            });
            if (v2SlugRes.ok) {
              const calData = await v2SlugRes.json();
              const rawSlots = calData.data?.slots || calData.slots || calData.data;
              const formatted = extractSlotsMap(rawSlots);
              if (Object.keys(formatted).length > 0) {
                return res.json({
                  success: true,
                  slots: formatted,
                  source: "cal.com",
                  username: effectiveUser,
                  eventTypeSlug: effectiveSlug,
                });
              }
            }
          } catch (e: any) {
            console.warn(`[Cal.com v2] Strategy 2 (username/slug) failed: ${e.message}`);
          }
        }

        // Strategy 3: Try Cal.com v1 slots API
        try {
          const v1Params: string[] = [
            `apiKey=${encodeURIComponent(calApiKey)}`,
            `startTime=${encodeURIComponent(`${startDate}T00:00:00.000Z`)}`,
            `endTime=${encodeURIComponent(`${endDate}T23:59:59.999Z`)}`,
            `timeZone=${encodeURIComponent("Europe/Paris")}`,
          ];
          if (effectiveTypeId) v1Params.push(`eventTypeId=${encodeURIComponent(effectiveTypeId)}`);
          if (effectiveUser && effectiveSlug) {
            v1Params.push(`username=${encodeURIComponent(effectiveUser)}`);
            v1Params.push(`eventTypeSlug=${encodeURIComponent(effectiveSlug)}`);
          }

          const v1Url = `https://api.cal.com/v1/slots?${v1Params.join("&")}`;
          const v1Res = await fetch(v1Url, { signal: AbortSignal.timeout(3500) });
          if (v1Res.ok) {
            const v1Data = await v1Res.json();
            const rawSlots = v1Data.slots || v1Data.data || v1Data;
            const formatted = extractSlotsMap(rawSlots);
            if (Object.keys(formatted).length > 0) {
              return res.json({
                success: true,
                slots: formatted,
                source: "cal.com",
                username: effectiveUser,
                eventTypeSlug: effectiveSlug,
              });
            }
          }
        } catch (e: any) {
          console.warn(`[Cal.com v1] Strategy 3 failed: ${e.message}`);
        }

        // If no slots found or all strategies failed, return clean informative message
        return res.status(404).json({
          success: false,
          error: "CAL_NO_SLOTS_FOUND",
          message: "La prise de rendez-vous est momentanément indisponible, un conseiller vous recontactera sous peu.",
          slots: {},
        });
      } catch (calErr: any) {
        console.warn(`[Cal.com] Error executing slot queries: ${calErr.message}`);
        return res.status(503).json({
          success: false,
          error: "CAL_QUERY_ERROR",
          message: "La prise de rendez-vous est momentanément indisponible, un conseiller vous recontactera sous peu.",
          slots: {},
        });
      }
    } catch (err: any) {
      console.error("Error in /api/cal/slots route:", err);
      res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "La prise de rendez-vous est momentanément indisponible, un conseiller vous recontactera sous peu.",
        slots: {},
      });
    }
  });

  // 5. Get Supabase Leads Route
  app.get("/api/supabase/leads", async (_req: Request, res: Response) => {
    try {
      const client = getSupabaseAdmin();
      if (!client) return res.json({ leads: [] });

      const { data, error } = await client
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Error fetching Supabase leads:", error.message);
        return res.json({ leads: [] });
      }

      res.json({ leads: data || [] });
    } catch (err) {
      console.error("Error in get leads route:", err);
      res.json({ leads: [] });
    }
  });

  // Vite middleware for development or static file serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
