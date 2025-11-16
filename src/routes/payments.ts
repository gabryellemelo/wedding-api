import express, { Request, Response } from 'express';
import {
  createCreditCardPayment,
  createPixPayment,
  getPixQrCode,
  getPaymentInstallments
} from '../services/asaasService';
import { savePayment, saveMultiplePayments } from '../services/supabaseService';
import { getGiftById } from '../services/giftsService';
import { calculateInstallments } from '../services/installmentService';
import {
  CreatePaymentRequest,
  PaymentResponse,
  Customer,
  CreditCard,
  CreditCardHolderInfo,
  BillingType,
  Gift,
  InstallmentInfo,
  SavePaymentData,
  PaymentStatus,
  AsaasPayment,
  AsaasPixQrCode
} from '../types';

const router = express.Router();

const INSTALLMENTS_WAIT_TIME = 1500;
const PIX_QRCODE_WAIT_TIME = 500;
const MIN_PAYMENT_VALUE = 0.01;

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateCustomer(customer: Customer | undefined): { valid: boolean; error?: string } {
  if (!customer) {
    return { valid: false, error: 'Dados do cliente são obrigatórios' };
  }

  if (!customer.name || typeof customer.name !== 'string' || !customer.name.trim()) {
    return { valid: false, error: 'Nome do cliente é obrigatório' };
  }

  if (!customer.email || typeof customer.email !== 'string' || !isValidEmail(customer.email)) {
    return { valid: false, error: 'Email do cliente é inválido' };
  }

  if (!customer.cpfCnpj || typeof customer.cpfCnpj !== 'string' || !customer.cpfCnpj.trim()) {
    return { valid: false, error: 'CPF/CNPJ do cliente é obrigatório' };
  }

  return { valid: true };
}

function validateCreditCard(creditCard: CreditCard | undefined): { valid: boolean; error?: string } {
  if (!creditCard) {
    return { valid: false, error: 'Dados do cartão de crédito são obrigatórios' };
  }

  const requiredFields = ['holderName', 'number', 'expiryMonth', 'expiryYear', 'ccv'];
  for (const field of requiredFields) {
    if (!creditCard[field as keyof CreditCard] || typeof creditCard[field as keyof CreditCard] !== 'string') {
      return { valid: false, error: `Campo ${field} do cartão é obrigatório` };
    }
  }

  return { valid: true };
}

function validateCreditCardHolder(holderInfo: CreditCardHolderInfo | undefined): { valid: boolean; error?: string } {
  if (!holderInfo) {
    return { valid: false, error: 'Dados do portador do cartão são obrigatórios' };
  }

  if (!holderInfo.name || typeof holderInfo.name !== 'string' || !holderInfo.name.trim()) {
    return { valid: false, error: 'Nome do portador é obrigatório' };
  }

  if (!holderInfo.email || typeof holderInfo.email !== 'string' || !isValidEmail(holderInfo.email)) {
    return { valid: false, error: 'Email do portador é inválido' };
  }

  if (!holderInfo.cpfCnpj || typeof holderInfo.cpfCnpj !== 'string' || !holderInfo.cpfCnpj.trim()) {
    return { valid: false, error: 'CPF/CNPJ do portador é obrigatório' };
  }

  if (!holderInfo.postalCode || typeof holderInfo.postalCode !== 'string' || !holderInfo.postalCode.trim()) {
    return { valid: false, error: 'CEP do portador é obrigatório' };
  }

  return { valid: true };
}

function formatPixQrCode(pixQrCode: AsaasPixQrCode, asaasPayment: AsaasPayment) {
  if (!pixQrCode || !pixQrCode.payload) {
    throw new Error('QR Code PIX não foi gerado. Verifique se a chave PIX está configurada no Asaas.');
  }

  const copyPaste = pixQrCode.payload.trim();

  if (!copyPaste.startsWith('000201')) {
    console.warn('Código PIX pode estar em formato incorreto:', copyPaste.substring(0, 50));
  }

  let encodedImage = pixQrCode.encodedImage || null;
  if (encodedImage && !encodedImage.startsWith('data:')) {
    encodedImage = `data:image/png;base64,${encodedImage}`;
  }

  return {
    qrCode: null,
    encodedImage: encodedImage,
    copyPaste: copyPaste,
    expirationDate: pixQrCode.expirationDate || asaasPayment.dueDate || null
  };
}

