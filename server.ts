import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { renderSeo, robotsTxt, sitemapXml, siteBase } from "./server/seo";
import { ZONE, checkZone, zoneFromCoords } from "./server/zone";
import crypto from "crypto";
import {
  requireAgent,
  rateLimit,
  isAuthConfigured,
  checkPassword,
  setSessionCookie,
  clearSessionCookie,
  isAgentRequest,
  signValue,
  readSignedValue,
  loginBlocked,
  recordLoginFailure,
  clearLoginFailures,
  isTotpEnabled,
  verifyTotp,
  generateTotpSecret,
  recordGlobalFailure,
  loginDelayMs,
  securityHeaders,
  setRevokedBefore,
  getRevokedBefore,
} from "./server/auth";
import { mailConfig, isMailConfigured, sendEmail, renderEmail, fillVariables } from "./server/mailer";
import { toLead, pickCrm, leadsToCsv, isUuid as isUuidStr, mapTimeframe, mapMotive } from "./server/crm";
import { computeScore, sanitizeQualification, type Qualification } from "./server/scoring";
import { estimateFromDvf, prewarm, type DvfEstimate } from "./server/dvf";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  claudeJson,
  isClaudeConfigured,
  toClaudeMessages,
  buildQualificationSystemPrompt,
  formatDuration,
  QUALIFICATION_SCHEMA,
  NURTURE_SCHEMA,
  AD_SCHEMA,
  CLAUDE_MODEL,
} from "./server/ai";

dotenv.config();

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
      reply: `Je comprends tout à fait votre demande ! Cependant, un simple envoi automatique par e-mail ne refléterait pas la vraie valeur de votre bien. Une estimation juste nécessite de découvrir le bien et d'échanger en phase de découverte avec Céline (joignable directement au 06 03 58 03 16).\n\nCette visite est 100% offerte et sans engagement : Céline vous livre ensuite un avis de valeur solide.\n\nQuel jour seriez-vous disponible pour convenir d'une visite de découverte ?`,
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
    reply = `C'est très clair ! Pour aller au-delà de cette simulation indicative et réaliser une évaluation approfondie, une visite de découverte permet de faire connaissance en toute simplicité.\n\nSeriez-vous disponible pour convenir d'une visite de découverte avec Céline (vous pouvez également la joindre directement au 06 03 58 03 16) ?`;
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

async function getQualification(messages: Array<{ role: string; content: string }>, leadData: any) {
  if (isClaudeConfigured()) {
    try {
      const history = toClaudeMessages(messages);
      const parsed = await claudeJson<any>({
        system: buildQualificationSystemPrompt(AGENT_PROFILE),
        messages: history,
        schema: QUALIFICATION_SCHEMA,
        maxTokens: 1500,
        timeoutMs: 20000,
        effort: "low",
      });
      if (parsed?.reply) return parsed;
    } catch (e) {
      console.warn("Claude qualification fallback activated:", (e as any)?.message || e);
    }
  }
  return generateIntelligentQualificationReply(messages, leadData);
}

const CAL_BASE = (process.env.CAL_API_BASE || "https://api.cal.com").replace(/\/$/, "");

