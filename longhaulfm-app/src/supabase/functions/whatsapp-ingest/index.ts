import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS for local testing
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()

    // Evolution API sends a 'messages.upsert' event
    // We only care about text messages for the feed
    const message = payload.data?.message
    const sender = payload.data?.pushName || "Unknown Driver"
    const text = message?.conversation || message?.extendedTextMessage?.text

    if (text) {
      const { error } = await supabase
        .from('whatsapp_logs')
        .insert([{
          sender_name: sender,
          sender_number: payload.data?.key?.remoteJid,
          message_content: text,
          group_id: payload.data?.key?.remoteJid,
          raw_payload: payload
        }])

      if (error) throw error
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})