import crypto from 'crypto';
import { supabaseStorage } from '../config/database';

const STATUS_MAP: Record<string, string> = {
  approved: 'RECEIVED',
  authorized: 'PENDING',
  in_process: 'PENDING',
  pending: 'PENDING',
  in_mediation: 'PENDING',
  rejected: 'PENDING',
  cancelled: 'PENDING',
  refunded: 'REFUNDED',
  charged_back: 'REFUNDED',
};
const DEFAULT_STATUS = 'PENDING';

function mapStatus(status: string | null | undefined): string {
  if (!status) return DEFAULT_STATUS;
  return STATUS_MAP[status] ?? DEFAULT_STATUS;
}

export interface MercadoPagoWebhookPayload {
  id?: number;
  type?: string;
  data?: { id?: string };
  action?: string;
}

/**
 * Verifica a assinatura do header x-signature do Mercado Pago.
 * Formato: ts=1234567890,v1=hexhmac
 * Template: id:[data.id];request-id:[x-request-id];ts:[ts];
 */
export function verifyWebhookSignature(
  payload: MercadoPagoWebhookPayload,
  xSignature: string | undefined,
  xRequestId: string | undefined,
  secret: string | undefined
): boolean {
  if (!secret || !xSignature) return false;
  const parts = xSignature.split(',');
  const tsPart = parts.find((p) => p.startsWith('ts='));
  const v1Part = parts.find((p) => p.startsWith('v1='));
  if (!tsPart || !v1Part) return false;
  const ts = tsPart.replace('ts=', '');
  const receivedV1 = v1Part.replace('v1=', '');
  const dataId = payload.data?.id ?? '';
  const idLower = typeof dataId === 'string' ? dataId.toLowerCase() : String(dataId);
  const template = `id:${idLower};request-id:${xRequestId ?? ''};ts:${ts};`;
  const expectedV1 = crypto.createHmac('sha256', secret).update(template).digest('hex');
  const receivedBuf = Buffer.from(receivedV1, 'hex');
  const expectedBuf = Buffer.from(expectedV1, 'hex');
  if (receivedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(receivedBuf, expectedBuf);
}

/**
 * Processa a notificação de pagamento do Mercado Pago: busca dados na API do MP,
 * atualiza o pagamento no Supabase e dispara e-mail de confirmação se aprovado.
 */
export async function processMercadoPagoPaymentNotification(
  mpPaymentId: string
): Promise<{ ok: boolean; updated?: boolean; error?: string }> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!token || !supabaseUrl || !supabaseKey) {
    console.error('Webhook MP: falta MERCADOPAGO_ACCESS_TOKEN, SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
    return { ok: true }; // retorna OK para o MP não ficar reenviando
  }

  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!mpResponse.ok) {
    const errText = await mpResponse.text();
    console.error('Webhook MP: falha ao buscar pagamento no MP', errText);
    return { ok: true };
  }

  const payment = (await mpResponse.json()) as {
    external_reference?: string;
    status?: string;
    payment_method_id?: string;
    point_of_interaction?: { transaction_data?: Record<string, unknown> };
  };

  const externalReference = payment.external_reference;
  if (!externalReference) {
    console.log('Webhook MP: pagamento sem external_reference');
    return { ok: true };
  }

  const newStatus = mapStatus(payment.status);
  const billingType =
    payment.payment_method_id?.toLowerCase() === 'pix' ? 'PIX' : 'CREDIT_CARD';

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    gateway_payment_id: mpPaymentId.toString(),
    billing_type: billingType,
    updated_at: new Date().toISOString(),
  };

  if (payment.status === 'approved') {
    (updatePayload as Record<string, unknown>).payment_date = new Date().toISOString();
  }

  if (
    payment.payment_method_id === 'pix' &&
    payment.point_of_interaction?.transaction_data
  ) {
    const td = payment.point_of_interaction.transaction_data;
    (updatePayload as Record<string, unknown>).pix_copy_paste = td.qr_code ?? null;
    (updatePayload as Record<string, unknown>).pix_qr_base64 = td.qr_code_base64 ?? null;
    (updatePayload as Record<string, unknown>).pix_expires_at = td.expiration_date
      ? new Date(td.expiration_date as string).toISOString()
      : null;
  }

  const { error } = await supabaseStorage
    .from('payments')
    .update(updatePayload)
    .eq('id', externalReference);

  if (error) {
    console.error('Webhook MP: erro ao atualizar pagamento', error);
    return { ok: true };
  }

  console.log('Webhook MP: pagamento atualizado', externalReference, '->', newStatus);

  if (newStatus === 'RECEIVED') {
    try {
      const emailRes = await fetch(`${supabaseUrl}/functions/v1/enviar-email-confirmacao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ payment_id: externalReference }),
      });
      if (!emailRes.ok) {
        console.error('Webhook MP: falha ao disparar e-mail', await emailRes.text());
      }
    } catch (e) {
      console.error('Webhook MP: erro ao chamar enviar-email-confirmacao', e);
    }
  }

  return { ok: true, updated: true };
}