const AGENT_PROFILE = {
  name: process.env.AGENT_NAME || "Céline Levrat",
  agency: process.env.AGENT_AGENCY || "Agent Estimation",
  phone: process.env.AGENT_PHONE || "06 03 58 03 16",
  city: process.env.AGENT_CITY || "Lyon",
  // Must equal the duration of the Cal.com event
  visitMinutes: Number(process.env.VISIT_MINUTES) || 60,
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(
    express.json({
      // Keep the raw bytes: Cal.com webhook signatures are computed on them
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // --- Advisor authentication (server-side session, HttpOnly cookie) ---
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(securityHeaders);

  app.get("/api/agent/session", (req: Request, res: Response) => {
    res.json({ authenticated: isAgentRequest(req), configured: isAuthConfigured(), twoFactor: isTotpEnabled() });
  });

  app.post("/api/agent/login", async (req: Request, res: Response) => {
    if (!isAuthConfigured()) {
      return res.status(503).json({ error: "L'accès conseiller n'est pas configuré (variable AGENT_PASSWORD, 8 caractères minimum)." });
    }
    const wait = loginBlocked(req.ip || "");
    if (wait > 0) {
      res.setHeader("Retry-After", String(wait));
      return res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${Math.ceil(wait / 60)} min.` });
    }
    // Many failures from many addresses: slow every attempt down instead of locking everyone out
    const delay = loginDelayMs();
    if (delay) await new Promise((r) => setTimeout(r, delay));
    const { password, remember, code } = req.body || {};
    const passwordOk = typeof password === "string" && checkPassword(password);
    // With the second factor on, the code is checked every time, so a wrong password and a wrong code look the same
    const codeOk = !isTotpEnabled() || (typeof code === "string" && verifyTotp(code.replace(/\s/g, "")));
    if (!passwordOk || !codeOk) {
      recordLoginFailure(req.ip || "");
      recordGlobalFailure();
      console.warn(`[auth] failed advisor login from ${req.ip}`);
      return res.status(401).json({ error: isTotpEnabled() ? "Mot de passe ou code incorrect." : "Mot de passe incorrect." });
    }
    clearLoginFailures(req.ip || "");
    setSessionCookie(req, res, Boolean(remember));
    res.json({ authenticated: true });
  });

  // Second factor: shows a fresh key to add to an authenticator app (only while it is not enabled yet)
  app.get("/api/agent/2fa", requireAgent, (_req: Request, res: Response) => {
    if (isTotpEnabled()) return res.json({ enabled: true });
    const secret = generateTotpSecret();
    res.json({
      enabled: false,
      secret,
      otpauth: `otpauth://totp/Agent%20Estimation:conseill%C3%A8re?secret=${secret}&issuer=Agent%20Estimation`,
    });
  });

  // "Log out everywhere": every session created before now stops working (kept in the database, survives restarts)
  app.post("/api/agent/logout-all", requireAgent, async (_req: Request, res: Response) => {
    const now = Date.now();
    setRevokedBefore(now);
    const client = getSupabaseAdmin();
    if (client) {
      try {
        const { data: agent } = await client.from("agents").select("id, script_qualification").order("created_at", { ascending: true }).limit(1).maybeSingle();
        if (agent) {
          await client.from("agents").update({ script_qualification: { ...(agent.script_qualification || {}), sessions_revoked_before: now } }).eq("id", agent.id);
        }
      } catch (e: any) {
        console.warn("[auth] could not persist the revocation:", e?.message || e);
      }
    }
    clearSessionCookie(res);
    res.json({ success: true });
  });

  app.post("/api/agent/logout", (_req: Request, res: Response) => {
    clearSessionCookie(res);
    res.json({ authenticated: false });
  });

  // Address autocomplete (French national address base). Proxied to keep limits and caching on our side.
  const addressCache = new Map<string, { t: number; data: any[] }>();
  app.get("/api/address/suggest", rateLimit("address", 240, 10 * 60 * 1000), async (req: Request, res: Response) => {
    const q = String(req.query.q || "").trim().slice(0, 120);
    if (q.length < 3) return res.json({ suggestions: [] });
    const hit = addressCache.get(q.toLowerCase());
    if (hit && Date.now() - hit.t < 10 * 60 * 1000) return res.json({ suggestions: hit.data });
    try {
      const url = `${process.env.BAN_API_URL || "https://api-adresse.data.gouv.fr"}/search/?q=${encodeURIComponent(q)}&limit=5&autocomplete=1`;
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!r.ok) return res.json({ suggestions: [] });
      const features: any[] = (await r.json())?.features || [];
      const data = features
        .filter((f) => f?.properties?.label && f.properties.postcode && f.properties.city)
        .map((f) => {
          const [lon, lat] = f.geometry?.coordinates || [];
          const zone = typeof lat === "number" && typeof lon === "number" ? zoneFromCoords(lat, lon) : null;
          return {
            label: f.properties.label as string,
            street: (f.properties.name as string) || "",
            postalCode: f.properties.postcode as string,
            city: f.properties.city as string,
            inZone: zone ? zone.inZone : null,
            distanceKm: zone ? zone.distanceKm : null,
          };
        });
      if (addressCache.size > 500) addressCache.clear();
      addressCache.set(q.toLowerCase(), { t: Date.now(), data });
      res.json({ suggestions: data });
    } catch {
      res.json({ suggestions: [] }); // typing must never be blocked by the service being down
    }
  });

  // Is this property inside the area the advisor covers? (public: used by the assistant before collecting contact details)
  app.post("/api/zone-check", rateLimit("zone", 60, 10 * 60 * 1000), async (req: Request, res: Response) => {
    const { address, city, postalCode } = req.body || {};
    const r = await checkZone({
      address: typeof address === "string" ? address.slice(0, 150) : "",
      city: typeof city === "string" ? city.slice(0, 80) : "",
      postalCode: typeof postalCode === "string" ? postalCode.slice(0, 10) : "",
    });
    res.json({ ...r, radiusKm: ZONE.radiusKm, zone: ZONE.name });
  });

  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Real estate estimation calculation endpoint
  app.post("/api/valuation", rateLimit("valuation", 40, 10 * 60 * 1000), async (req: Request, res: Response) => {
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

      // 1. Real sales first (DVF). Falls back to the sector table below when data is unavailable.
      let dvf: DvfEstimate | null = null;
      if (propertyType === "apartment" || propertyType === "house") {
        try {
          dvf = await Promise.race([
            estimateFromDvf({
              address: String(address || ""),
              city: String(city),
              postalCode: String(postalCode),
              type: propertyType,
              surface: Math.max(15, Number(surface) || 75),
            }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 9000)),
          ]);
        } catch (e: any) {
          console.warn("[DVF] estimation failed:", e.message);
        }
      }

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
      if (propertyType === "house" && !dvf) multiplier *= 1.08; // DVF is already filtered by property type
      
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
      if (dvf) {
        // The DVF median already mixes every condition, parking and period of construction.
        // Only the factors a buyer really prices in are applied, and kept small and bounded.
        baseM2 = dvf.medianM2;
        let m = 1;
        m *= ({ to_renovate: 0.85, refresh_needed: 0.93, good: 1, renovated: 1.06, new: 1.1 } as Record<string, number>)[condition] ?? 1;
        m *= ({ A: 1.04, B: 1.04, E: 0.96, F: 0.9, G: 0.9 } as Record<string, number>)[dpe] ?? 1;
        m *= ({ exceptional: 1.06, open: 1.03, street: 0.98, vis_a_vis: 0.95 } as Record<string, number>)[viewType] ?? 1;
        if (propertyType === "apartment") {
          m *= ({ rdc: 0.94, high_floor: 1.02, top_floor: 1.05 } as Record<string, number>)[floor] ?? 1;
          m *= ({ balcony: 1.02, terrace: 1.05, garden: 1.08 } as Record<string, number>)[outdoor] ?? 1;
        }
        multiplier = Math.min(1.15, Math.max(0.85, m));
        extraValue = 0;
      }
      const estimatedAvg = Math.round(numSurface * baseM2 * multiplier + extraValue);
      // Range width follows the real dispersion of nearby sales (5 % to 12 %); flat 6 % for the sector table
      const halfWidth = dvf
        ? Math.min(0.12, Math.max(0.06, ((dvf.p75M2 - dvf.p25M2) / (2 * dvf.medianM2)) * 0.6))
        : 0.12; // no sales data: honest, wider range
      const lowPrice = Math.round((estimatedAvg * (1 - halfWidth)) / 1000) * 1000;
      const highPrice = Math.round((estimatedAvg * (1 + halfWidth)) / 1000) * 1000;
      const avgM2 = Math.round(estimatedAvg / numSurface);

      const confidenceScore = dvf
        ? Math.min(92, 55 + Math.min(25, dvf.sampleSize) + (dvf.precision === "adresse" ? 8 : 0) + (dvf.radiusM !== null && dvf.radiusM <= 600 ? 4 : 0))
        : 40;

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
          propertyType: propertyType === "apartment" ? "Appartement" : propertyType === "house" ? "Maison" : "Bien",
          marketTension: dvf
            ? `${dvf.sampleSize} ventes comparables ${dvf.radiusM ? `dans un rayon de ${dvf.radiusM} m` : `à ${dvf.commune}`}`
            : "Estimation indicative de secteur",
          confidenceScore,
          dataSource: dvf ? "dvf" : "baseline",
          sampleSize: dvf?.sampleSize,
          radiusM: dvf?.radiusM ?? null,
          periodFrom: dvf?.periodFrom,
          periodTo: dvf?.periodTo,
          medianM2: dvf?.medianM2,
          comparables: dvf?.comparables,
        },
      });
    } catch (error) {
      console.error("Valuation error:", error);
      res.status(500).json({ error: "Erreur lors du calcul d'estimation" });
    }
  });

  // AI Qualification & Closer Chatbot endpoint using Claude
  // Recomputes the transparent score of one lead from everything we know (form, quick answers, booking)
  async function rescoreLead(
    client: any,
    leadId: string,
    opts: { qualification?: Qualification; booked?: boolean; timeframe?: string; motive?: string } = {},
  ) {
    try {
      const { data: row } = await client.from("leads").select("*").eq("id", leadId).maybeSingle();
      if (!row) return null;
      const crm = row.crm && typeof row.crm === "object" ? row.crm : {};
      const qualification: Qualification = { ...(crm.qualification || {}), ...(opts.qualification || {}) };
      let booked = opts.booked;
      if (booked === undefined) {
        const { count } = await client.from("rendez_vous").select("id", { count: "exact", head: true }).eq("lead_id", leadId).eq("statut", "confirme");
        booked = (count || 0) > 0;
      }
      const result = computeScore({
        timeframe: mapTimeframe(opts.timeframe ?? row.delai_projet),
        motive: mapMotive(opts.motive ?? row.motif),
        ...qualification,
        estimateLow: crm.valuation?.lowPrice,
        estimateHigh: crm.valuation?.highPrice,
        booked,
      });
      const update: Record<string, any> = { score_qualification: result.score, updated_at: new Date().toISOString() };
      if (row.statut !== "rdv_pris" && row.statut !== "perdu") update.statut = booked ? "rdv_pris" : result.status === "HOT" ? "qualifie" : "en_conversation";
      if (booked) update.statut = "rdv_pris";
      let { error } = await client.from("leads").update({ ...update, crm: { ...crm, qualification, scoreReasons: result.reasons, blockers: result.blockers } }).eq("id", leadId);
      if (error) {
        // Older database without the crm column: keep at least the score and status
        await client.from("leads").update(update).eq("id", leadId);
      }
      return result;
    } catch (e: any) {
      console.warn("[CRM] rescore failed:", e.message);
      return null;
    }
  }

  // Pre-visit brief for the advisor: what the seller wants, what to watch, what to ask. Never invents facts.
  async function generateBrief(client: any, leadId: string) {
    const { data: row } = await client.from("leads").select("*").eq("id", leadId).maybeSingle();
    if (!row) return null;
    const crm = row.crm && typeof row.crm === "object" ? row.crm : {};
    const { data: conv } = await client.from("conversations").select("messages").eq("lead_id", leadId).maybeSingle();
    const { data: rdvs } = await client.from("rendez_vous").select("creneau, statut").eq("lead_id", leadId).eq("statut", "confirme");
    const facts = {
      nom: row.nom,
      bien: { type: row.type_bien, surface_m2: row.surface, ville: row.ville_bien, adresse: row.adresse },
      estimation: crm.valuation ? { fourchette: [crm.valuation.lowPrice, crm.valuation.highPrice], source: crm.valuation.dataSource === "dvf" ? `${crm.valuation.sampleSize} ventes réelles (DVF)` : "prix moyen de secteur (indicatif)" } : null,
      projet: { delai: row.delai_projet, motif: row.motif },
      reponses_rapides: crm.qualification || {},
      score: { valeur: row.score_qualification, raisons: crm.scoreReasons || [], points_de_vigilance: crm.blockers || [] },
      visite: (rdvs || []).map((r: any) => r.creneau),
      echange_avec_assistant: (conv?.messages || []).slice(-12).map((m: any) => `${m.role === "user" ? "Client" : "Assistant"} : ${m.content}`),
    };

    const fallback = {
      summary: `${row.nom} souhaite faire estimer ${row.type_bien ? `un ${String(row.type_bien).toLowerCase()}` : "un bien"}${row.ville_bien ? ` à ${row.ville_bien}` : ""}. Délai : ${row.delai_projet || "non renseigné"}. Motif : ${row.motif || "non renseigné"}.`,
      strengths: (crm.scoreReasons || []).filter((r: any) => r.points > 0).map((r: any) => r.label),
      watchouts: crm.blockers || [],
      questions: ["Qu'est-ce qui motive la vente maintenant ?", "Quel prix avez-vous en tête, et pourquoi ?", "Y a-t-il des travaux récents ou à prévoir ?", "Qui décide de la vente ?"],
    };

    let brief: any = fallback;
    let source = "regles";
    if (isClaudeConfigured()) {
      try {
        const ai = await claudeJson<any>({
          system: "Tu prépares la fiche de pré-visite d'une conseillère immobilière à partir des seules données fournies. N'invente RIEN : si une information manque, écris « non renseigné ». Français, concis, utile sur le terrain. summary : 3 phrases maximum. strengths : ce qui est favorable à un mandat. watchouts : risques ou points sensibles (indivision, mandat ailleurs, attentes de prix, locataire...). questions : 4 à 6 questions précises à poser pendant la visite.",
          messages: [{ role: "user", content: JSON.stringify(facts) }],
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "strengths", "watchouts", "questions"],
            properties: {
              summary: { type: "string" },
              strengths: { type: "array", items: { type: "string" } },
              watchouts: { type: "array", items: { type: "string" } },
              questions: { type: "array", items: { type: "string" } },
            },
          },
          maxTokens: 1500,
          timeoutMs: 30000,
          effort: "low",
        });
        if (ai?.summary) {
          brief = ai;
          source = "ia";
        }
      } catch (e: any) {
        console.warn("[CRM] brief generation fallback:", e.message);
      }
    }
    const stored = { ...brief, source, generatedAt: new Date().toISOString() };
    await client.from("leads").update({ crm: { ...crm, brief: stored } }).eq("id", leadId);
    return stored;
  }

  // Keeps the transcript and the qualification in Supabase so the advisor sees them in the CRM
  async function persistChat(leadId: unknown, messages: any, result: any) {
    const client = getSupabaseAdmin();
    if (!client || !isUuidStr(leadId) || !Array.isArray(messages)) return;
    try {
      const now = new Date().toISOString();
      const history = [
        ...messages.map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.content || ""), timestamp: m.timestamp || now })),
        { role: "assistant", content: String(result.reply || ""), timestamp: now },
      ];
      await client.from("conversations").upsert({ lead_id: leadId, messages: history, updated_at: now }, { onConflict: "lead_id" });

      const x = result.extractedData || {};
      // Optional columns: a missing column must never block the main update above
      if (x.motive) await client.from("leads").update({ motif: String(x.motive) }).eq("id", leadId);
      if (x.timeframe) await client.from("leads").update({ delai_projet: String(x.timeframe) }).eq("id", leadId);
      await rescoreLead(client, leadId);
    } catch (e: any) {
      console.warn("[CRM] chat persistence failed:", e.message);
    }
  }

  app.post("/api/chat-qualify", rateLimit("chat", 60, 10 * 60 * 1000), async (req: Request, res: Response) => {
    try {
      const { messages, leadData, leadId } = req.body;
      const respond = async (result: any) => {
        await persistChat(leadId, messages, result);
        return res.json(result);
      };

      // Claude first (structured JSON output); heuristic engine if the API is unreachable or slow
      if (isClaudeConfigured()) {
        try {
          const systemPrompt = buildQualificationSystemPrompt(AGENT_PROFILE);
          const history = toClaudeMessages(messages || []);
          // Simulator data goes in the last user turn so the system prompt stays static
          const last = history[history.length - 1];
          if (leadData && Object.keys(leadData).length > 0 && last.role === "user") {
            last.content += `\n\n[Contexte issu du simulateur, ne pas citer tel quel : ${JSON.stringify(leadData)}]`;
          }
          const parsed = await claudeJson<any>({
            system: systemPrompt,
            messages: history,
            schema: QUALIFICATION_SCHEMA,
            maxTokens: 1500,
            timeoutMs: 20000,
            effort: "low",
          });
          if (parsed && parsed.reply) {
            return respond(parsed);
          }
        } catch (aiError) {
          console.warn("Claude chat fallback activated:", (aiError as any)?.message || aiError);
        }
      }

      // Fast fallback response
      const fallbackResult = generateIntelligentQualificationReply(messages, leadData);
      return respond(fallbackResult);
    } catch (error) {
      console.error("Chat qualify general error:", error);
      const safeFallback = generateIntelligentQualificationReply(req.body?.messages || [], req.body?.leadData || {});
      return res.json(safeFallback);
    }
  });

  // ===================== Relances: real e-mail sending, scheduling, history =====================
  const BASE_URL = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
  const DAILY_LIMIT = Number(process.env.MAIL_DAILY_LIMIT) || 50;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // Sending window: scheduled e-mails only leave between 8:00 and 20:00 Paris time
  function inSendWindow(now = new Date()): boolean {
    const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(now));
    return h >= 8 && h < 20;
  }

  async function sentToday(client: any): Promise<number> {
    const since = new Date();
    since.setHours(since.getHours() - 24);
    const { count } = await client.from("relances").select("id", { count: "exact", head: true }).eq("status", "envoye").gte("sent_at", since.toISOString());
    return count || 0;
  }

  /** Sends one relance row (already inserted with status "envoi") and records the outcome. */
  async function deliverRelance(client: any, row: { id: string; lead_id: string; subject?: string | null; message: string }) {
    const finish = async (patch: Record<string, any>) => {
      await client.from("relances").update(patch).eq("id", row.id);
    };
    const { data: lead } = await client.from("leads").select("*").eq("id", row.lead_id).maybeSingle();
    if (!lead) {
      await finish({ status: "erreur", error: "Fiche introuvable" });
      return { ok: false as const, error: "Fiche introuvable" };
    }
    const to = String(lead.email || "").trim();
    if (!EMAIL_RE.test(to)) {
      await finish({ status: "erreur", error: "Pas d'adresse e-mail valide pour ce contact", recipient: to || null });
      return { ok: false as const, error: "Ce contact n'a pas d'adresse e-mail valide." };
    }
    const { data: optOut } = await client.from("desinscriptions").select("email").eq("email", to.toLowerCase()).maybeSingle();
    if (optOut) {
      await finish({ status: "annule", error: "Contact désinscrit", recipient: to });
      return { ok: false as const, error: "Ce contact s'est désinscrit : aucun message ne peut lui être envoyé." };
    }

    if (!BASE_URL) {
      // Every e-mail must carry a working unsubscribe link
      await finish({ status: "erreur", error: "APP_URL manquante", recipient: to });
      return { ok: false as const, error: "L'adresse du site (variable APP_URL) n'est pas renseignée : le lien de désinscription obligatoire ne peut pas être ajouté." };
    }
    const cfg = mailConfig();
    const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?t=${encodeURIComponent(signValue(lead.id))}`;
    const body = fillVariables(row.message, lead);
    const subject = fillVariables(row.subject || "Votre estimation", lead);
    const { text, html } = renderEmail({
      body,
      signatureName: AGENT_PROFILE.name,
      signatureLine: "Conseillère immobilière indépendante",
      phone: AGENT_PROFILE.phone,
      bookingUrl: BASE_URL,
      unsubscribeUrl,
    });
    const result = await sendEmail({ to, toName: lead.nom, subject, text, html, unsubscribeUrl });
    if (result.ok === false) {
      await finish({ status: "erreur", error: result.error, recipient: to });
      return { ok: false as const, error: result.error };
    }
    await finish({ status: "envoye", sent_at: new Date().toISOString(), recipient: to, provider_id: result.id, error: null });
    return { ok: true as const, id: result.id, recipient: to, from: cfg.fromEmail };
  }

  app.get("/api/relances/status", requireAgent, async (_req: Request, res: Response) => {
    const client = getSupabaseAdmin();
    const cfg = mailConfig();
    res.json({
      emailConfigured: cfg.provider !== null,
      provider: cfg.provider,
      from: cfg.provider ? `${cfg.fromName} <${cfg.fromEmail}>` : null,
      replyTo: cfg.provider ? cfg.replyTo : null,
      bccConfigured: Boolean(cfg.bcc),
      baseUrlConfigured: Boolean(BASE_URL),
      dailyLimit: DAILY_LIMIT,
      sentLast24h: client ? await sentToday(client) : 0,
      databaseConfigured: Boolean(client),
    });
  });

  // Immediate send (one e-mail, from the advisor's screen)
  app.post("/api/relances/send", requireAgent, rateLimit("relance-send", 60, 10 * 60 * 1000), async (req: Request, res: Response) => {
    const client = getSupabaseAdmin();
    if (!client) return res.status(503).json({ success: false, error: "Base de données non configurée." });
    if (!isMailConfigured()) {
      return res.status(503).json({ success: false, error: "L'envoi d'e-mails n'est pas configuré sur ce serveur (voir RESEND_API_KEY et MAIL_FROM_EMAIL)." });
    }
    const { leadId, subject, message, step } = req.body || {};
    if (!isUuidStr(leadId) || typeof message !== "string" || message.trim().length < 5) {
      return res.status(400).json({ success: false, error: "Message ou contact invalide. Enregistrez d'abord la fiche du contact." });
    }
    if ((await sentToday(client)) >= DAILY_LIMIT) {
      return res.status(429).json({ success: false, error: `Limite de ${DAILY_LIMIT} e-mails par 24 h atteinte.` });
    }
    const { data: row, error } = await client
      .from("relances")
      .insert({ lead_id: leadId, step: step || null, channel: "Email", subject: subject || null, message, status: "envoi" })
      .select("id, lead_id, subject, message")
      .single();
    if (error || !row) return res.status(500).json({ success: false, error: error?.message || "Enregistrement impossible" });
    const result = await deliverRelance(client, row);
    if (result.ok === false) return res.status(502).json({ success: false, error: result.error });
    res.json({ success: true, id: row.id, recipient: result.recipient, from: result.from });
  });

  // Replace the programmed (not yet sent) relances of one contact. Only e-mails are sent automatically;
  // SMS / WhatsApp steps become reminders ("a_faire") because no SMS provider is connected.
  app.put("/api/relances/schedule/:leadId", requireAgent, async (req: Request, res: Response) => {
    const client = getSupabaseAdmin();
    if (!client) return res.status(503).json({ error: "Base de données non configurée." });
    const leadId = req.params.leadId;
    if (!isUuidStr(leadId)) return res.status(400).json({ error: "Identifiant invalide" });
    const { enabled, items } = req.body || {};

    await client.from("relances").delete().eq("lead_id", leadId).in("status", ["programme", "a_faire"]);
    if (!enabled) return res.json({ success: true, scheduled: 0, skipped: 0 });

    const now = Date.now();
    let skipped = 0;
    const rows: any[] = [];
    for (const it of Array.isArray(items) ? items : []) {
      const sendAt = new Date(it.sendAt);
      if (isNaN(sendAt.getTime()) || sendAt.getTime() < now - 5 * 60 * 1000 || typeof it.message !== "string" || !it.message.trim()) {
        skipped++; // past or empty steps are never sent in a burst
        continue;
      }
      if (it.status === "paused") continue;
      const channel = ["Email", "SMS", "WhatsApp"].includes(it.channel) ? it.channel : "Email";
      rows.push({
        lead_id: leadId,
        step: it.step || null,
        channel,
        subject: it.subject || null,
        message: it.message,
        send_at: sendAt.toISOString(),
        status: channel === "Email" ? "programme" : "a_faire",
      });
    }
    if (rows.length) {
      const { error } = await client.from("relances").insert(rows);
      if (error) return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, scheduled: rows.length, skipped });
  });

  app.get("/api/relances/lead/:leadId", requireAgent, async (req: Request, res: Response) => {
    const client = getSupabaseAdmin();
    if (!client || !isUuidStr(req.params.leadId)) return res.json({ relances: [] });
    const { data } = await client.from("relances").select("*").eq("lead_id", req.params.leadId).order("send_at", { ascending: true });
    res.json({ relances: data || [] });
  });

  app.get("/api/relances/history", requireAgent, async (_req: Request, res: Response) => {
    const client = getSupabaseAdmin();
    if (!client) return res.json({ logs: [] });
    const { data } = await client
      .from("relances")
      .select("id, lead_id, step, channel, subject, message, status, sent_at, send_at, recipient, error, created_at")
      .in("status", ["envoye", "erreur", "annule"])
      .order("created_at", { ascending: false })
      .limit(100);
    const rows: any[] = data || [];
    // Messages whose contact no longer exists (deleted by hand in the database) are removed for good
    const leadIds = [...new Set(rows.map((r) => r.lead_id).filter(Boolean))];
    const { data: leads } = leadIds.length ? await client.from("leads").select("id, nom").in("id", leadIds) : { data: [] as any[] };
    const names = new Map<string, string>((leads || []).map((l: any) => [l.id, l.nom]));
    const orphans = rows.filter((r) => !names.has(r.lead_id)).map((r) => r.id);
    if (orphans.length && leads) await client.from("relances").delete().in("id", orphans);
    res.json({
      logs: rows
        .filter((r) => names.has(r.lead_id))
        .map((r: any) => ({
          id: r.id,
          leadName: names.get(r.lead_id) || "Contact",
          recipient: r.recipient || "",
          channel: r.channel,
          subject: r.subject || "",
          message: r.message,
          status: r.status,
          sentAt: r.sent_at || r.created_at,
          error: r.error,
        })),
    });
  });

  // Sends every due programmed e-mail (called every minute by the server and by an optional external cron)
  let relancesRunning = false;
  async function processDueRelances(): Promise<{ sent: number; failed: number }> {
    const client = getSupabaseAdmin();
    if (relancesRunning || !client || !isMailConfigured() || !inSendWindow()) return { sent: 0, failed: 0 };
    relancesRunning = true;
    let sent = 0;
    let failed = 0;
    try {
      const { data: due, error } = await client
        .from("relances")
        .select("id")
        .eq("status", "programme")
        .eq("channel", "Email")
        .lte("send_at", new Date().toISOString())
        .order("send_at", { ascending: true })
        .limit(10);
      if (error || !due?.length) return { sent, failed };
      let budget = DAILY_LIMIT - (await sentToday(client));
      for (const d of due) {
        if (budget <= 0) break;
        // Atomic claim: only the instance that flips programme -> envoi sends the message
        const { data: claimed } = await client.from("relances").update({ status: "envoi" }).eq("id", d.id).eq("status", "programme").select("id, lead_id, subject, message").maybeSingle();
        if (!claimed) continue;
        const r = await deliverRelance(client, claimed);
        if (r.ok) {
          sent++;
          budget--;
        } else failed++;
      }
    } catch (e: any) {
      console.warn("[Relances] scheduler error:", e.message);
    } finally {
      relancesRunning = false;
    }
    return { sent, failed };
  }
  setInterval(() => void processDueRelances(), 60 * 1000).unref();

  // Supabase (offre gratuite) met un projet en pause après une semaine sans activité : une requête légère toutes les 6 heures,
  // quel que soit le trafic, suffit à le garder actif. Sans effet si Supabase n'est pas configuré.
  const keepSupabaseAwake = async () => {
    const client = getSupabaseAdmin();
    if (!client) return;
    try {
      const { error } = await client.from("agents").select("id").limit(1);
      if (error) console.warn("[keepalive] Supabase:", error.message);
    } catch (e: any) {
      console.warn("[keepalive] Supabase:", e?.message || e);
    }
  };
  // Premier passage après le démarrage complet du serveur, puis toutes les 6 heures
  setTimeout(() => void keepSupabaseAwake(), 15 * 1000).unref();
  // Load the "log out everywhere" marker once the server is fully started
  setTimeout(async () => {
    const client = getSupabaseAdmin();
    if (!client) return;
    try {
      const { data: agent } = await client.from("agents").select("script_qualification").order("created_at", { ascending: true }).limit(1).maybeSingle();
      const ts = Number(agent?.script_qualification?.sessions_revoked_before) || 0;
      if (ts > getRevokedBefore()) setRevokedBefore(ts);
    } catch {
      /* no marker yet */
    }
  }, 5 * 1000).unref();
  setInterval(() => void keepSupabaseAwake(), 6 * 3600 * 1000).unref();

  // Optional: lets an external pinger (cron-job.org, UptimeRobot) wake a sleeping free instance and trigger a run
  app.post("/api/cron/relances", async (req: Request, res: Response) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers["x-cron-secret"] !== secret) return res.status(401).json({ error: "unauthorized" });
    res.json(await processDueRelances());
  });

  // Public unsubscribe link (in every e-mail)
  app.get("/api/unsubscribe", rateLimit("unsub", 30, 10 * 60 * 1000), async (req: Request, res: Response) => {
    const page = (title: string, text: string) =>
      res.status(200).type("html").send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#f6f5f3;margin:0;padding:40px 16px"><div style="max-width:460px;margin:0 auto;background:#fff;border-radius:12px;padding:28px"><h1 style="font-size:20px;margin:0 0 12px">${title}</h1><p style="line-height:1.6;color:#44403c;margin:0">${text}</p></div></body></html>`);
    const leadId = readSignedValue(String(req.query.t || ""));
    const client = getSupabaseAdmin();
    if (!leadId || !isUuidStr(leadId) || !client) return page("Lien invalide", "Ce lien de désinscription n'est pas valide.");
    const { data: lead } = await client.from("leads").select("email").eq("id", leadId).maybeSingle();
    if (lead?.email) {
      await client.from("desinscriptions").upsert({ email: String(lead.email).toLowerCase() });
      await client.from("relances").update({ status: "annule", error: "Désinscription" }).eq("lead_id", leadId).in("status", ["programme", "a_faire"]);
    }
    page("Vous êtes désinscrit", "Vous ne recevrez plus de messages de notre part. Si c'est une erreur, répondez simplement à l'un de nos e-mails.");
  });

  // AI Nurture Sequence generator endpoint
  app.post("/api/generate-nurture", requireAgent, async (req: Request, res: Response) => {
    try {
      const { leadProfile } = req.body;

      const first = String(leadProfile?.name || "").split(" ")[0];
      const hello = first ? `Bonjour ${first},` : "Bonjour,";
      const type = String(leadProfile?.propertyType || "bien").toLowerCase();
      const city = leadProfile?.city || "votre commune";
      const fallbackSequence = [
        { step: "J+1 (Email)", channel: "Email", subject: `Votre estimation à ${city}`, message: `${hello}\n\nMerci d'avoir demandé l'estimation de votre ${type} à ${city}. La simulation est un repère : une visite permet de tenir compte de l'état réel du bien. Elle est gratuite et sans engagement.` },
        { step: "J+7 (Email)", channel: "Email", subject: `Ce qui fait varier le prix d'un ${type}`, message: `${hello}\n\nL'état général, l'étage, l'exposition, le DPE et les charges font varier le prix d'une vente à l'autre. Y a-t-il un point de votre bien que vous aimeriez voir valorisé ?` },
        { step: "J+15 (Email)", channel: "Email", subject: "Documents utiles pour préparer une vente", message: `${hello}\n\nTitre de propriété, taxes foncières, diagnostics déjà réalisés, et en copropriété les derniers procès-verbaux d'assemblée : les rassembler à l'avance fait gagner du temps. Les avoir sous la main le jour de la visite permet d'affiner l'avis de valeur.` },
        { step: "J+30 (Email)", channel: "Email", subject: "Où en est votre projet ?", message: `${hello}\n\nOù en est votre réflexion sur votre ${type} à ${city} ? Je reste disponible pour en parler quelques minutes.` },
        { step: "J+60 (Email)", channel: "Email", subject: "Mettre à jour votre estimation", message: `${hello}\n\nVotre estimation date de deux mois. Je peux la mettre à jour gratuitement avec les ventes les plus récentes. Il suffit de répondre à cet e-mail.` },
      ];

      try {
        const parsed = await claudeJson<{ sequence: any[] }>({
          system: `Tu rédiges des relances par e-mail pour une conseillère immobilière indépendante (Lyon). Ton chaleureux, vouvoiement, jamais agressif, sans jargon commercial. Canal : Email uniquement. Objet court, 4 à 6 lignes. RÈGLES STRICTES : n'invente aucun fait (aucune vente précise, aucun délai de vente, aucun acquéreur ou « acheteur qualifié », aucune statistique, aucun partenaire ni tarif négocié, aucune urgence artificielle) ; n'utilise que les données du profil fournies ; n'écris jamais « net vendeur ». Chaque message propose un pas simple vers une visite de découverte offerte, sans mentionner sa durée.`,
          messages: [{
            role: "user",
            content: `Génère une séquence de 5 relances (J+1, J+7, J+15, J+30, J+60) pour ce propriétaire pas encore mûr.\nProfil :\n${JSON.stringify(leadProfile, null, 2)}\nLe champ step doit être de la forme "J+1 (SMS)".`,
          }],
          schema: NURTURE_SCHEMA,
          maxTokens: 3000,
          timeoutMs: 30000,
        });
        if (parsed && Array.isArray(parsed.sequence) && parsed.sequence.length > 0) {
          return res.json(parsed);
        }
      } catch (err) {
        console.warn("Claude nurture fallback activated:", (err as any)?.message);
      }

      return res.json({ sequence: fallbackSequence });
    } catch (error) {
      console.error("Nurture error:", error);
      res.status(500).json({ error: "Erreur lors de la génération de la séquence" });
    }
  });

  // AI Meta Ad Creative Generator endpoint
  app.post("/api/generate-ad-copy", requireAgent, async (req: Request, res: Response) => {
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
        const parsed = await claudeJson<any>({
          system: "Tu es expert Meta Ads pour l'immobilier français. Tu écris des publicités honnêtes (aucune promesse de prix ni de résultat garanti), conformes aux règles Meta. Le CTA mène vers une landing page avec simulateur d'estimation, jamais vers un formulaire Meta natif.",
          messages: [{
            role: "user",
            content: `Crée un pack publicitaire pour capter des vendeurs à ${city}. Motif ciblé : ${motive || "Succession ou Mutation"}.`,
          }],
          schema: AD_SCHEMA,
          maxTokens: 1500,
          timeoutMs: 25000,
        });
        if (parsed && parsed.hook) {
          return res.json(parsed);
        }
      } catch (err) {
        console.warn("Claude ad fallback activated:", (err as any)?.message);
      }

      return res.json(fallbackAd);
    } catch (error) {
      console.error("Ad copy error:", error);
      res.status(500).json({ error: "Erreur lors de la génération" });
    }
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

  // Offset (ms) of Europe/Paris from UTC at a given instant (+1h winter, +2h summer)
  function parisOffsetMs(instant: Date): number {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Paris",
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric",
      hourCycle: "h23",
    }).formatToParts(instant);
    const g = (t: string) => parseInt(parts.find((p) => p.type === t)?.value || "0", 10);
    const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
    return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
  }

  // Converts a Europe/Paris wall-clock date+time into the exact UTC ISO string Cal.com expects
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
    const wall = Date.UTC(year, month - 1, day, hour, minute, 0);
    // Two passes: the offset must be read at the real instant, not at the naive one (DST nights)
    let guess = wall - parisOffsetMs(new Date(wall));
    guess = wall - parisOffsetMs(new Date(guess));
    return new Date(guess).toISOString();
  }

  // Splits a UTC instant into Paris-local { date: "YYYY-MM-DD", time: "HH:mm" }
  function toParisParts(iso: string): { date: string; time: string } | null {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(d);
    const g = (t: string) => parts.find((p) => p.type === t)?.value || "00";
    return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
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
      const meRes = await fetch(`${CAL_BASE}/v2/me`, {
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
        const meV1 = await fetch(`${CAL_BASE}/v1/users/me?apiKey=${encodeURIComponent(calApiKey)}`, {
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
    const usernameForQuery = profile.username || process.env.CAL_USERNAME || "";
    try {
      if (!usernameForQuery) throw new Error("no Cal.com username");
      const eventRes = await fetch(`${CAL_BASE}/v2/event-types?username=${encodeURIComponent(usernameForQuery)}`, {
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
        const eventV1 = await fetch(`${CAL_BASE}/v1/event-types?apiKey=${encodeURIComponent(calApiKey)}`, {
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
        const envId = Number(process.env.CAL_EVENT_TYPE_ID) || null;
        const envSlug = process.env.CAL_EVENT_SLUG || null;
        // Exact matches only: a wrong event type would show someone else's availability
        const match =
          (envId && profile.eventTypes.find(et => et.id === envId)) ||
          (envSlug && profile.eventTypes.find(et => et.slug === envSlug)) ||
          profile.eventTypes.find(et => et.slug === "visite-d-estimation-a-domicile");
        if (match) {
          profile.defaultEventTypeId = match.id;
          profile.defaultEventTypeSlug = match.slug;
        } else {
          console.warn("[Cal.com] No event type matches CAL_EVENT_TYPE_ID / CAL_EVENT_SLUG / 'visite-d-estimation-a-domicile'. Booking is disabled until configured.");
        }
        console.log(`[Cal.com] Found ${profile.eventTypes.length} event type(s). Default: ${profile.defaultEventTypeSlug} (ID: ${profile.defaultEventTypeId})`);
      }
    } catch (e: any) {
      console.log(`[Cal.com] Could not fetch event types: ${e.message}`);
    }

    // Env overrides win when auto-discovery found nothing
    if (!profile.defaultEventTypeId && process.env.CAL_EVENT_TYPE_ID) profile.defaultEventTypeId = Number(process.env.CAL_EVENT_TYPE_ID);
    if (!profile.defaultEventTypeSlug && process.env.CAL_EVENT_SLUG) profile.defaultEventTypeSlug = process.env.CAL_EVENT_SLUG;
    if (!profile.username && process.env.CAL_USERNAME) profile.username = process.env.CAL_USERNAME;

    // Never cache a failed discovery for a full minute
    if (profile.defaultEventTypeId) cachedCalProfile = { profile, timestamp: Date.now() };
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
            agency_name: "Agent Estimation",
            phone: "06 03 58 03 16",
            tone: "professionnel, empathique, valorisant et orienté vers une visite de découverte sans engagement",
            geographic_perimeter: "Lyon et 30 km autour",
            welcome_template: "Bonjour ! Je suis l'assistant de Céline Levrat, conseillère immobilière à Lyon. Je suis à votre écoute pour échanger sur votre bien et préparer votre estimation.",
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
  // Optional columns (added by the 20261003 migration) must not break older databases
  async function runWithOptionalColumns<T>(
    base: Record<string, any>,
    optional: Record<string, any>,
    run: (payload: Record<string, any>) => Promise<{ data: T | null; error: any }>,
  ) {
    const clean = Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== null && v !== undefined && v !== ""));
    let result = await run({ ...base, ...clean });
    if (result.error && Object.keys(clean).length && (result.error.code === "PGRST204" || /column/i.test(result.error.message || ""))) {
      console.warn("[Supabase] CRM columns missing (run supabase/migrations/20261003000000_crm_fields.sql). Retrying without them.");
      result = await run(base);
    }
    return result;
  }

  app.post("/api/supabase/sync-lead", rateLimit("lead", 30, 10 * 60 * 1000), async (req: Request, res: Response) => {
    try {
      const client = getSupabaseAdmin();
      const leadData = req.body;

      if (!client) {
        const generatedId = leadData.id || `lead-${Date.now()}`;
        return res.json({ success: true, lead_id: generatedId, persisted: false });
      }

      const agentId = await getOrCreateActiveAgentId(client);
      const idIsUuid = isUuidStr(leadData.id);

      // Only properties inside the advisor's area create a contact (a lead outside it would only cost advertising money)
      if (!idIsUuid && (leadData.city || leadData.postalCode)) {
        const z = await checkZone({ address: leadData.address, city: leadData.city, postalCode: leadData.postalCode });
        if (z.inZone === false) {
          return res.status(422).json({ success: false, outOfZone: true, distanceKm: z.distanceKm, radiusKm: ZONE.radiusKm, error: "Bien situé hors de la zone d'intervention." });
        }
      }

      const base: Record<string, any> = {
        agent_id: agentId,
        nom: leadData.name || leadData.nom || "Client",
        telephone: leadData.phone || leadData.telephone || "06 00 00 00 00",
        email: leadData.email || null,
        type_bien: leadData.propertyType || leadData.type_bien || null,
        ville_bien: leadData.city || leadData.ville_bien || null,
        surface: leadData.surface ? Number(leadData.surface) : null,
        statut: leadData.meetingBooked ? "rdv_pris" : "en_conversation",
        updated_at: new Date().toISOString(),
      };
      if (leadData.postalCode) base.code_postal = String(leadData.postalCode);
      if (leadData.rooms) base.nb_pieces = Number(leadData.rooms) || null;
      const optional = {
        adresse: leadData.address || null,
        valeur_estimee: leadData.estimatedValue ? Number(leadData.estimatedValue) : null,
        motif: leadData.motive || null,
        delai_projet: leadData.timeframe ? String(leadData.timeframe) : null,
      };
      // Seller-journey context for the CRM, written once when the lead is created (never overwrites the advisor's edits)
      const initialCrm: Record<string, any> = {};
      for (const k of ["notes", "tasks", "activities", "valuation"]) if (leadData[k]) initialCrm[k] = leadData[k];
      if (leadData.attribution && typeof leadData.attribution === "object") {
        const a: Record<string, string> = {};
        for (const k of ["gclid", "gbraid", "wbraid", "utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent", "landingPage", "capturedAt"]) {
          const v = leadData.attribution[k];
          if (typeof v === "string" && v) a[k] = v.slice(0, 200);
        }
        if (Object.keys(a).length) initialCrm.attribution = a;
      }

      if (idIsUuid) {
        // A lead that already has a confirmed appointment must never fall back to an earlier stage
        const { data: existing } = await client.from("leads").select("statut, score_qualification").eq("id", leadData.id).maybeSingle();
        if (existing?.statut === "rdv_pris") {
          base.statut = "rdv_pris";
        }
        const { data, error } = await runWithOptionalColumns<{ id: string }>(base, optional, (p) =>
          client.from("leads").update(p).eq("id", leadData.id).select("id").maybeSingle(),
        );
        if (!error && data) {
          await rescoreLead(client, data.id, { timeframe: leadData.timeframe, motive: leadData.motive });
          return res.json({ success: true, lead_id: data.id, persisted: true });
        }
      }

      const { data: inserted, error: insertError } = await runWithOptionalColumns<{ id: string }>(
        base,
        { ...optional, ...(Object.keys(initialCrm).length ? { crm: initialCrm } : {}) },
        (p) =>
        client.from("leads").insert(p).select("id").single(),
      );

      if (insertError || !inserted) {
        console.warn("Supabase lead insertion warning:", insertError?.message);
        return res.json({ success: true, lead_id: leadData.id || `lead-${Date.now()}`, persisted: false });
      }

      await rescoreLead(client, inserted.id, { timeframe: leadData.timeframe, motive: leadData.motive });
      return res.json({ success: true, lead_id: inserted.id, persisted: true });
    } catch (err) {
      console.error("Sync lead API error:", err);
      res.json({ success: true, lead_id: req.body?.id || `lead-${Date.now()}`, persisted: false });
    }
  });

  // --- CRM: real leads for the advisor (leads + conversation + appointments) ---
  app.get("/api/crm/leads", requireAgent, async (_req: Request, res: Response) => {
    const client = getSupabaseAdmin();
    if (!client) return res.json({ configured: false, leads: [] });
    try {
      const { data: rows, error } = await client.from("leads").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) return res.status(500).json({ configured: true, error: error.message, leads: [] });
      const ids = (rows || []).map((r: any) => r.id);
      if (ids.length === 0) return res.json({ configured: true, leads: [] });
      const [{ data: convs }, { data: rdvs }] = await Promise.all([
        client.from("conversations").select("lead_id, messages").in("lead_id", ids),
        client.from("rendez_vous").select("lead_id, creneau, statut, cal_booking_id").in("lead_id", ids),
      ]);
      const convBy = new Map((convs || []).map((c: any) => [c.lead_id, c]));
      const rdvBy = new Map<string, any[]>();
      for (const r of rdvs || []) (rdvBy.get(r.lead_id) || rdvBy.set(r.lead_id, []).get(r.lead_id)!).push(r);
      res.json({ configured: true, leads: rows.map((r: any) => toLead(r, convBy.get(r.id), rdvBy.get(r.id) || [])) });
    } catch (e: any) {
      res.status(500).json({ configured: true, error: e.message, leads: [] });
    }
  });

  // Deletes a contact AND everything attached to it (messages, e-mails, conversation, appointments).
  // The Cal.com booking is cancelled too, so the slot becomes free again. The opt-out list is kept on purpose.
  app.delete("/api/crm/leads/:id", requireAgent, rateLimit("lead-delete", 60, 10 * 60 * 1000), async (req: Request, res: Response) => {
    const client = getSupabaseAdmin();
    if (!client) return res.status(503).json({ error: "Supabase non configuré" });
    if (!isUuidStr(req.params.id)) return res.status(400).json({ error: "Identifiant invalide" });
    const id = req.params.id;
    try {
      const { data: rdvs } = await client.from("rendez_vous").select("cal_booking_id, statut").eq("lead_id", id);
      let cancelled = 0;
      const calApiKey = process.env.CAL_API_KEY;
      if (calApiKey) {
        for (const r of rdvs || []) {
          if (!r.cal_booking_id || r.statut === "annule") continue;
          try {
            const c = await fetch(`${CAL_BASE}/v2/bookings/${encodeURIComponent(r.cal_booking_id)}/cancel`, {
              method: "POST",
              headers: { Authorization: `Bearer ${calApiKey}`, "cal-api-version": "2024-08-13", "Content-Type": "application/json" },
              body: JSON.stringify({ cancellationReason: "Dossier supprimé" }),
              signal: AbortSignal.timeout(8000),
            });
            if (c.ok) cancelled++;
          } catch {
            /* best effort: the booking can be cancelled by hand in Cal.com */
          }
        }
      }
      // Explicit deletes first (works even if a foreign key without CASCADE exists), then the contact itself
      for (const table of ["relances", "conversations", "rendez_vous"]) await client.from(table).delete().eq("lead_id", id);
      const { error } = await client.from("leads").delete().eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true, calCancelled: cancelled });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Export complet des dossiers au format CSV (sauvegarde : l'offre gratuite de Supabase n'en fait pas)
  app.get("/api/crm/export.csv", requireAgent, rateLimit("export", 20, 10 * 60 * 1000), async (_req: Request, res: Response) => {
    const client = getSupabaseAdmin();
    if (!client) return res.status(503).json({ error: "Supabase non configuré" });
    try {
      const rows: any[] = [];
      for (let from = 0; from < 20000; from += 1000) {
        const { data, error } = await client.from("leads").select("*").order("created_at", { ascending: false }).range(from, from + 999);
        if (error) return res.status(500).json({ error: error.message });
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      const ids = rows.map((r) => r.id);
      const rdvBy = new Map<string, any[]>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await client.from("rendez_vous").select("lead_id, creneau, statut, cal_booking_id").in("lead_id", ids.slice(i, i + 200));
        for (const r of data || []) (rdvBy.get(r.lead_id) || rdvBy.set(r.lead_id, []).get(r.lead_id)!).push(r);
      }
      const csv = leadsToCsv(rows.map((r) => toLead(r, undefined, rdvBy.get(r.id) || [])));
      const day = new Date().toISOString().slice(0, 10);
      res.set("Content-Type", "text/csv; charset=utf-8").set("Content-Disposition", `attachment; filename="dossiers-${day}.csv"`).set("Cache-Control", "no-store").send(csv);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Saves what only the CRM knows (notes, tasks, mandate, forced status…) into leads.crm
  app.patch("/api/crm/leads/:id", requireAgent, async (req: Request, res: Response) => {
    const client = getSupabaseAdmin();
    if (!client) return res.status(503).json({ error: "Supabase non configuré" });
    if (!isUuidStr(req.params.id)) return res.status(400).json({ error: "Identifiant invalide" });
    const { data: row } = await client.from("leads").select("crm").eq("id", req.params.id).maybeSingle();
    const existing = row?.crm && typeof row.crm === "object" ? row.crm : {};
    const { error } = await client
      .from("leads")
      .update({ crm: { ...existing, ...pickCrm(req.body || {}) }, updated_at: new Date().toISOString() })
      .eq("id", req.params.id);
    if (error) {
      const missing = error.code === "PGRST204" || /column/i.test(error.message || "");
      return res.status(missing ? 409 : 500).json({
        error: missing ? "Colonne 'crm' absente : exécutez la migration 20261003000000_crm_fields.sql dans Supabase." : error.message,
      });
    }
    res.json({ success: true });
  });

  // Quick answers from the seller (3 taps + optional price): public, protected by the unguessable lead id
  app.post("/api/supabase/qualification", rateLimit("qualification", 30, 10 * 60 * 1000), async (req: Request, res: Response) => {
    const client = getSupabaseAdmin();
    const leadId = req.body?.lead_id;
    if (!client || !isUuidStr(leadId)) return res.json({ success: true, persisted: false });
    const qualification = { ...sanitizeQualification(req.body), answeredAt: new Date().toISOString() };
    const result = await rescoreLead(client, leadId, { qualification });
    res.json({ success: true, persisted: Boolean(result) });
  });

  // Pre-visit brief (advisor only): generated on demand, and automatically when a visit is booked
  app.post("/api/crm/leads/:id/brief", requireAgent, rateLimit("brief", 30, 10 * 60 * 1000), async (req: Request, res: Response) => {
    const client = getSupabaseAdmin();
    if (!client || !isUuidStr(req.params.id)) return res.status(400).json({ error: "Fiche introuvable" });
    const brief = await generateBrief(client, req.params.id);
    if (!brief) return res.status(404).json({ error: "Fiche introuvable" });
    res.json({ brief });
  });

  // 2. Qualify Lead Route (Attempts Edge Function or runs backend Claude with Service Role DB updates)
  app.post("/api/supabase/qualify-lead", rateLimit("qualify", 60, 10 * 60 * 1000), async (req: Request, res: Response) => {
    try {
      const { lead_id, user_message } = req.body;
      const client = getSupabaseAdmin();
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      // 1. First attempt calling the remote Supabase Edge Function directly via HTTP
      if (process.env.USE_EDGE_FUNCTIONS === "true" && supabaseUrl && serviceKey) {
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

      // 2. Local fallback execution with Claude & database persistence
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

      const qualifyResult = await getQualification(messages, leadData);
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

          await rescoreLead(client, lead_id);
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
  app.post("/api/supabase/book-appointment", rateLimit("book", 12, 10 * 60 * 1000), async (req: Request, res: Response) => {
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
                nom: name || "Client",
                telephone: phone || "06 00 00 00 00",
                email: email || null,
                ville_bien: address || "Lyon",
                type_bien: property_type || "Appartement",
                surface: surface || 80,
                statut: "qualifie",
                score_qualification: 0,
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
            // Keep what the seller already gave us; only fill gaps (never overwrite the city with the street address)
            await client.from("leads").update({
              type_bien: leadRecord.type_bien || property_type || "Appartement",
              surface: leadRecord.surface || surface || null,
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
      if (!(requestedDate && requestedTime) && !creneau) {
        return res.status(400).json({ success: false, error: "Veuillez choisir une date et une heure." });
      }
      const startIso = (requestedDate && requestedTime)
        ? convertParisTimeToUtcIso(requestedDate, requestedTime)
        : convertParisTimeToUtcIso(creneau);
      if (isNaN(new Date(startIso).getTime()) || new Date(startIso).getTime() < Date.now()) {
        return res.status(400).json({ success: false, error: "Ce créneau n'est plus valide. Merci d'en choisir un autre." });
      }
      const rawEmail = (leadRecord?.email || email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail)) {
        return res.status(400).json({ success: false, error: "Une adresse e-mail valide est nécessaire pour recevoir la confirmation du rendez-vous." });
      }

      console.log(`[Timezone Align] Selected slot '${creneau}' (Paris local) converted to Cal.com UTC start: ${startIso}`);
      const leadName = leadRecord?.nom || name || "Client";
      const leadEmail = rawEmail;
      const leadPhone = leadRecord?.telephone || phone || "06 03 58 03 16";
      const propertyAddress = address || leadRecord?.ville_bien || "Lyon et agglomération";
      const propType = property_type || leadRecord?.type_bien || "Appartement";
      const propSurface = surface || leadRecord?.surface || null;
      const propMotive = motive || "Estimation de valeur & projet de vente";
      const propTimeframe = timeframe || leadRecord?.delai_projet || "1-3 mois";

      // Formater un dossier complet synchronisé directement dans l'événement de calendrier (Google Calendar / Cal.com) pour Céline
      const calendarDescription = [
        `📍 VISITE D'ESTIMATION - ${AGENT_PROFILE.agency.toUpperCase()}`,
        `--------------------------------------------------`,
        `👤 COORDONNÉES :`,
        `• Nom complet : ${leadName}`,
        `• Téléphone : ${leadPhone}`,
        `• Email : ${leadEmail}`,
        ``,
        `📍 ADRESSE DU BIEN (LIEU DU RENDEZ-VOUS) :`,
        `• ${propertyAddress}`,
        ``,
        `🏡 LE BIEN ET LE PROJET :`,
        `• Type de bien : ${propType}`,
        propSurface ? `• Surface estimée : ${propSurface} m²` : null,
        estimated_value ? `• Estimation préliminaire : ${Number(estimated_value).toLocaleString("fr-FR")} €` : null,
        `• Horizon du projet : ${propTimeframe}`,
        `• Motif du projet : ${propMotive}`,
        ``,
        `📝 NOTES :`,
        `• ${notes || "Visite d'estimation sur place pour affinage de l'avis de valeur et remise de l'étude comparative."}`,
        ``,
        `Réservé via Agent Estimation`,
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

          const eventTypeId = calProfile.defaultEventTypeId;
          if (!eventTypeId) {
            return res.status(503).json({
              success: false,
              error: "L'agenda du conseiller n'est pas encore configuré. Merci de réessayer plus tard ou d'appeler directement le conseiller.",
              details: "CAL_EVENT_TYPE_ID introuvable (définir CAL_EVENT_TYPE_ID ou CAL_EVENT_SLUG)",
            });
          }

          // Last line of defence: the chosen start must still be one of Céline's real, free slots (fresh call, no cache)
          const parisStart = toParisParts(startIso);
          if (parisStart) {
            const live = await fetchRealSlots(calApiKey, parisStart.date, parisStart.date).catch(() => null);
            if (live && !("error" in live) && !(live.slots[parisStart.date] || []).includes(parisStart.time)) {
              slotsMemoryCache.clear();
              return res.status(409).json({
                success: false,
                error: "Ce créneau n'est plus disponible dans l'agenda de Céline. Merci d'en choisir un autre.",
              });
            }
          }

          const bookingPayload: any = {
            start: startIso,
            eventTypeId,
            attendee: {
              name: leadName,
              email: leadEmail,
              timeZone: "Europe/Paris",
              language: "fr",
              ...(formattedPhone ? { phoneNumber: formattedPhone } : {}),
            },
            location: {
              type: "attendeeAddress",
              address: propertyAddress || "Lyon, France",
            },
            bookingFieldsResponses: {
              notes: calendarDescription,
            },
            metadata: { source: "agent-estimation", lead_id: String(actualLeadId || "") },
          };

          const postBooking = (payload: any) =>
            fetch(`${CAL_BASE}/v2/bookings`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${calApiKey}`,
                "cal-api-version": "2024-08-13",
              },
              signal: AbortSignal.timeout(12000),
              body: JSON.stringify(payload),
            });

          let calResponse = await postBooking(bookingPayload);

          // If the event type does not accept an attendee address, retry once with the
          // address written into the notes instead of failing the whole booking.
          if (calResponse.status === 400) {
            const firstErr = await calResponse.clone().text();
            if (/location/i.test(firstErr) && !/(already|not available|no_available|busy)/i.test(firstErr)) {
              console.warn("[Cal.com v2] location rejected, retrying without it:", firstErr.slice(0, 300));
              const { location: _drop, ...withoutLocation } = bookingPayload;
              withoutLocation.bookingFieldsResponses = {
                notes: `${calendarDescription}\n\n📍 Lieu du RDV : ${propertyAddress}`,
              };
              calResponse = await postBooking(withoutLocation);
            }
          }

          // Cal.com signals "slot taken" with 409, or with a 400 whose message says so
          const conflictBody = calResponse.ok ? "" : await calResponse.clone().text();
          const isConflict =
            calResponse.status === 409 ||
            (calResponse.status === 400 && /(already has booking|not available|no_available_users|busy|booking_conflict|slot)/i.test(conflictBody));
          if (isConflict) {
            console.warn(`Cal.com booking slot conflict (${calResponse.status}):`, conflictBody.slice(0, 300));
            slotsMemoryCache.clear();
            return res.status(409).json({
              success: false,
              error: "Ce créneau vient d'être réservé ou est indisponible dans l'agenda du conseiller. Merci d'en choisir un autre.",
              details: conflictBody,
            });
          }

          if (!calResponse.ok) {
            const warnText = conflictBody || (await calResponse.text());
            console.error(`[Cal.com v2] Booking failed (${calResponse.status}): ${warnText}`);
            const emailRejected = /email/i.test(warnText);
            return res.status(calResponse.status >= 500 ? 502 : 400).json({
              success: false,
              error: emailRejected
                ? "L'adresse e-mail semble invalide. Merci de la vérifier."
                : "Erreur lors de la confirmation du rendez-vous dans l'agenda. Veuillez réessayer.",
              details: warnText,
            });
          }

          const calData = await calResponse.json();
          calBookingUid = calData.data?.uid || calData.uid || null;
          calBookingId = calBookingUid || (calData.data?.id ? String(calData.data.id) : String(calData.id || ""));
          slotsMemoryCache.clear(); // the slot just taken must disappear from the next listing
          console.log(`[Cal.com v2] Booking confirmed with remote Cal.com UID: ${calBookingId} (Address: ${propertyAddress}, Phone: ${leadPhone})`);
        } catch (calErr: any) {
          console.error("[Cal.com v2] API timeout or connection failure:", calErr.message);
          return res.status(503).json({
            success: false,
            error: "Impossible de joindre l'agenda Cal.com en temps réel. Veuillez réessayer.",
            details: calErr.message,
          });
        }
      } else if (process.env.CAL_DEV_MODE === "true") {
        calBookingId = `dev-booking-${Date.now()}`;
      } else {
        return res.status(503).json({
          success: false,
          error: "La réservation en ligne est momentanément indisponible. Un conseiller vous recontactera sous peu.",
          details: "CAL_API_KEY missing",
        });
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

          await client.from("leads").update({ statut: "rdv_pris", updated_at: new Date().toISOString() }).eq("id", actualLeadId);
          await rescoreLead(client, actualLeadId, { booked: true });
          if (isClaudeConfigured()) void generateBrief(client, actualLeadId).catch(() => {}); // ready before the visit

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
      res.status(500).json({
        success: false,
        error: "Une erreur est survenue pendant la réservation. Votre créneau n'a pas été confirmé, merci de réessayer.",
      });
    }
  });

  // 4. Get Supabase Status & Diagnostics Route
  app.get("/api/supabase/status", requireAgent, async (_req: Request, res: Response) => {
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
  app.get("/api/supabase/rendez-vous", requireAgent, async (_req: Request, res: Response) => {
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

  // Normalises any Cal.com slot payload to { "YYYY-MM-DD": ["HH:mm"] } in Europe/Paris,
  // whatever offset (Z, +02:00...) Cal.com used, and drops slots already in the past.
  function extractSlotsMap(rawSlots: any): Record<string, string[]> {
    if (!rawSlots || typeof rawSlots !== "object") return {};
    const formatted: Record<string, Set<string>> = {};
    const now = Date.now();
    const pushIso = (iso: unknown) => {
      if (typeof iso !== "string" || !iso.includes("T")) return;
      const t = new Date(iso).getTime();
      if (isNaN(t) || t < now) return;
      const p = toParisParts(iso);
      if (!p) return;
      (formatted[p.date] ||= new Set()).add(p.time);
    };
    for (const slotList of Object.values(rawSlots)) {
      if (!Array.isArray(slotList)) continue;
      for (const s of slotList) {
        if (typeof s === "string") pushIso(s);
        else if (s && typeof s === "object") {
          const o = s as any;
          pushIso(o.start ?? o.time ?? o.startTime ?? o.start_time);
        }
      }
    }
    const result: Record<string, string[]> = {};
    for (const [d, set] of Object.entries(formatted)) result[d] = Array.from(set).sort();
    return result;
  }

  // The ONLY source of proposed slots: Cal.com availability of the configured event type
  // (Céline's working hours minus her connected calendars, bookings, buffers and notice).
  async function fetchRealSlots(calApiKey: string, startDate: string, endDate: string) {
    const calProfile = await resolveCalAccount(calApiKey);
    const typeId = calProfile.defaultEventTypeId;
    if (!typeId) return { error: "CAL_EVENT_TYPE_NOT_FOUND" as const, status: 503 };
    const url = `${CAL_BASE}/v2/slots?eventTypeId=${encodeURIComponent(String(typeId))}&start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}&timeZone=${encodeURIComponent("Europe/Paris")}`;
    const calRes = await fetch(url, {
      headers: { Authorization: `Bearer ${calApiKey}`, "cal-api-version": "2024-09-04" },
      signal: AbortSignal.timeout(7000),
    });
    if (!calRes.ok) {
      console.warn(`[Cal.com v2] slots request failed (${calRes.status})`);
      return { error: "CAL_QUERY_ERROR" as const, status: 502 };
    }
    const calData = await calRes.json();
    return { slots: extractSlotsMap(calData.data?.slots || calData.slots || calData.data), eventTypeId: typeId };
  }

  app.get("/api/cal/slots", rateLimit("slots", 120, 10 * 60 * 1000), async (req: Request, res: Response) => {
    const unavailable = (error: string, status: number) =>
      res.status(status).json({
        success: false,
        error,
        message: "La prise de rendez-vous est momentanément indisponible, un conseiller vous recontactera sous peu.",
        slots: {},
      });
    try {
      const calApiKey = process.env.CAL_API_KEY;
      if (!calApiKey) return unavailable("CAL_API_NOT_CONFIGURED", 503);

      const { start, end } = req.query;
      const today = new Date().toISOString().split("T")[0];
      const startDate = start ? new Date(start as string).toISOString().split("T")[0] : today;
      const endDate = end ? new Date(end as string).toISOString().split("T")[0] : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

      // Short cache only to absorb bursts: a slot taken in Céline's calendar disappears within seconds
      const cacheKey = `${startDate}_${endDate}`;
      const cached = slotsMemoryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 15000) return res.json(cached.data);

      const result = await fetchRealSlots(calApiKey, startDate, endDate);
      if ("error" in result) return unavailable(result.error, result.status);

      const body = {
        success: true,
        slots: result.slots,
        source: "cal.com",
        eventTypeId: result.eventTypeId,
        fetchedAt: new Date().toISOString(),
        ...(Object.keys(result.slots).length === 0
          ? { message: "Aucun créneau disponible sur la période. Un conseiller vous recontactera." }
          : {}),
      };
      slotsMemoryCache.set(cacheKey, { data: body, timestamp: Date.now() });
      return res.json(body);
    } catch (err: any) {
      console.warn("[Cal.com] slots error:", err.message);
      return unavailable("CAL_QUERY_ERROR", 503);
    }
  });

  // Plain-language health check of the whole calendar chain (advisor only)
  app.get("/api/cal/diagnostic", requireAgent, async (_req: Request, res: Response) => {
    type Check = { id: string; label: string; status: "ok" | "warn" | "error" | "unknown"; detail: string };
    const checks: Check[] = [];
    const add = (id: string, label: string, status: Check["status"], detail: string) => checks.push({ id, label, status, detail });
    const calApiKey = process.env.CAL_API_KEY;

    if (!calApiKey) {
      add("key", "Clé Cal.com", "error", "CAL_API_KEY n'est pas renseignée sur le serveur : aucun créneau ne peut être proposé.");
      return res.json({ overall: "error", checks });
    }
    const headers = (v: string) => ({ Authorization: `Bearer ${calApiKey}`, "cal-api-version": v });
    const get = async (path: string, version: string) => {
      const r = await fetch(`${CAL_BASE}${path}`, { headers: headers(version), signal: AbortSignal.timeout(7000) });
      return { ok: r.ok, status: r.status, json: r.ok ? await r.json().catch(() => ({})) : null };
    };

    try {
      const me = await get("/v2/me", "2024-08-13");
      if (me.ok) add("account", "Compte Cal.com", "ok", `Connecté en tant que ${me.json?.data?.username || me.json?.data?.email || "?"}.`);
      else add("account", "Compte Cal.com", "error", `La clé est refusée par Cal.com (code ${me.status}). Créez-en une nouvelle dans Cal.com > Settings > Developer > API keys.`);

      const calProfile = await resolveCalAccount(calApiKey);
      const typeId = calProfile.defaultEventTypeId;
      if (!typeId) {
        add("event", "Événement de visite", "error", "Aucun événement ne correspond. Renseignez CAL_EVENT_TYPE_ID (numéro dans l'adresse de l'événement, sur Cal.com).");
      } else {
        const et = await get(`/v2/event-types/${typeId}`, "2024-06-14");
        const d = et.json?.data || {};
        if (!et.ok) {
          add("event", "Événement de visite", "warn", `Événement n°${typeId} utilisé, mais ses réglages n'ont pas pu être lus (code ${et.status}).`);
        } else {
          const len = d.lengthInMinutes ?? d.length;
          add("event", "Événement de visite", "ok", `« ${d.title || d.slug} » (n°${typeId}), durée ${len ?? "?"} min.`);
          add(
            "duration",
            "Durée annoncée aux clients",
            Number(len) === AGENT_PROFILE.visitMinutes ? "ok" : "warn",
            Number(len) === AGENT_PROFILE.visitMinutes
              ? `Le site annonce ${formatDuration(AGENT_PROFILE.visitMinutes)}, comme l'événement Cal.com.`
              : `Le site annonce ${formatDuration(AGENT_PROFILE.visitMinutes)} mais l'événement Cal.com dure ${len ?? "?"} min. Alignez les deux (variable VISIT_MINUTES et durée dans Cal.com).`,
          );
          const before = Number(d.beforeEventBuffer ?? 0);
          const after = Number(d.afterEventBuffer ?? 0);
          add(
            "buffer",
            "Temps de trajet entre deux visites",
            before + after > 0 ? "ok" : "warn",
            before + after > 0
              ? `Marge avant ${before} min, après ${after} min.`
              : "Aucune marge : deux visites pourraient s'enchaîner sans temps de trajet. Ajoutez une marge (30 à 45 min) dans l'événement, onglet « Limites ».",
          );
          const notice = Number(d.minimumBookingNotice ?? 0);
          add(
            "notice",
            "Délai minimum avant une visite",
            notice >= 120 ? "ok" : "warn",
            notice >= 120
              ? `Un client doit réserver au moins ${Math.round(notice / 60)} h à l'avance.`
              : "Un client peut réserver pour dans moins de 2 h. Fixez un préavis (par exemple 12 h) dans l'onglet « Limites ».",
          );
        }
      }

      const cals = await get("/v2/calendars", "2024-08-13");
      if (!cals.ok) {
        add("calendars", "Agenda connecté (Google, Outlook…)", "unknown", `Impossible de lire les agendas connectés (code ${cals.status}). Vérifiez-le à la main dans Cal.com > Settings > Calendars.`);
      } else {
        const list: any[] = cals.json?.data?.connectedCalendars || [];
        if (list.length === 0) {
          add("calendars", "Agenda connecté (Google, Outlook…)", "error", "Aucun agenda n'est connecté à Cal.com : les rendez-vous déjà inscrits dans l'agenda de Céline ne bloqueront PAS les créneaux. Connectez-le dans Cal.com > Settings > Calendars.");
        } else {
          const names = list.map((c) => c.integration?.name || c.integration?.type || "agenda").join(", ");
          add("calendars", "Agenda connecté (Google, Outlook…)", "ok", `Connecté : ${names}. Vérifiez dans Cal.com que « Vérifier les conflits » est coché pour cet agenda.`);
        }
      }

      if (typeId) {
        const from = new Date().toISOString().split("T")[0];
        const to = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
        const r = await fetchRealSlots(calApiKey, from, to);
        if ("error" in r) add("slots", "Créneaux proposés aux clients", "error", "Cal.com ne répond pas correctement sur les créneaux.");
        else {
          const days = Object.keys(r.slots).sort();
          const total = days.reduce((n, d) => n + r.slots[d].length, 0);
          add(
            "slots",
            "Créneaux proposés aux clients",
            total > 0 ? "ok" : "warn",
            total > 0
              ? `${total} créneaux sur les 14 prochains jours. Premier : ${days[0]} à ${r.slots[days[0]][0]} (heure de Paris).`
              : "Aucun créneau sur 14 jours. Vérifiez les horaires de disponibilité de Céline dans Cal.com > Availability.",
          );
        }
      }
    } catch (e: any) {
      add("network", "Liaison avec Cal.com", "error", `Cal.com injoignable : ${e.message}`);
    }

    add(
      "webhook",
      "Annulations et déplacements (webhook)",
      process.env.CAL_WEBHOOK_SECRET ? "ok" : "warn",
      process.env.CAL_WEBHOOK_SECRET
        ? "Secret configuré. Pensez à vérifier que le webhook existe dans Cal.com > Settings > Developer > Webhooks."
        : "CAL_WEBHOOK_SECRET manque : une annulation faite depuis Cal.com ne se répercutera pas ici.",
    );
    const overall = checks.some((c) => c.status === "error") ? "error" : checks.some((c) => c.status === "warn" || c.status === "unknown") ? "warn" : "ok";
    res.json({ overall, checks });
  });

  // --- Cal.com -> Agent Estimation synchronisation (cancellations / reschedules made from Cal.com or the e-mail link) ---
  async function applyCalBookingChange(
    client: any,
    change: { uid?: string; id?: string | number; oldUid?: string; status: "confirme" | "annule"; startIso?: string },
  ): Promise<{ matched: boolean; rendezVousId?: string }> {
    const keys = [change.uid, change.oldUid, change.id != null ? String(change.id) : undefined].filter(Boolean) as string[];
    if (keys.length === 0) return { matched: false };

    const { data: rdv } = await client
      .from("rendez_vous")
      .select("id, lead_id, statut, creneau, cal_booking_id")
      .in("cal_booking_id", keys)
      .limit(1)
      .maybeSingle();
    if (!rdv) return { matched: false };

    const patch: any = { statut: change.status };
    if (change.startIso) patch.creneau = change.startIso;
    if (change.uid) patch.cal_booking_id = change.uid;
    await client.from("rendez_vous").update(patch).eq("id", rdv.id);

    if (change.status === "annule") {
      const { count } = await client
        .from("rendez_vous")
        .select("id", { count: "exact", head: true })
        .eq("lead_id", rdv.lead_id)
        .eq("statut", "confirme");
      if (!count) {
        await client.from("leads").update({ statut: "qualifie", updated_at: new Date().toISOString() }).eq("id", rdv.lead_id);
      }
    } else {
      await client.from("leads").update({ statut: "rdv_pris", updated_at: new Date().toISOString() }).eq("id", rdv.lead_id);
    }
    slotsMemoryCache.clear();
    return { matched: true, rendezVousId: rdv.id };
  }

  // Webhook: configure in Cal.com > Settings > Developer > Webhooks
  // URL = https://<your-domain>/api/webhooks/cal, secret = CAL_WEBHOOK_SECRET,
  // triggers = BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED
  app.post("/api/webhooks/cal", async (req: any, res: Response) => {
    const secret = process.env.CAL_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ error: "CAL_WEBHOOK_SECRET not configured" });

    const received = String(req.headers["x-cal-signature-256"] || "");
    const expected = crypto.createHmac("sha256", secret).update(req.rawBody || Buffer.alloc(0)).digest("hex");
    const ok =
      received.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
    if (!ok) return res.status(401).json({ error: "Invalid signature" });

    const client = getSupabaseAdmin();
    if (!client) return res.json({ received: true, persisted: false });

    try {
      const { triggerEvent, payload } = req.body || {};
      const uid: string | undefined = payload?.uid;
      const startIso: string | undefined = payload?.startTime;
      let result: { matched: boolean } = { matched: false };

      if (triggerEvent === "BOOKING_CANCELLED") {
        result = await applyCalBookingChange(client, { uid, id: payload?.bookingId, status: "annule" });
      } else if (triggerEvent === "BOOKING_RESCHEDULED") {
        result = await applyCalBookingChange(client, {
          uid,
          oldUid: payload?.rescheduleUid,
          id: payload?.bookingId,
          status: "confirme",
          startIso,
        });
      } else if (triggerEvent === "BOOKING_CREATED") {
        // Bookings made through Agent Estimation are already stored; just make sure the uid is attached
        result = await applyCalBookingChange(client, { uid, id: payload?.bookingId, status: "confirme", startIso });
      }
      console.log(`[Cal webhook] ${triggerEvent} uid=${uid} matched=${result.matched}`);
      return res.json({ received: true, matched: result.matched });
    } catch (e: any) {
      console.error("[Cal webhook] processing error:", e.message);
      return res.status(500).json({ error: "processing_error" });
    }
  });

  // Pull-based reconciliation (safety net if a webhook was missed). Called by the CRM on load.
  app.post("/api/cal/sync", requireAgent, async (_req: Request, res: Response) => {
    const calApiKey = process.env.CAL_API_KEY;
    const client = getSupabaseAdmin();
    if (!calApiKey || !client) return res.json({ success: false, synced: 0, reason: "not_configured" });
    try {
      const calRes = await fetch(`${CAL_BASE}/v2/bookings?status=upcoming,cancelled&take=100`, {
        headers: { Authorization: `Bearer ${calApiKey}`, "cal-api-version": "2024-08-13" },
        signal: AbortSignal.timeout(8000),
      });
      if (!calRes.ok) return res.status(502).json({ success: false, error: `Cal.com ${calRes.status}` });
      const body = await calRes.json();
      const bookings: any[] = Array.isArray(body.data) ? body.data : [];
      let updated = 0;
      for (const b of bookings) {
        const cancelled = /cancel|reject/i.test(String(b.status || ""));
        const r = await applyCalBookingChange(client, {
          uid: b.uid,
          id: b.id,
          status: cancelled ? "annule" : "confirme",
          startIso: b.start,
        });
        if (r.matched) updated++;
      }
      return res.json({ success: true, checked: bookings.length, synced: updated });
    } catch (e: any) {
      return res.status(502).json({ success: false, error: e.message });
    }
  });

  // 5. Get Supabase Leads Route
  app.get("/api/supabase/leads", requireAgent, async (_req: Request, res: Response) => {
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

  app.use("/api", (_req: Request, res: Response) => res.status(404).json({ error: "Not found" }));

  // Les pages « prix par secteur » ont été retirées : on renvoie vers l'accueil
  app.get(["/estimation-immobiliere", "/estimation-immobiliere/*"], (_req: Request, res: Response) => res.redirect(301, "/"));

  // SEO files
  app.get("/robots.txt", (req: Request, res: Response) => {
    res.type("text/plain").send(robotsTxt(siteBase(req)));
  });
  app.get("/sitemap.xml", (req: Request, res: Response) => {
    res.type("application/xml").send(sitemapXml(siteBase(req)));
  });

  // HTML pages get their own title, description, canonical and structured data (same for dev and production)
  const sendPage = async (req: Request, res: Response, load: () => Promise<string>) => {
    try {
      const seo = await renderSeo(req);
      let html = (await load()).replace("<!--SEO_HEAD-->", () => seo.head).replace('<div id="root"></div>', () => `<div id="root">${seo.body}</div>`);
      if (seo.body) html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, () => "");
      res.status(seo.status).set("Content-Type", "text/html; charset=utf-8").set("Cache-Control", "no-cache").send(html);
    } catch (e) {
      console.error("page render error:", e);
      res.status(500).send("Erreur de chargement");
    }
  };

  // Vite middleware for development or static file serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    app.get("*", (req: Request, res: Response) =>
      sendPage(req, res, async () => vite.transformIndexHtml(req.originalUrl, await fs.promises.readFile(path.join(process.cwd(), "index.html"), "utf-8"))),
    );
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Hashed build files never change: cache them for a year; the HTML page itself is always revalidated
    app.use("/assets", express.static(path.join(distPath, "assets"), { maxAge: "365d", immutable: true }));
    app.use(express.static(distPath, { index: false, maxAge: "7d" }));
    let template: string | null = null;
    app.get("*", (req: Request, res: Response) =>
      sendPage(req, res, async () => (template ??= await fs.promises.readFile(path.join(distPath, "index.html"), "utf-8"))),
    );
  }

  prewarm((process.env.DVF_PREWARM || "69381,69382,69383,69384,69385,69386,69387,69388,69389,69266").split(",").filter(Boolean));

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
