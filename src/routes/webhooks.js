const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');

/**
 * POST /api/webhooks/asaas
 * Recebe webhooks do Asaas com notificações de mudanças de status de pagamento
 */
router.post('/asaas', async (req, res) => {
  try {
    const webhookData = req.body;
    
    // O Asaas envia diferentes tipos de eventos
    // Eventos relacionados a pagamentos geralmente vêm no campo 'payment'
    const payment = webhookData.payment || webhookData;
    const event = webhookData.event || 'PAYMENT_CREATED';

    // Valida se é um evento de pagamento
    if (!payment || !payment.id) {
      console.log('Webhook recebido sem dados de pagamento:', webhookData);
      return res.status(200).json({ received: true, message: 'Webhook recebido mas sem dados de pagamento' });
    }

    const asaasPaymentId = payment.id;
    const status = payment.status;
    const paymentDate = payment.paymentDate || null;
    const value = payment.value || null;

    console.log(`Webhook recebido - Evento: ${event}, Pagamento: ${asaasPaymentId}, Status: ${status}`);

    // Busca o pagamento no Supabase pelo ID do Asaas
    const existingPayment = await supabaseService.getPaymentByAsaasId(asaasPaymentId);

    if (!existingPayment) {
      console.log(`Pagamento ${asaasPaymentId} não encontrado no banco. Ignorando webhook.`);
      // Retorna 200 para o Asaas não reenviar o webhook
      return res.status(200).json({ 
        received: true, 
        message: 'Pagamento não encontrado no banco' 
      });
    }

    // Atualiza o status no Supabase
    await supabaseService.updatePaymentStatus(
      asaasPaymentId,
      status,
      {
        paymentDate: paymentDate,
        value: value
      }
    );

    console.log(`Status do pagamento ${asaasPaymentId} atualizado para: ${status}`);

    // Retorna 200 para o Asaas saber que recebemos o webhook
    res.status(200).json({
      received: true,
      paymentId: asaasPaymentId,
      status: status,
      event: event
    });

  } catch (error) {
    console.error('Erro ao processar webhook do Asaas:', error);
    // Retorna 200 mesmo em caso de erro para evitar retentativas infinitas
    // Mas loga o erro para debug
    res.status(200).json({
      received: true,
      error: error.message
    });
  }
});

module.exports = router;
