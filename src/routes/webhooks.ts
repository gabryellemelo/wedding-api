import express, { Request, Response } from 'express';
import { getPaymentByAsaasId, updatePaymentStatus } from '../services/supabaseService';
import { AsaasPayment, PaymentStatus } from '../types';

const router = express.Router();

const DEFAULT_EVENT = 'PAYMENT_CREATED';

interface WebhookRequestBody {
  event?: string;
  payment?: AsaasPayment;
  id?: string;
  status?: PaymentStatus;
  paymentDate?: string | null;
  value?: number | null;
}

function extractPaymentData(webhookData: WebhookRequestBody): { payment: AsaasPayment | null; event: string } {
  if (webhookData.payment && webhookData.payment.id) {
    return {
      payment: webhookData.payment as AsaasPayment,
      event: webhookData.event || DEFAULT_EVENT
    };
  }

  if (webhookData.id) {
    return {
      payment: webhookData as unknown as AsaasPayment,
      event: webhookData.event || DEFAULT_EVENT
    };
  }

  return { payment: null, event: webhookData.event || DEFAULT_EVENT };
}

function isValidPaymentStatus(status: string | undefined): status is PaymentStatus {
  if (!status) return false;
  const validStatuses: PaymentStatus[] = [
    'PENDING',
    'CONFIRMED',
    'RECEIVED',
    'OVERDUE',
    'REFUNDED',
    'RECEIVED_IN_CASH_UNDONE',
    'CHARGEBACK_REQUESTED',
    'CHARGEBACK_DISPUTE',
    'AWAITING_CHARGEBACK_REVERSAL',
    'DUNNING_REQUESTED',
    'DUNNING_RECEIVED',
    'AWAITING_RISK_ANALYSIS'
  ];
  return validStatuses.includes(status as PaymentStatus);
}

router.post('/asaas', async (req: Request<{}, {}, WebhookRequestBody>, res: Response) => {
  try {
    const webhookData = req.body;
    const { payment, event } = extractPaymentData(webhookData);

    if (!payment || !payment.id) {
      console.log('Webhook recebido sem dados de pagamento:', webhookData);
      return res.status(200).json({
        received: true,
        message: 'Webhook recebido mas sem dados de pagamento'
      });
    }

    const asaasPaymentId = payment.id;
    const status = payment.status;

    if (!isValidPaymentStatus(status)) {
      console.warn(`Status inválido recebido no webhook: ${status}`);
      return res.status(200).json({
        received: true,
        message: 'Status de pagamento inválido'
      });
    }

    const paymentDate = payment.paymentDate || null;
    const value = payment.value || null;

    console.log(`Webhook recebido - Evento: ${event}, Pagamento: ${asaasPaymentId}, Status: ${status}`);

    const existingPayment = await getPaymentByAsaasId(asaasPaymentId);

    if (!existingPayment) {
      console.log(`Pagamento ${asaasPaymentId} não encontrado no banco. Ignorando webhook.`);
      return res.status(200).json({
        received: true,
        message: 'Pagamento não encontrado no banco'
      });
    }

    await updatePaymentStatus(
      asaasPaymentId,
      status,
      {
        paymentDate: paymentDate || undefined,
        value: value || undefined
      }
    );

    console.log(`Status do pagamento ${asaasPaymentId} atualizado para: ${status}`);

    return res.status(200).json({
      received: true,
      paymentId: asaasPaymentId,
      status: status,
      event: event
    });

  } catch (error) {
    console.error('Erro ao processar webhook do Asaas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(200).json({
      received: true,
      error: errorMessage
    });
  }
});

export default router;

