import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { phone, message } = await req.json()
  
  // Example WhatsApp API call
  return new Response(JSON.stringify({ success: true, message: "Notification sent" }), { headers: { "Content-Type": "application/json" } });
})
