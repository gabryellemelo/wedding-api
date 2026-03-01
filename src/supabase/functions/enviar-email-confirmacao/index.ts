// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PaymentEmail = {
  id: string;
  customer_name: string;
  customer_email: string;
  value: number;
  status: string;
  description: string | null;
  gift_id: string | null;
  quantity: number | null;
  gift_name_snapshot: string | null;
  gift_price_snapshot: number | null;
  gifts: { name: string } | null;
};

function buildWeddingConfirmationEmail(payment: PaymentEmail): { subject: string; html: string; text: string } {
  const valorFormatado = Number(payment.value).toFixed(2).replace(".", ",");
  const giftInfo = payment.gift_name_snapshot ?? payment.gifts?.name
    ? `Presente: ${payment.gifts.name}`
    : (payment.description || "Contribuição");

  const subject = "Seu pagamento foi confirmado";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
  <p>Olá, <strong>${payment.customer_name}</strong>!</p>
  <p>Seu pagamento foi confirmado com sucesso.</p>
  <h3 style="margin-top: 1.5em;">Resumo</h3>
  <ul style="list-style: none; padding: 0;">
    <li><strong>Descrição:</strong> ${giftInfo}</li>
    <li><strong>Valor:</strong> R$ ${valorFormatado}</li>
  </ul>
  <p style="margin-top: 1.5em;">Obrigado por fazer parte deste momento especial.</p>
  <p style="margin-top: 1.5em; color: #666; font-size: 0.9em;">Este e-mail é apenas informativo. Não responda a esta mensagem.</p>
</body>
</html>
`.trim();

  const text = [
    `Olá, ${payment.customer_name}!`,
    "",
    "Seu pagamento foi confirmado com sucesso.",
    "",
    "Resumo:",
    `- Descrição: ${giftInfo}`,
    `- Valor: R$ ${valorFormatado}`,
    "",
    "Obrigado por fazer parte deste momento especial.",
    "",
    "Este e-mail é apenas informativo. Não responda a esta mensagem.",
  ].join("\n");

  return { subject, html, text };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const volunteersUrl = Deno.env.get("VOLUNTEERS_URL");
    const volunteersKey = Deno.env.get("VOLUNTEERS_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: "Configuração do servidor incompleta" }, 500);
    }

    let body: { payment_id?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Body JSON inválido" }, 400);
    }

    const paymentId = body?.payment_id;
    if (!paymentId || typeof paymentId !== "string") {
      return jsonResponse({ error: "payment_id é obrigatório" }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("id, customer_name, customer_email, value, status, description, gift_id, quantity, gift_name_snapshot, gift_price_snapshot, gifts(name)")
      .eq("id", paymentId)
      .single();

    if (fetchError || !payment) {
      return jsonResponse({ error: "Pagamento não encontrado" }, 404);
    }

    if (payment.status !== "RECEIVED") {
      return jsonResponse({ error: "Pagamento ainda não está confirmado" }, 400);
    }

    if (!volunteersUrl || !volunteersKey) {
      console.log("VOLUNTEERS_URL/VOLUNTEERS_KEY not set; skipping email send");
      return jsonResponse({ ok: false, message: "E-mail não configurado" }, 200);
    }

    const { subject, html, text } = buildWeddingConfirmationEmail(payment as PaymentEmail);

    const sendMailResponse = await fetch(`${volunteersUrl}/functions/v1/send-mail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${volunteersKey}`,
      },
      body: JSON.stringify({
        to: payment.customer_email,
        subject,
        html,
        text,
      }),
    });

    const sendMailResult = (await sendMailResponse.json().catch(() => ({}))) as { message?: string; error?: string };

    if (!sendMailResponse.ok) {
      const msg = sendMailResult?.message ?? sendMailResult?.error ?? sendMailResponse.statusText;
      console.error("Send mail failed:", msg);
      return jsonResponse({ error: "Falha ao enviar e-mail", details: msg }, 500);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error("Error in enviar-email-confirmacao:", err);
    return jsonResponse({ error: "Erro interno ao processar envio" }, 500);
  }
});

function jsonResponse(data: object, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
