// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    let body: { payment_id?: string; gateway_payment_id?: string };
    try {
      body = (await req.json()) as { payment_id?: string; gateway_payment_id?: string };
    } catch {
      return jsonResponse({ error: "Body JSON inválido" }, 400);
    }

    const { payment_id, gateway_payment_id } = body;
    if (!payment_id && !gateway_payment_id) {
      return jsonResponse({ error: "Informe payment_id (UUID do pagamento) ou gateway_payment_id (ID Mercado Pago)" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    if (!supabaseUrl || !supabaseKey || !mercadoPagoToken) {
      return jsonResponse({ error: "Configuração do servidor incompleta" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let resolvedMpId: string | null = null;
    let localPayment: { id: string; gateway_payment_id?: string | null } | null = null;

    if (gateway_payment_id) {
      resolvedMpId = String(gateway_payment_id);
    } else if (payment_id) {
      const { data: row, error: rowError } = await supabase
        .from("payments")
        .select("id, gateway_payment_id")
        .eq("id", payment_id)
        .single();
      if (rowError || !row) {
        return jsonResponse({ error: "Pagamento não encontrado" }, 404);
      }
      localPayment = row;
      resolvedMpId = row.gateway_payment_id ?? null;
    }

    if (!resolvedMpId) {
      return jsonResponse({ error: "Pagamento ainda não foi registrado na gateway" }, 400);
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${resolvedMpId}`, {
      headers: { Authorization: `Bearer ${mercadoPagoToken}` },
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error("MercadoPago error:", errText);
      return jsonResponse({ error: "Não foi possível consultar o pagamento na gateway" }, 502);
    }

    const payment = (await mpResponse.json()) as {
      id?: number;
      status?: string;
      status_detail?: string;
      external_reference?: string;
      payment_method_id?: string;
      point_of_interaction?: { transaction_data?: Record<string, unknown> };
    };

    const statusMapped = mapStatus(payment.status);

    if (payment_id && localPayment) {
      const updatePayload: Record<string, unknown> = {
        status: statusMapped,
        gateway_payment_id: payment.id?.toString() ?? resolvedMpId,
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
      await supabase.from("payments").update(updatePayload).eq("id", payment_id);
    }

    const responseBody: Record<string, unknown> = {
      payment_id: localPayment?.id ?? payment.external_reference ?? null,
      gateway_payment_id: payment.id ?? resolvedMpId,
      status: payment.status,
      status_detail: payment.status_detail,
      status_mapped: statusMapped,
      metodo_pagamento: payment.payment_method_id,
    };

    if (payment.payment_method_id === "pix" && payment.point_of_interaction?.transaction_data) {
      const td = payment.point_of_interaction.transaction_data;
      responseBody.pix = {
        qr_code: td.qr_code ?? null,
        qr_code_base64: td.qr_code_base64 ?? null,
        ticket_url: td.ticket_url ?? null,
        copy_paste: td.qr_code ?? null,
        expires_at: td.expiration_date ?? null,
      };
    }

    return jsonResponse(responseBody, 200);
  } catch (error) {
    console.error("Error in consultar-pagamento:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return jsonResponse({ error: message }, 500);
  }
});

function jsonResponse(data: object, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
