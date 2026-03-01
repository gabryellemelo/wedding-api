import express, { Request, Response } from 'express';

const router = express.Router();

/**
 * Webhooks de pagamento são tratados pela Edge Function webhook-mercadopago no Supabase.
 * Configure a URL de notificação no painel do Mercado Pago:
 * https://PROJECT_REF.supabase.co/functions/v1/webhook-mercadopago
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Webhooks de pagamento (Mercado Pago) são processados pela Edge Function webhook-mercadopago.',
    config: 'Configure a URL no painel do Mercado Pago.',
  });
});

export default router;
