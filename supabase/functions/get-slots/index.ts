import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cal-api-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const start = url.searchParams.get("start") || new Date().toISOString();
    const end = url.searchParams.get("end") || new Date(Date.now() + 30 * 86400000).toISOString();
    let username = url.searchParams.get("username") || null;
    let eventTypeSlug = url.searchParams.get("eventTypeSlug") || null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const calApiKey = Deno.env.get("CAL_API_KEY") ?? "";

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: agent } = await supabase
          .from("agents")
          .select("cal_username, cal_event_slug")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (agent?.cal_username && !agent.cal_username.includes("[à compléter")) {
          username = agent.cal_username;
        }
        if (agent?.cal_event_slug) {
          eventTypeSlug = agent.cal_event_slug;
        }
      } catch (e) {
        console.warn("Failed retrieving agent for slots query:", e);
      }
    }

    if (calApiKey) {
      try {
        const calSlotsUrl = `https://api.cal.com/v2/slots?eventTypeSlug=${encodeURIComponent(eventTypeSlug)}&username=${encodeURIComponent(username)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
        
        const calRes = await fetch(calSlotsUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${calApiKey}`,
            "cal-api-version": "2024-08-13",
          },
        });

        if (calRes.ok) {
          const calData = await calRes.json();
          return new Response(
            JSON.stringify({
              success: true,
              slots: calData.data?.slots || calData.slots || {},
              source: "cal.com",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          const errText = await calRes.text();
          console.warn("Cal.com slots error:", errText);
        }
      } catch (calErr: any) {
        console.warn("Error fetching slots from Cal.com:", calErr);
      }
    }

    // Fallback standard slots if Cal API key not yet set or during network offline
    const fallbackSlots: Record<string, string[]> = {};
    const base = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      if (d.getDay() === 0) continue; // Skip Sunday
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      fallbackSlots[dateKey] = ["09:30", "11:00", "14:30", "16:00", "18:15"];
    }

    return new Response(
      JSON.stringify({
        success: true,
        slots: fallbackSlots,
        source: "fallback",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
