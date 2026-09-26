import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { payment_id, order_id, signature } = await req.json()
  
  // Example verify logic
  const isValid = true; 

  if (isValid) {
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } else {
    return new Response(JSON.stringify({ success: false, error: "Invalid signature" }), { status: 400 });
  }
})
