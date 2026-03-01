// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento status Mercado Pago -> status da API (payments.status)
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

function splitNome(nome: string): { first_name: string; last_name: string } {
  const partes = (nome || "").trim().split(" ");
  if (partes.length <= 1) {
    return { first_name: partes[0] || "N/A", last_name: partes[0] || "N/A" };
  }
  return {
    first_name: partes[0],
    last_name: partes.slice(1).join(" "),
  };
}

function sanitizePayloadForLog(payload: Record<string, unknown>): Record<string, unknown> {
  const out = { ...payload };
  if (out.token !== undefined) out.token = "[REDACTED]";
  if (out.payer && typeof out.payer === "object") {
    const p = out.payer as Record<string, unknown>;
    out.payer = { ...p };
    if (typeof (out.payer as Record<string, unknown>).email === "string")
      (out.payer as Record<string, unknown>).email = "***@***";
    const id = (out.payer as Record<string, unknown>).identification;
    if (id && typeof id === "object" && typeof (id as Record<string, unknown>).number === "string") {
      const num = (id as Record<string, unknown>).number as string;
      (out.payer as Record<string, unknown>).identification = {
        ...(id as Record<string, unknown>),
        number: num.length <= 4 ? "****" : "****" + num.slice(-4),
      };
    }
  }
  return out;
}

interface BodyPayload {
  payment_id: string; // UUID do registro em payments (external_reference)
  customer: { name: string; email: string; cpfCnpj: string; phone?: string };
  value: number;
  description?: string;
  gift_id?: string | null;
  message?: string | null;
  metodo_pagamento: "credit_card" | "pix";
  card_token?: string;
  payment_method_id?: string;
  cardholder_name?: string;
  cardholder_identification_type?: string;
  cardholder_identification_number?: string;
  payer_document_type?: string;
  payer_document_number?: string;
  ip_address?: string;
  installments?: number;
  quantity?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as BodyPayload;
    const {
      payment_id,
      customer,
      value,
      description,
      gift_id,
      message,
      metodo_pagamento,
      card_token,
      payment_method_id,
      cardholder_name,
      cardholder_identification_type,
      cardholder_identification_number,
      payer_document_type,
      payer_document_number,
      ip_address,
      installments = 1,
      quantity = 1,
    } = body;

