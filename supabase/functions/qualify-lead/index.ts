import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QualifyRequestBody {
  lead_id: string;
  user_message?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: QualifyRequestBody = await req.json();
    const { lead_id, user_message } = body;

    if (!lead_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: lead_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch Lead data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: `Lead not found for id ${lead_id}: ${leadError?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch Agent data dynamically via lead.agent_id
    // CRITICAL: All agent identity, city, zone, and tone are retrieved dynamically here.
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", lead.agent_id)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: `Agent not found for id ${lead.agent_id}: ${agentError?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Extract dynamic configuration strictly from agent's script_qualification
    const scriptConfig = agent.script_qualification || {};
    const agentDisplayName = scriptConfig.agent_display_name || agent.nom;
    const agencyName = scriptConfig.agency_name || "";
    const agentCity = agent.ville;
    const agentZone = agent.zone_intervention || scriptConfig.geographic_perimeter;
    const agentTone = scriptConfig.tone || "professionnel, bienveillant et orienté découverte";
    const agentPhone = scriptConfig.phone || "";
    const discoveryPrinciples = Array.isArray(scriptConfig.discovery_principles)
      ? scriptConfig.discovery_principles.join("\n- ")
      : "Visite de découverte offerte et sans engagement";
    const customQuestions = Array.isArray(scriptConfig.qualification_questions)
      ? scriptConfig.qualification_questions.map((q: any) => `- ${q.label}`).join("\n")
      : "";

    // 4. Fetch or initialize conversation history
    const { data: convData, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("lead_id", lead_id)
      .maybeSingle();

    let messagesList: Array<{ role: string; content: string; timestamp: string }> = [];
    if (convData && Array.isArray(convData.messages)) {
      messagesList = convData.messages;
    }

    // Append new user message if provided
    if (user_message && user_message.trim().length > 0) {
      messagesList.push({
        role: "user",
        content: user_message.trim(),
        timestamp: new Date().toISOString(),
      });
    }

    // 5. Construct Dynamic System Prompt (No hardcoded agent identity)
    const dynamicSystemPrompt = `Tu es l'assistant de qualification conversationnelle d'Estiméo, agissant pour le compte de ${agentDisplayName}${agencyName ? ` (${agencyName})` : ""}.

CONTEXTE ET IDENTITÉ DE L'AGENT :
- Conseiller référent : ${agentDisplayName}
- Ville d'implantation : ${agentCity}
- Périmètre géographique d'intervention : ${agentZone}
${agentPhone ? `- Téléphone direct du conseiller : ${agentPhone}` : ""}
- Ton de communication exigé : ${agentTone}

PRINCIPES CLÉS DE LA DÉCOUVERTE :
- ${discoveryPrinciples}
- Objectif ultime : qualifier le projet du vendeur avec bienveillance et convenir d'une visite de découverte sur place (100% offerte, sans paperasse ni engagement).

QUESTIONS ET AXES DE QUALIFICATION SPÉCIFIQUES À LA ZONE :
${customQuestions}

DONNÉES ACTUELLES DU PROSPECT :
- Nom : ${lead.nom || "Inconnu"}
- Téléphone : ${lead.telephone || "Inconnu"}
- Type de bien : ${lead.type_bien || "Non spécifié"}
- Ville du bien : ${lead.ville_bien || "Non spécifiée"} (Code postal : ${lead.code_postal || "Non spécifié"})
- Surface : ${lead.surface ? `${lead.surface} m²` : "Non spécifiée"}
- Nombre de pièces : ${lead.nb_pieces || "Non spécifié"}
- Statut actuel : ${lead.statut}
- Score de qualification actuel : ${lead.score_qualification || 0}/100

INSTRUCTIONS DE RÉPONSE :
1. Réponds au prospect en respectant scrupuleusement le ton "${agentTone}".
2. Si le prospect souhaite échanger par téléphone ou a un doute, rappelle les coordonnées directes de ${agentDisplayName}.
3. Si le bien se situe hors de la zone d'intervention (${agentZone}), indique avec courtoisie la zone couverte par ${agentDisplayName}.
4. Analyse les réponses du prospect pour évaluer l'avancement du projet, détecter s'il s'agit d'un lead chaud et extraire les informations clés.`;

    // 6. Call Google Gemini API (gemini-2.5-flash) with Native JSON Schema
    let assistantReply = "";
    let qualificationScore = lead.score_qualification || 0;
    let detectedStatus = lead.statut || "en_conversation";
    let isHotLead = false;
    let isConversationFinished = false;
    let extractedData: Record<string, any> = {};

    if (geminiApiKey) {
      // Format messages for Gemini contents API (roles: 'user' / 'model')
      const geminiContents = messagesList.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      // If no messages yet, trigger initial greeting
      if (geminiContents.length === 0) {
        geminiContents.push({
          role: "user",
          parts: [{ text: "Bonjour, je souhaite estimer et qualifier mon bien immobilier." }],
        });
      }

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: dynamicSystemPrompt }],
            },
            contents: geminiContents,
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "object",
                properties: {
                  message_a_afficher: { type: "string" },
                  score_qualification: { type: "integer" },
                  lead_chaud: { type: "boolean" },
                  conversation_terminee: { type: "boolean" },
                  donnees_extraites: {
                    type: "object",
                    properties: {
                      motif_vente: { type: "string", nullable: true },
                      delai: { type: "string", nullable: true },
                      prix_envisage: { type: "string", nullable: true },
                      disponibilite: { type: "string", nullable: true },
                    },
                  },
                },
                required: [
                  "message_a_afficher",
                  "score_qualification",
                  "lead_chaud",
                  "conversation_terminee",
                ],
              },
            },
          }),
        }
      );

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const rawJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        try {
          const parsed = JSON.parse(rawJsonText);
          assistantReply = parsed.message_a_afficher || rawJsonText;
          qualificationScore = typeof parsed.score_qualification === "number" ? parsed.score_qualification : qualificationScore;
          isHotLead = Boolean(parsed.lead_chaud);
          isConversationFinished = Boolean(parsed.conversation_terminee);
          extractedData = parsed.donnees_extraites || {};

          // Dynamic Status transition based on qualification and heat
          if (lead.statut === "rdv_pris") {
            detectedStatus = "rdv_pris";
          } else if (isHotLead || qualificationScore >= 70) {
            detectedStatus = "qualifie";
          } else if (isConversationFinished && qualificationScore < 40) {
            detectedStatus = "perdu";
          } else {
            detectedStatus = "en_conversation";
          }
        } catch (parseError) {
          console.error("Error parsing Gemini JSON response:", parseError, rawJsonText);
          assistantReply = rawJsonText;
        }
      } else {
        const errorText = await geminiResponse.text();
        console.error("Gemini API error:", errorText);
        assistantReply = `Bonjour ! ${agentDisplayName} et son équipe ont bien reçu votre demande concernant votre bien à ${lead.ville_bien || agentCity}. Nous pouvons organiser une visite de découverte sans engagement pour affiner votre estimation.`;
      }
    } else {
      // Graceful fallback when GEMINI_API_KEY is not yet set in environment
      assistantReply = scriptConfig.welcome_template || `Bonjour ! Je suis l'assistant de qualification de ${agentDisplayName}. Nous sommes à votre écoute pour valoriser votre bien à ${lead.ville_bien || agentCity}.`;
      qualificationScore = Math.max(lead.score_qualification || 0, 45);
      detectedStatus = "en_conversation";
    }

    // 7. Save Assistant message to conversation history
    messagesList.push({
      role: "assistant",
      content: assistantReply,
      timestamp: new Date().toISOString(),
    });

    if (convData) {
      await supabase
        .from("conversations")
        .update({
          messages: messagesList,
          updated_at: new Date().toISOString(),
        })
        .eq("id", convData.id);
    } else {
      await supabase.from("conversations").insert({
        lead_id: lead_id,
        messages: messagesList,
      });
    }

    // 8. Update Lead score, status & any detected fields in `leads` table
    const leadUpdates: any = {
      score_qualification: qualificationScore,
      statut: detectedStatus,
      updated_at: new Date().toISOString(),
    };

    await supabase.from("leads").update(leadUpdates).eq("id", lead_id);

    // 9. Return structured response
    return new Response(
      JSON.stringify({
        success: true,
        lead_id,
        agent: {
          id: agent.id,
          nom: agent.nom,
          ville: agent.ville,
          cal_username: agent.cal_username,
        },
        message_a_afficher: assistantReply,
        score_qualification: qualificationScore,
        lead_chaud: isHotLead,
        conversation_terminee: isConversationFinished,
        donnees_extraites: extractedData,
        statut: detectedStatus,
        cal_username: agent.cal_username,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in qualify-lead function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
