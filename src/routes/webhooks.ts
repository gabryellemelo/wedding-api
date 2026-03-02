import express, { Request, Response } from 'express';
import {
  processMercadoPagoPaymentNotification,
  verifyWebhookSignature,
  type MercadoPagoWebhookPayload,
} from '../services/mercadopagoWebhookService';

const router = express.Router();

/**
 * Webhook do Mercado Pago (Pagamentos).
 * Configure no painel: Suas integrações > Webhooks > URL = https://SEU_DOMINIO/api/webhooks/mercadopago
 * Evento: "Pagamentos". Opcional: assinatura secreta (MERCADOPAGO_WEBHOOK_SECRET).
 */
router.post('/mercadopago', async (req: Request, res: Response) => {
  try {
    const payload = req.body as MercadoPagoWebhookPayload;
    const xSignature = req.headers['x-signature'] as string | undefined;
    const xRequestId = req.headers['x-request-id'] as string | undefined;
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

    if (secret && !verifyWebhookSignature(payload, xSignature, xRequestId, secret)) {
      console.warn('Webhook MP: assinatura inválida ou ausente');
      return res.status(401).send('Invalid signature');
    }

    if (payload.type !== 'payment' || !payload.data?.id) {
      return res.status(200).send('OK');
    }

    await processMercadoPagoPaymentNotification(String(payload.data.id));
    return res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook MP: erro', err);
    return res.status(200).send('OK');
  }
});

/**
 * Info e documentação dos webhooks.
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Webhooks de pagamento (Mercado Pago)',
    webhook_url: '/api/webhooks/mercadopago',
    config: 'No painel do Mercado Pago: Webhooks > URL = sua API + /api/webhooks/mercadopago. Evento: Pagamentos.',
  });
});

export default router;