function createInstallmentPayments(
  installments: number,
  installmentsList: AsaasPayment[],
  asaasPayment: AsaasPayment,
  customer: Customer,
  installmentValue: number | null,
  finalValue: number,
  paymentDescription: string,
  giftId: string | undefined,
  message: string | undefined
): SavePaymentData[] {
  const paymentsToSave: SavePaymentData[] = [];

  for (let i = 0; i < installments; i++) {
    const foundInstallment = installmentsList.find((inst, idx) => {
      const instDesc = inst.description || '';
      const hasParcelaInfo = instDesc.includes(`Parcela ${i + 1}`) ||
        instDesc.includes(`${i + 1} de ${installments}`);

      return hasParcelaInfo || (idx === i && installmentsList.length === installments);
    });

    if (foundInstallment) {
      paymentsToSave.push({
        asaasPaymentId: foundInstallment.id,
        customerName: customer.name,
        customerEmail: customer.email,
        value: foundInstallment.value || installmentValue || (finalValue / installments),
        status: (foundInstallment.status || 'PENDING') as PaymentStatus,
        billingType: (foundInstallment.billingType || 'CREDIT_CARD') as BillingType,
        description: foundInstallment.description || `Parcela ${i + 1} de ${installments}. ${paymentDescription}`,
        giftId: giftId || null,
        message: message || null,
        paymentDate: foundInstallment.paymentDate || foundInstallment.dueDate || null
      });
    } else {
      paymentsToSave.push({
        asaasPaymentId: `${asaasPayment.id}_parcela_${i + 1}`,
        customerName: customer.name,
        customerEmail: customer.email,
        value: installmentValue || (finalValue / installments),
        status: 'PENDING' as PaymentStatus,
        billingType: 'CREDIT_CARD' as BillingType,
        description: `Parcela ${i + 1} de ${installments}. ${paymentDescription}`,
        giftId: giftId || null,
        message: message || null,
        paymentDate: null
      });
    }
  }

  return paymentsToSave;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      customer,
      value,
      description,
      billingType,
      creditCard,
      creditCardHolderInfo,
      giftId,
      installments,
      interestRate,
      message
    }: CreatePaymentRequest = req.body;

    const paymentType: BillingType = billingType || 'CREDIT_CARD';

    const customerValidation = validateCustomer(customer);
    if (!customerValidation.valid) {
      return res.status(400).json({
        error: customerValidation.error || 'Dados do cliente inválidos'
      });
    }

    let gift: Gift | null = null;
    if (giftId) {
      gift = await getGiftById(giftId);
      if (!gift) {
        return res.status(400).json({
          error: 'Presente não encontrado'
        });
      }
    }

    const paymentValue = gift ? gift.price : (value || 0);

    if (paymentValue < MIN_PAYMENT_VALUE) {
      return res.status(400).json({
        error: `Valor do pagamento deve ser maior ou igual a ${MIN_PAYMENT_VALUE}`
      });
    }

    if (paymentType === 'CREDIT_CARD') {
      const cardValidation = validateCreditCard(creditCard);
      if (!cardValidation.valid) {
        return res.status(400).json({
          error: cardValidation.error || 'Dados do cartão inválidos'
        });
      }

      const holderValidation = validateCreditCardHolder(creditCardHolderInfo);
      if (!holderValidation.valid) {
        return res.status(400).json({
          error: holderValidation.error || 'Dados do portador inválidos'
        });
      }
    }

    if (paymentType === 'PIX' && installments && installments > 1) {
      return res.status(400).json({
        error: 'PIX não suporta parcelamento. Use apenas para pagamento à vista.'
      });
    }

    const paymentDescription = gift
      ? `${description || 'Pagamento de casamento'} - Presente: ${gift.name}`
      : (description || 'Pagamento de casamento');

    let installmentInfo: InstallmentInfo | null = null;
    let finalValue = paymentValue;
    let installmentValue: number | null = null;

    if (paymentType === 'CREDIT_CARD' && installments && installments > 1) {
      const calculatedInstallments = calculateInstallments(
        paymentValue,
        installments,
        interestRate || 0
      );

      installmentInfo = calculatedInstallments;
      finalValue = calculatedInstallments.totalWithInterest;
      installmentValue = calculatedInstallments.installmentValue;
    }

    let asaasPayment: AsaasPayment;

    if (paymentType === 'PIX') {
      asaasPayment = await createPixPayment({
        customer: customer as Customer,
        value: paymentValue,
        description: paymentDescription
      });
    } else {
      asaasPayment = await createCreditCardPayment({
        customer: customer as Customer,
        value: finalValue,
        description: paymentDescription,
        creditCard: creditCard as CreditCard,
        creditCardHolderInfo: creditCardHolderInfo as CreditCardHolderInfo,
        installments: installments || 1,
        installmentValue: installmentValue || undefined
      });
    }

    let savedPayments: Array<{ id: string; asaas_payment_id: string; value: number; status: PaymentStatus; description: string }> = [];

    if (paymentType === 'CREDIT_CARD' && installments && installments > 1) {
      await new Promise(resolve => setTimeout(resolve, INSTALLMENTS_WAIT_TIME));

      const installmentsList = await getPaymentInstallments(asaasPayment.id);
      const paymentsToSave = createInstallmentPayments(
        installments,
        installmentsList,
        asaasPayment,
        customer as Customer,
        installmentValue,
        finalValue,
        paymentDescription,
        giftId,
        message
      );

      savedPayments = await saveMultiplePayments(paymentsToSave);
    } else {
      const savedPayment = await savePayment({
        asaasPaymentId: asaasPayment.id,
        customerName: customer.name,
        customerEmail: customer.email,
        value: asaasPayment.value || paymentValue,
        status: asaasPayment.status || 'PENDING',
        billingType: asaasPayment.billingType || paymentType,
        description: asaasPayment.description || paymentDescription,
        giftId: giftId || null,
        message: message || null,
        paymentDate: asaasPayment.paymentDate || null
      });
      savedPayments = [savedPayment];
    }

    const response: PaymentResponse = {
      id: asaasPayment.id,
      status: asaasPayment.status,
      value: asaasPayment.value,
      billingType: asaasPayment.billingType || paymentType,
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
      } : undefined,
      localId: savedPayments[0]?.id,
      savedPayments: savedPayments.map(p => ({
        id: p.id,
        asaasPaymentId: p.asaas_payment_id,
        value: p.value,
        status: p.status,
        description: p.description
      }))
    };

    if (paymentType === 'PIX') {
      try {
        await new Promise(resolve => setTimeout(resolve, PIX_QRCODE_WAIT_TIME));

        const pixQrCode = await getPixQrCode(asaasPayment.id);
        response.pix = formatPixQrCode(pixQrCode, asaasPayment);
      } catch (error) {
        console.error('Erro ao obter QR Code PIX:', error);
        const errorMessage = error instanceof Error ? error.message : 'Não foi possível obter o QR Code. Verifique se a chave PIX está configurada no Asaas.';
        response.pix = {
          qrCode: null,
          encodedImage: null,
          copyPaste: null,
          expirationDate: asaasPayment.dueDate || null,
          error: errorMessage
        };
      }
    }

    if (installmentInfo) {
      response.installments = installmentInfo;
    }

    return res.status(201).json(response);

  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return res.status(500).json({
      error: errorMessage
    });
  }
});

router.get('/:id/pix-qrcode', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        error: 'ID do pagamento é obrigatório'
      });
    }

    const pixQrCode = await getPixQrCode(id);

    let encodedImage = pixQrCode.encodedImage || null;
    if (encodedImage && !encodedImage.startsWith('data:')) {
      encodedImage = `data:image/png;base64,${encodedImage}`;
    }

    return res.status(200).json({
      qrCode: pixQrCode.id || null,
      encodedImage: encodedImage,
      copyPaste: pixQrCode.payload || null,
      expirationDate: pixQrCode.expirationDate || null
    });
  } catch (error) {
    console.error('Erro ao obter QR Code PIX:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao obter QR Code PIX';
    return res.status(500).json({
      error: errorMessage
    });
  }
});

export default router;