    if (!payment_id) {
      return jsonResponse({ error: "payment_id é obrigatório" }, 400);
    }
    if (!metodo_pagamento || !["credit_card", "pix"].includes(metodo_pagamento)) {
      return jsonResponse({ error: "metodo_pagamento deve ser credit_card ou pix" }, 400);
    }
    if (!customer?.name || !customer?.email || !customer?.cpfCnpj) {
      return jsonResponse({ error: "customer (name, email, cpfCnpj) é obrigatório" }, 400);
    }
    if (value == null || Number(value) <= 0) {
      return jsonResponse({ error: "value deve ser maior que zero" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: "Configuração do servidor incompleta" }, 500);
    }
    if (!mercadoPagoToken) {
      return jsonResponse({ error: "Configuração de pagamento não disponível" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const quantityNum = Math.max(1, Math.floor(Number(quantity) || 1));
    const transactionAmount = Number(value);

    let giftSnapshot: { name: string; price: number } | null = null;
    if (gift_id) {
      const { data: gift, error: giftError } = await supabase
        .from("gifts")
        .select("id, name, price")
        .eq("id", gift_id)
        .single();
      if (giftError || !gift) {
        return jsonResponse({ error: "Presente não encontrado" }, 404);
      }
      giftSnapshot = { name: gift.name, price: Number(gift.price) };
    }

    const docType = payer_document_type ?? cardholder_identification_type ?? "CPF";
    const docNumber = payer_document_number ?? cardholder_identification_number;
    const cleanDoc = (customer.cpfCnpj || "").replace(/\D/g, "");
    const identificationNumber = docNumber || cleanDoc;
    if (!identificationNumber) {
      return jsonResponse({ error: "Documento do pagador é obrigatório" }, 400);
    }

    const phone = (customer.phone || "").replace(/\D/g, "");
    const areaCode = phone.length >= 2 ? phone.substring(0, 2) : "11";
    const phoneNumber = phone.length > 2 ? phone.substring(2) : "999999999";

    const { first_name, last_name } = splitNome(customer.name);
    const paymentDescription = description || "Presente de casamento";

    const isTestEnv = mercadoPagoToken.startsWith("TEST-");
    const testPayerEmail = isTestEnv ? Deno.env.get("MERCADOPAGO_TEST_PAYER_EMAIL")?.trim() : undefined;
    if (isTestEnv && !testPayerEmail && !customer.email.toLowerCase().endsWith("@testuser.com")) {
      return jsonResponse(
        {
          error:
            "Em ambiente de teste do Mercado Pago, use o e-mail de uma conta de teste (Comprador) ou configure MERCADOPAGO_TEST_PAYER_EMAIL na função. Crie contas em: Suas integrações > sua aplicação > Contas de teste.",
        },
        400
      );
    }
    const payerEmailForMP = isTestEnv && testPayerEmail ? testPayerEmail : customer.email;

    const basePayload = {
      transaction_amount: transactionAmount,
      description: paymentDescription,
      statement_descriptor: "CASAMENTO",
      external_reference: payment_id,
      notification_url: `${supabaseUrl}/functions/v1/webhook-mercadopago`,
      additional_info: {
        items: [
          {
            id: gift_id || "contribution",
            title: paymentDescription,
            description: message || paymentDescription,
            category_id: "gifts",
            quantity: quantityNum,
            unit_price: quantityNum > 1 ? transactionAmount / quantityNum : transactionAmount,
          },
        ],
      },
      payer: {
        entity_type: "individual",
        type: "customer",
        email: payerEmailForMP,
        first_name,
        last_name,
        identification: { type: docType, number: identificationNumber.replace(/\D/g, "") },
        phone: { area_code: areaCode, number: phoneNumber },
      },
    };

    let paymentPayload: Record<string, unknown> = { ...basePayload };
    if (metodo_pagamento === "credit_card") {
      if (!card_token) {
        return jsonResponse({ error: "Token do cartão é obrigatório para credit_card" }, 400);
      }
      if (!cardholder_name) {
        return jsonResponse({ error: "Nome do titular é obrigatório" }, 400);
      }
      paymentPayload = {
        ...basePayload,
        token: card_token,
        installments: Math.min(Math.max(Number(installments) || 1, 1), 12),
        binary_mode: true,
        payer: {
          ...basePayload.payer,
          ...splitNome(cardholder_name),
        },
      };
      if (payment_method_id) {
        paymentPayload.payment_method_id = payment_method_id;
      }
    } else {
      const expirationDate = new Date(Date.now() + 15 * 60 * 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      const y = expirationDate.getUTCFullYear();
      const M = pad(expirationDate.getUTCMonth() + 1);
      const d = pad(expirationDate.getUTCDate());
      const h = pad(expirationDate.getUTCHours());
      const m = pad(expirationDate.getUTCMinutes());
      const s = pad(expirationDate.getUTCSeconds());
      const dateOfExpiration = `${y}-${M}-${d}T${h}:${m}:${s}.000-03:00`;
      paymentPayload = {
        ...basePayload,
        payment_method_id: "pix",
        date_of_expiration: dateOfExpiration,
      };
    }
    if (ip_address) {
      paymentPayload.ip_address = ip_address;
    }

    const idempotencyKey = payment_id;
    const mpFetch = () =>
      fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mercadoPagoToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(paymentPayload),
      });

    let mpResponse = await mpFetch();
    if (!mpResponse.ok && mpResponse.status >= 500 && mpResponse.status < 600) {
      await new Promise((r) => setTimeout(r, 1500));
      mpResponse = await mpFetch();
    }

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      let mpError: { message?: string; cause?: unknown[]; status?: number } = {};
      try {
        mpError = JSON.parse(errorText) as typeof mpError;
      } catch {
        mpError = { message: errorText, cause: [], status: mpResponse.status };
      }
      console.error("MercadoPago API error:", errorText);
      console.error("Sanitized payload:", JSON.stringify(sanitizePayloadForLog(paymentPayload)));
      const status = mpResponse.status;
      const is500EmptyCause =
        status === 500 &&
        Array.isArray(mpError.cause) &&
        mpError.cause.length === 0 &&
        mpError.message === "internal_error";
      const isPayerEmailForbidden =
        status === 403 &&
        (mpError.message === "Payer email forbidden" ||
          (Array.isArray(mpError.cause) &&
            mpError.cause.some(
              (c: unknown) => typeof c === "object" && c !== null && (c as { code?: number }).code === 4390
            )));
      let friendlyMessage = "Erro ao processar pagamento";
      if (is500EmptyCause) {
        friendlyMessage =
          "Falha temporária no gateway de pagamento. Em ambiente de teste, use e-mail @testuser.com. Tente novamente em instantes.";
      } else if (isPayerEmailForbidden && isTestEnv) {
        friendlyMessage =
          "E-mail do pagador não permitido em teste. Configure o secret MERCADOPAGO_TEST_PAYER_EMAIL na Edge Function com o e-mail exato da conta Comprador (Suas integrações > Contas de teste). O e-mail é gerado pelo Mercado Pago ao criar a conta.";
      }
      return jsonResponse(
        {
          error: friendlyMessage,
          detalhe: errorText,
        },
        status >= 500 ? 502 : status
      );
    }

    const payment = (await mpResponse.json()) as {
      id?: number;
      status?: string;
      status_detail?: string;
      point_of_interaction?: { transaction_data?: Record<string, unknown> };
    };

    const status = mapStatus(payment.status);
    const billingType = metodo_pagamento === "pix" ? "PIX" : "CREDIT_CARD";

    const insertPayload: Record<string, unknown> = {
      id: payment_id,
      gateway_payment_id: payment.id?.toString() ?? null,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: phone || null,
      customer_document: identificationNumber.replace(/\D/g, "") || null,
      value: transactionAmount,
      status,
      billing_type: billingType,
      description: paymentDescription,
      gift_id: gift_id || null,
      quantity: quantityNum,
      gift_name_snapshot: giftSnapshot?.name ?? null,
      gift_price_snapshot: giftSnapshot?.price ?? null,
      message: message || null,
      payment_date: payment.status === "approved" ? new Date().toISOString() : null,
    };

    const transactionData = payment.point_of_interaction?.transaction_data as Record<string, unknown> | undefined;
    if (metodo_pagamento === "pix" && transactionData) {
      Object.assign(insertPayload, {
        pix_copy_paste: transactionData.qr_code ?? null,
        pix_qr_base64: transactionData.qr_code_base64 ?? null,
        pix_expires_at: transactionData.expiration_date
          ? new Date(transactionData.expiration_date as string).toISOString()
          : null,
      });
    }

    const { error: upsertError } = await supabase.from("payments").upsert(insertPayload, {
      onConflict: "id",
    });

    if (upsertError) {
      console.error("Error saving payment:", upsertError);
      return jsonResponse({ error: "Pagamento criado na gateway mas falha ao salvar localmente" }, 500);
    }

    const responseBody: Record<string, unknown> = {
      payment_id: payment_id,
      gateway_payment_id: payment.id,
      metodo_pagamento,
      status: payment.status,
      status_detail: payment.status_detail,
      status_mapped: status,
    };

    if (metodo_pagamento === "pix" && transactionData) {
      responseBody.pix = {
        qr_code: transactionData.qr_code ?? null,
        qr_code_base64: transactionData.qr_code_base64 ?? null,
        ticket_url: transactionData.ticket_url ?? null,
        copy_paste: transactionData.qr_code ?? null,
        expires_at: transactionData.expiration_date ?? null,
      };
    }

    return jsonResponse(responseBody, 200);
  } catch (error) {
    console.error("Error in processar-pagamento:", error);
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
