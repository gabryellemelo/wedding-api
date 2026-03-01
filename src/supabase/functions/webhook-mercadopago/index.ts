// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mercado Pago status -> payments.status (API wedding)
const STATUS_MAP: Record<string, string> = {
  approved: "RECEIVED",
  authorized: "PENDING",
  in_process: "PENDING",
  pending: "PENDING",
  in_mediation: "PENDING",
  rejected: "PENDING",
  cancelled: "PENDING",
  refunded: "REFUNDED",
  charged_back: "REFUNDED",
};
const DEFAULT_STATUS = "PENDING";

function mapStatus(status: string | null | undefined): string {
  if (!status) return DEFAULT_STATUS;
  return STATUS_MAP[status] ?? DEFAULT_STATUS;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as { type?: string; data?: { id?: string } };
    console.log("Webhook received:", payload?.type, payload?.data?.id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    if (!supabaseUrl || !supabaseKey || !mercadoPagoToken) {
      console.error("Missing environment configuration");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    if (payload.type !== "payment" || !payload.data?.id) {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const mpPaymentId = payload.data.id;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
      headers: {
        Authorization: `Bearer ${mercadoPagoToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error("Failed to fetch payment from MercadoPago", errText);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const payment = (await mpResponse.json()) as {
      external_reference?: string;
      status?: string;
      payment_method_id?: string;
      point_of_interaction?: { transaction_data?: Record<string, unknown> };
    };

    const externalReference = payment.external_reference;
    if (!externalReference) {
      console.log("No external_reference in payment");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const newStatus = mapStatus(payment.status);
    const billingType = payment.payment_method_id?.toLowerCase() === "pix" ? "PIX" : "CREDIT_CARD";

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      gateway_payment_id: mpPaymentId.toString(),
      billing_type: billingType,
      updated_at: new Date().toISOString(),
    };

    if (payment.status === "approved") {
      updatePayload.payment_date = new Date().toISOString();
    }

    if (payment.payment_method_id === "pix" && payment.point_of_interaction?.transaction_data) {
      const td = payment.point_of_interaction.transaction_data;
      updatePayload.pix_copy_paste = td.qr_code ?? null;
      updatePayload.pix_qr_base64 = td.qr_code_base64 ?? null;
      updatePayload.pix_expires_at = td.expiration_date
        ? new Date(td.expiration_date as string).toISOString()
        : null;
    }

    const { error } = await supabase
      .from("payments")
      .update(updatePayload)
      .eq("id", externalReference);

    if (error) {
      console.error("Error updating payment:", error);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log("Payment updated:", externalReference, "->", newStatus);

    if (newStatus === "RECEIVED") {
      try {
        const emailRes = await fetch(`${supabaseUrl}/functions/v1/enviar-email-confirmacao`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ payment_id: externalReference }),
        });
        if (!emailRes.ok) {
          console.error("Failed to trigger confirmation email:", await emailRes.text());
        }
      } catch (e) {
        console.error("Error calling enviar-email-confirmacao:", e);
      }
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Error in webhook-mercadopago:", error);
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});
