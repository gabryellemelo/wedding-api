import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getGiftById } from '../services/giftsService';
import {
  CreatePaymentRequest,
  PaymentResponse,
  Customer,
  CreditCardHolderInfo,
  BillingType,
  Gift,
  PaymentStatus,
} from '../types';

const router = express.Router();

const MIN_PAYMENT_VALUE = 0.01;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

/** Map Edge Function status_mapped to frontend-expected status (CONFIRMED for success) */
function mapStatusForFrontend(statusMapped: string): PaymentStatus {
  if (statusMapped === 'RECEIVED') {
    return 'CONFIRMED';
  }
  return statusMapped as PaymentStatus;
}

interface ProcessarPagamentoResponse {
  payment_id: string;
  gateway_payment_id?: number;
  metodo_pagamento: string;
  status?: string;
  status_mapped?: string;
  status_detail?: string;
  pix?: {
    qr_code?: string | null;
    qr_code_base64?: string | null;
    copy_paste?: string | null;
    ticket_url?: string | null;
    expires_at?: string | null;
  };
}

async function callProcessarPagamento(payload: object): Promise<ProcessarPagamentoResponse> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados');
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/processar-pagamento`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as ProcessarPagamentoResponse & { error?: string; detalhe?: string };

  if (!res.ok) {
    const msg = data.error || data.detalhe || res.statusText;
    throw new Error(msg);
  }

  return data as ProcessarPagamentoResponse;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      customer,
      value,
      description,
      billingType,
      creditCardHolderInfo,
      giftId,
      installments,
      message,
      card_token,
      payment_method_id,
    }: CreatePaymentRequest = req.body;

    const paymentType: BillingType = billingType || 'CREDIT_CARD';

    const customerValidation = validateCustomer(customer);
    if (!customerValidation.valid) {
      return res.status(400).json({
        error: customerValidation.error || 'Dados do cliente inválidos',
      });
    }

    let gift: Gift | null = null;
    if (giftId) {
      gift = await getGiftById(giftId);
      if (!gift) {
        return res.status(400).json({
          error: 'Presente não encontrado',
        });
      }
    }

    const paymentValue = gift ? gift.price : value ?? 0;

    if (paymentValue < MIN_PAYMENT_VALUE) {
      return res.status(400).json({
        error: `Valor do pagamento deve ser maior ou igual a ${MIN_PAYMENT_VALUE}`,
      });
    }

    if (paymentType === 'CREDIT_CARD') {
      if (!card_token || typeof card_token !== 'string' || !card_token.trim()) {
        return res.status(400).json({
          error: 'Token do cartão é obrigatório. Use o formulário de cartão do Mercado Pago para obter o token.',
        });
      }
      const holderValidation = validateCreditCardHolder(creditCardHolderInfo);
      if (!holderValidation.valid) {
        return res.status(400).json({
          error: holderValidation.error || 'Dados do portador inválidos',
        });
      }
    }

    if (paymentType === 'PIX' && installments && installments > 1) {
      return res.status(400).json({
        error: 'PIX não suporta parcelamento. Use apenas para pagamento à vista.',
      });
    }

    const paymentDescription = gift
      ? `${description || 'Pagamento de casamento'} - Presente: ${gift.name}`
      : (description || 'Pagamento de casamento');

    const payment_id = randomUUID();
    const numInstallments = Math.min(Math.max(installments || 1, 1), 12);

    const edgePayload: Record<string, unknown> = {
      payment_id,
      customer: {
        name: customer!.name,
        email: customer!.email,
        cpfCnpj: customer!.cpfCnpj,
        phone: customer!.phone,
      },
      value: paymentValue,
      description: paymentDescription,
      gift_id: giftId || null,
      message: message || null,
      metodo_pagamento: paymentType === 'PIX' ? 'pix' : 'credit_card',
      quantity: 1,
    };

    if (paymentType === 'CREDIT_CARD') {
      edgePayload.card_token = card_token!.trim();
      edgePayload.cardholder_name = creditCardHolderInfo!.name;
      edgePayload.installments = numInstallments;
      if (payment_method_id) {
        edgePayload.payment_method_id = payment_method_id;
      }
      edgePayload.payer_document_type = 'CPF';
      edgePayload.payer_document_number = (customer!.cpfCnpj || creditCardHolderInfo!.cpfCnpj || '').replace(/\D/g, '');
      edgePayload.cardholder_identification_type = 'CPF';
      edgePayload.cardholder_identification_number = (creditCardHolderInfo!.cpfCnpj || '').replace(/\D/g, '');
    }

    const result = await callProcessarPagamento(edgePayload);

    const status: PaymentStatus = mapStatusForFrontend(result.status_mapped || 'PENDING');

    const response: PaymentResponse = {
      id: String(result.gateway_payment_id ?? result.payment_id),
      status,
      value: paymentValue,
      billingType: paymentType,
      paymentDate: status === 'CONFIRMED' ? new Date().toISOString() : null,
      invoiceUrl: null,
      transactionReceiptUrl: null,
      customer: {
        name: customer!.name,
        email: customer!.email,
      },
      gift: gift
        ? {
            id: gift.id,
            name: gift.name,
            price: gift.price,
            image_url: gift.image_url || null,
          }
        : undefined,
      localId: result.payment_id,
    };

    if (paymentType === 'PIX' && result.pix) {
      let encodedImage = result.pix.qr_code_base64 || null;
      if (encodedImage && !encodedImage.startsWith('data:')) {
        encodedImage = `data:image/png;base64,${encodedImage}`;
      }
      response.pix = {
        qrCode: result.pix.qr_code || null,
        encodedImage,
        copyPaste: result.pix.copy_paste || null,
        expirationDate: result.pix.expires_at || null,
      };
    }

    return res.status(201).json(response);
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return res.status(500).json({
      error: errorMessage,
    });
  }
});

router.get('/:id/pix-qrcode', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        error: 'ID do pagamento é obrigatório',
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(503).json({
        error: 'Serviço de consulta não configurado',
      });
    }

    const resFetch = await fetch(`${SUPABASE_URL}/functions/v1/consultar-pagamento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ gateway_payment_id: id }),
    });

    const data = (await resFetch.json()) as {
      pix?: { qr_code?: string; qr_code_base64?: string; copy_paste?: string; expires_at?: string };
      error?: string;
    };

    if (!resFetch.ok) {
      return res.status(resFetch.status >= 500 ? 502 : resFetch.status).json({
        error: data.error || 'Não foi possível consultar o pagamento',
      });
    }

    let encodedImage = data.pix?.qr_code_base64 || null;
    if (encodedImage && !encodedImage.startsWith('data:')) {
      encodedImage = `data:image/png;base64,${encodedImage}`;
    }

    return res.status(200).json({
      qrCode: data.pix?.qr_code || null,
      encodedImage,
      copyPaste: data.pix?.copy_paste || null,
      expirationDate: data.pix?.expires_at || null,
    });
  } catch (error) {
    console.error('Erro ao obter QR Code PIX:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao obter QR Code PIX';
    return res.status(500).json({
      error: errorMessage,
    });
  }
});

export default router;
