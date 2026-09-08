import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { event_id } = await req.json();

    if (!event_id) throw new Error("Missing event_id");

    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('slots_dolcaina, slots_tabal')
      .eq('id', event_id)
      .single();

    if (eventError || !event) throw new Error("Event not found");

    const { data: candidates, error: candidatesError } = await supabaseClient
      .from('member_rotation_stats')
      .select('*');

    if (candidatesError || !candidates) throw new Error("Failed to fetch candidates");

    let finalLineup: any[] = [];
    let stateUpdates: any[] = [];

    const instruments = [
      { name: 'Dolçaina', slots: event.slots_dolcaina },
      { name: 'Tabal', slots: event.slots_tabal }
    ];

    for (const inst of instruments) {
      // Get all active members for this instrument
      let instCandidates = candidates.filter(c => c.instrument === inst.name);
      
      if (instCandidates.length === 0) continue;

      if (inst.slots === null || inst.slots >= instCandidates.length) {
        // Select all
        finalLineup.push(...instCandidates);
        // We could update last_selected_at, but we don't strictly need to modify weights if we take everyone
        for (const c of instCandidates) {
          stateUpdates.push({
            user_id: c.user_id,
            instrument: c.instrument,
            peso_acumulado: c.peso_acumulado,
            last_selected_at: new Date().toISOString()
          });
        }
      } else {
        // Smooth Weighted Round-Robin
        let selected = [];
        let currentPool = instCandidates.map(c => ({...c}));

        for (let i = 0; i < inst.slots; i++) {
          if (currentPool.length === 0) break;

          let totalScore = 0;
          for (let c of currentPool) {
            c.peso_acumulado += c.score;
            totalScore += c.score;
          }

          // Find max peso
          let maxCandidate = currentPool.reduce((prev, current) => (prev.peso_acumulado > current.peso_acumulado) ? prev : current);

          maxCandidate.peso_acumulado -= totalScore;
          
          selected.push(maxCandidate);
          currentPool = currentPool.filter(c => c.user_id !== maxCandidate.user_id);
        }

        finalLineup.push(...selected);

        // Update states for EVERYONE in the initial pool for this instrument
        // selected ones have their weight reduced. non-selected have their weight increased.
        let poolMap = new Map();
        for (let c of instCandidates) {
          poolMap.set(c.user_id, { ...c, isSelected: false });
        }

        for (let i = 0; i < inst.slots; i++) {
          let currentAvailable = Array.from(poolMap.values()).filter(c => !c.isSelected);
          if (currentAvailable.length === 0) break;

          let totalScore = 0;
          for (let c of currentAvailable) {
            c.peso_acumulado += c.score;
            totalScore += c.score;
          }

          let maxCandidate = currentAvailable.reduce((prev, current) => (prev.peso_acumulado > current.peso_acumulado) ? prev : current);
          maxCandidate.peso_acumulado -= totalScore;
          maxCandidate.isSelected = true;
        }

        for (let c of poolMap.values()) {
          stateUpdates.push({
            user_id: c.user_id,
            instrument: c.instrument,
            peso_acumulado: c.peso_acumulado,
            last_selected_at: c.isSelected ? new Date().toISOString() : null
          });
        }
      }
    }

    for (let update of stateUpdates) {
      const payload: any = {
        user_id: update.user_id,
        instrument: update.instrument,
        peso_acumulado: update.peso_acumulado,
      };
      if (update.last_selected_at) {
        payload.last_selected_at = update.last_selected_at;
      }
      
      await supabaseClient.from('rotation_state').upsert(payload, { onConflict: 'user_id, instrument' });
    }

    return new Response(JSON.stringify(finalLineup), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
