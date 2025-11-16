const express = require('express');
const router = express.Router();
const asaasService = require('../services/asaasService');
const supabaseService = require('../services/supabaseService');
const giftsService = require('../services/giftsService');
const installmentService = require('../services/installmentService');

/**
 * POST /api/payments
 * Cria uma cobrança com cartão de crédito no Asaas e persiste no Supabase
 */
router.post('/', async (req, res) => {
  try {
    const {
      customer,
      value,
      description,
      creditCard,
      creditCardHolderInfo,
      giftId,
      installments,
      interestRate
    } = req.body;

    // Validação básica
    if (!customer || !customer.name || !customer.email || !customer.cpfCnpj) {
      return res.status(400).json({
        error: 'Dados do cliente são obrigatórios (name, email, cpfCnpj)'
      });
    }

    // Valida se o presente existe (se fornecido)
    let gift = null;
    if (giftId) {
      gift = await giftsService.getGiftById(giftId);
      if (!gift) {
        return res.status(400).json({
          error: 'Presente não encontrado'
        });
      }
    }

    // Usa o valor do presente se fornecido, senão usa o value do request
    const paymentValue = gift ? gift.price : value;

    if (!paymentValue || paymentValue <= 0) {
      return res.status(400).json({
        error: 'Valor do pagamento deve ser maior que zero'
      });
    }

    if (!creditCard || !creditCard.holderName || !creditCard.number || 
        !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) {
      return res.status(400).json({
        error: 'Dados do cartão de crédito são obrigatórios'
      });
    }

    if (!creditCardHolderInfo || !creditCardHolderInfo.name || !creditCardHolderInfo.email ||
        !creditCardHolderInfo.cpfCnpj || !creditCardHolderInfo.postalCode) {
      return res.status(400).json({
        error: 'Dados do portador do cartão são obrigatórios'
      });
    }

    // Monta descrição incluindo nome do presente se fornecido
    const paymentDescription = gift 
      ? `${description || 'Pagamento de casamento'} - Presente: ${gift.name}`
      : (description || 'Pagamento de casamento');

    // Calcula parcelamento com juros se fornecido
    let installmentInfo = null;
    let finalValue = paymentValue;
    let installmentValue = null;

    if (installments && installments > 1) {
      const calculatedInstallments = installmentService.calculateInstallments(
        paymentValue,
        installments,
        interestRate || 0
      );
      
      installmentInfo = calculatedInstallments;
      finalValue = calculatedInstallments.totalWithInterest;
      installmentValue = calculatedInstallments.installmentValue;
    }

    // Cria pagamento no Asaas
    const asaasPayment = await asaasService.createCreditCardPayment({
      customer,
      value: finalValue, // Usa o valor com juros se houver parcelamento
      description: paymentDescription,
      creditCard,
      creditCardHolderInfo,
      installments: installments || 1,
      installmentValue: installmentValue
    });

    // Salva pagamento no Supabase
    const savedPayment = await supabaseService.savePayment({
      asaasPaymentId: asaasPayment.id,
      customerName: customer.name,
      customerEmail: customer.email,
      value: asaasPayment.value || paymentValue,
      status: asaasPayment.status || 'PENDING',
      billingType: asaasPayment.billingType || 'CREDIT_CARD',
      description: asaasPayment.description || paymentDescription,
      giftId: giftId || null
    });

    // Retorna resposta formatada
    const response = {
      id: asaasPayment.id,
      status: asaasPayment.status,
      value: asaasPayment.value,
      paymentDate: asaasPayment.paymentDate || null,
      invoiceUrl: asaasPayment.invoiceUrl || null,
      transactionReceiptUrl: asaasPayment.transactionReceiptUrl || null,
      customer: {
        name: customer.name,
        email: customer.email
      },
      gift: gift ? {
        id: gift.id,
        name: gift.name,
        price: gift.price,
        image_url: gift.image_url || null
      } : null,
      localId: savedPayment.id
    };

    // Adiciona informações de parcelamento se houver
    if (installmentInfo) {
      response.installments = {
        count: installmentInfo.installments,
        installmentValue: installmentInfo.installmentValue,
        totalValue: installmentInfo.totalValue,
        totalWithInterest: installmentInfo.totalWithInterest,
        totalInterest: installmentInfo.totalInterest,
        interestRate: installmentInfo.interestRate,
        installmentsList: installmentInfo.installmentsList
      };
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    res.status(500).json({
      error: error.message || 'Erro interno do servidor'
    });
  }
});

module.exports = router;
