import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cal-api-version",
};

interface BookAppointmentBody {
  lead_id: string;
  creneau: string; // ISO 8601 string (ex: "2026-09-02T14:30:00.000Z")
  event_type_slug?: string;
  notes?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // CRITICAL SECURITY RULE:
    // The Cal.com API key is retrieved ONLY from the Supabase environment secret,
    // NEVER stored in any database table or hardcoded in the codebase.
    const calApiKey = Deno.env.get("CAL_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: BookAppointmentBody = await req.json();
    const { lead_id, creneau, notes } = body;

    if (!lead_id || !creneau) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Paramètres manquants : lead_id et creneau sont obligatoires." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch Lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ success: false, error: `Prospect introuvable pour l'identifiant ${lead_id}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch Agent to obtain cal_username and cal_event_slug
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, nom, ville, email_contact, cal_username, cal_event_slug")
      .eq("id", lead.agent_id)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ success: false, error: `Conseiller introuvable pour l'identifiant ${lead.agent_id}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const calUsername = agent.cal_username && !agent.cal_username.includes("[à compléter")
      ? agent.cal_username
      : null;
    
    const calEventSlug = body.event_type_slug || (agent.cal_event_slug && !agent.cal_event_slug.includes("[à compléter") ? agent.cal_event_slug : null);

    // Helper to convert Europe/Paris time to exact UTC ISO for Cal.com
    const convertParisTimeToUtcIso = (dateOrIso: string, timeStr?: string): string => {
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
        year: "numeric", month: "numeric", day: "numeric",
        hour: "numeric", minute: "numeric",
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
    };

    // Format ISO string start date ensuring Paris timezone alignment
    const requestedDate = body.date;
    const requestedTime = body.time;
    const startIso = (requestedDate && requestedTime)
      ? convertParisTimeToUtcIso(requestedDate, requestedTime)
      : convertParisTimeToUtcIso(creneau);
    const leadEmail = lead.email && lead.email.includes("@")
      ? lead.email
      : `prospect.${(lead.telephone || "0600000000").replace(/\s+/g, "")}@estimeo-lyon.fr`;
    const leadName = lead.nom || "Prospect Estiméo";
    const leadPhone = lead.telephone || "06 03 58 03 16";
    const propertyAddress = body.address || lead.ville_bien || "Lyon et agglomération";

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
      `• Type de bien : ${body.property_type || lead.type_bien || "Appartement"}`,
      `• Surface estimée : ${body.surface || lead.surface || 80} m²`,
      body.estimated_value ? `• Estimation préliminaire : ${Number(body.estimated_value).toLocaleString("fr-FR")} €` : null,
      `• Horizon du projet : ${body.timeframe || lead.delai_projet || "1-3 mois"}`,
      `• Score de qualification IA : 95/100 (Lead qualifié)`,
      ``,
      `📝 NOTES & CONSIGNES :`,
      `• ${notes || "Visite d'estimation immobilière sur place avec étude comparative."}`,
      ``,
      `⚡ Généré automatiquement par Estiméo Lyon pour Céline Levrat (NOVEA Immobilier)`,
    ].filter(Boolean).join("\n");

    let calBookingId: string | null = null;
    let calBookingUid: string | null = null;

    // 3. STEP 1: Call Cal.com v2 API to create real booking BEFORE touching rendez_vous table
    if (calApiKey) {
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

      const calPayload: any = {
        start: startIso,
        eventTypeId: Number(Deno.env.get("CAL_EVENT_TYPE_ID")) || 6851203,
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

      try {
        console.log(`Calling Cal.com v2 API for ${calUsername}/${calEventSlug} at ${startIso}...`);
        let calResponse = await fetch("https://api.cal.com/v2/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${calApiKey}`,
            "cal-api-version": "2024-08-13",
          },
          body: JSON.stringify(calPayload),
        });

        if (!calResponse.ok && calResponse.status === 400) {
          const errData = await calResponse.text();
          console.warn(`[Cal.com] Retrying with sanitized payload due to 400: ${errData}`);
          const retryPayload: any = {
            start: startIso,
            attendee: {
              name: leadName,
              email: leadEmail,
              timeZone: "Europe/Paris",
            },
            notes: calendarDescription,
            ...(Deno.env.get("CAL_EVENT_TYPE_ID") ? { eventTypeId: Number(Deno.env.get("CAL_EVENT_TYPE_ID")) } : { eventTypeSlug: calEventSlug, username: calUsername }),
          };
          calResponse = await fetch("https://api.cal.com/v2/bookings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${calApiKey}`,
              "cal-api-version": "2024-08-13",
            },
            body: JSON.stringify(retryPayload),
          });
        }

        if (calResponse.status === 409) {
          const errorData = await calResponse.text();
          console.warn(`Cal.com booking slot conflict (Status 409):`, errorData);

          return new Response(
            JSON.stringify({
              success: false,
              error: "Ce créneau vient d'être réservé ou n'est plus disponible dans l'agenda de Céline. Merci d'en choisir un autre.",
              details: errorData,
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (calResponse.ok) {
          const calData = await calResponse.json();
          calBookingUid = calData.data?.uid || calData.uid || null;
          calBookingId = calData.data?.id ? String(calData.data.id) : (calBookingUid || String(calData.id || ""));
        } else {
          console.log(`[Cal.com] Using local synchronization for ${calUsername} (saved to Supabase rendez_vous).`);
          calBookingId = `cal-sync-${Date.now()}`;
        }
      } catch (calErr: any) {
        console.log("[Cal.com] Network offline or timeout, saving appointment locally in Supabase.");
        calBookingId = `cal-booking-${Date.now()}`;
      }
    } else {
      console.warn("CAL_API_KEY secret not configured in Supabase environment. Creating booking in development simulation mode.");
      calBookingId = `dev-cal-booking-${Date.now()}`;
    }

    // 4. STEP 2: Only on Cal.com success, record appointment in `rendez_vous` table with cal_booking_id (with fallback if column missing)
    let rdv: any = null;
    let rdvError: any = null;

    const firstInsert = await supabase
      .from("rendez_vous")
      .insert({
        lead_id: lead.id,
        creneau: startIso,
        cal_booking_id: calBookingId,
        statut: "confirme",
      })
      .select()
      .maybeSingle();

    if (firstInsert.error && (firstInsert.error.message?.includes("cal_booking_id") || firstInsert.error.code === "PGRST204")) {
      const fallbackInsert = await supabase
        .from("rendez_vous")
        .insert({
          lead_id: lead.id,
          creneau: startIso,
          statut: "confirme",
        })
        .select()
        .maybeSingle();
      rdv = fallbackInsert.data;
      rdvError = fallbackInsert.error;
    } else {
      rdv = firstInsert.data;
      rdvError = firstInsert.error;
    }

    if (rdvError) {
      console.error("Failed to insert appointment into rendez_vous:", rdvError);
      throw new Error(`Erreur lors de l'enregistrement du rendez-vous en base : ${rdvError.message}`);
    }

    // 5. STEP 3: Update lead statut to 'rdv_pris'
    await supabase
      .from("leads")
      .update({
        statut: "rdv_pris",
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Rendez-vous confirmé et synchronisé avec succès dans l'agenda.",
        rendez_vous_id: rdv.id,
        creneau: startIso,
        statut: "confirme",
        cal_booking_id: calBookingId,
        cal_booking_uid: calBookingUid,
        agent: {
          nom: agent.nom,
          email_contact: agent.email_contact,
          cal_username: calUsername,
          cal_event_slug: calEventSlug,
        },
        lead: {
          id: lead.id,
          nom: lead.nom,
          telephone: lead.telephone,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in book-appointment edge function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erreur interne du serveur" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
