import axios, { AxiosInstance, isAxiosError } from 'axios';
import 'dotenv/config';
import {
  Customer,
  CreditCard,
  CreditCardHolderInfo,
  AsaasCustomer,
  AsaasPayment,
  AsaasPixQrCode,
  FormattedCustomerData,
  FormattedHolderInfo,
  AsaasPaymentPayload
} from '../types';

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL;
const DEFAULT_PAYMENT_DESCRIPTION = 'Presente de casamento';
const MIN_PHONE_LENGTH = 10;
const MAX_PHONE_LENGTH = 11;
const INSTALLMENTS_SEARCH_LIMIT = 100;
const INSTALLMENTS_SEARCH_WINDOW_MS = 5 * 60 * 1000;

if (!ASAAS_API_KEY) {
  throw new Error('ASAAS_API_KEY deve estar configurado no arquivo .env');
}

const asaasClient: AxiosInstance = axios.create({
  baseURL: ASAAS_BASE_URL,
  headers: {
    'access_token': ASAAS_API_KEY,
    'Content-Type': 'application/json'
  }
});

interface AsaasErrorResponse {
  errors?: Array<{ description?: string }>;
  message?: string;
}

function extractAsaasErrorMessage(error: unknown, defaultMessage: string): string {
  if (isAxiosError(error) && error.response) {
    const errorData = error.response.data as AsaasErrorResponse;
    return errorData.errors?.[0]?.description || errorData.message || error.message || defaultMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
}

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;

  const numbersOnly = phone.replace(/\D/g, '');

  if (numbersOnly.length < MIN_PHONE_LENGTH || numbersOnly.length > MAX_PHONE_LENGTH) {
    return undefined;
  }

  if (numbersOnly.length === MAX_PHONE_LENGTH && numbersOnly.startsWith('0')) {
    return numbersOnly.substring(1);
  }

  return numbersOnly;
}

function formatCustomerData(customerData: Customer): FormattedCustomerData {
  const normalizedPhone = normalizePhone(customerData.phone);
  const formatted: FormattedCustomerData = {
    name: customerData.name,
    email: customerData.email,
    cpfCnpj: customerData.cpfCnpj?.replace(/\D/g, '') || '',
  };

  if (normalizedPhone) {
    formatted.phone = normalizedPhone;
  }

  return formatted;
}

function formatDueDate(dueDate?: string): string {
  return dueDate || new Date().toISOString().split('T')[0];
}

export async function createOrGetCustomer(customerData: Customer): Promise<AsaasCustomer> {
  try {
    const formattedCustomer = formatCustomerData(customerData);
    const cpfCnpjClean = formattedCustomer.cpfCnpj?.replace(/\D/g, '');

    const searchResponse = await asaasClient.get('/customers', {
      params: {
        cpfCnpj: cpfCnpjClean
      }
    });

    if (searchResponse.data?.data?.length > 0) {
      return searchResponse.data.data[0] as AsaasCustomer;
    }

    const createResponse = await asaasClient.post('/customers', formattedCustomer);
    return createResponse.data as AsaasCustomer;
  } catch (error) {
    const errorMessage = extractAsaasErrorMessage(error, 'Erro desconhecido');
    throw new Error(`Erro ao criar/buscar cliente no Asaas: ${errorMessage}`);
  }
}

interface CreateCreditCardPaymentData {
  customer: Customer;
  value: number;
  description?: string;
  dueDate?: string;
  creditCard: CreditCard;
  creditCardHolderInfo: CreditCardHolderInfo;
  installments?: number;
  installmentValue?: number;
}

export async function createCreditCardPayment(paymentData: CreateCreditCardPaymentData): Promise<AsaasPayment> {
  try {
    const customer = await createOrGetCustomer(paymentData.customer);

    const holderPhone = normalizePhone(paymentData.creditCardHolderInfo.phone);
    const formattedHolderInfo: FormattedHolderInfo = {
      name: paymentData.creditCardHolderInfo.name,
      email: paymentData.creditCardHolderInfo.email,
      cpfCnpj: paymentData.creditCardHolderInfo.cpfCnpj?.replace(/\D/g, '') || '',
      postalCode: paymentData.creditCardHolderInfo.postalCode?.replace(/\D/g, '') || '',
      addressNumber: paymentData.creditCardHolderInfo.addressNumber,
      addressComplement: paymentData.creditCardHolderInfo.addressComplement,
      phone: holderPhone
    };

    const dueDate = formatDueDate(paymentData.dueDate);

    const paymentPayload: AsaasPaymentPayload = {
      customer: customer.id,
      billingType: 'CREDIT_CARD',
      value: paymentData.value,
      dueDate: dueDate,
      description: paymentData.description || DEFAULT_PAYMENT_DESCRIPTION,
      creditCard: {
        holderName: paymentData.creditCard.holderName,
        number: paymentData.creditCard.number,
        expiryMonth: paymentData.creditCard.expiryMonth,
        expiryYear: paymentData.creditCard.expiryYear,
        ccv: paymentData.creditCard.ccv
      },
      creditCardHolderInfo: formattedHolderInfo
    };

    if (paymentData.installments && paymentData.installments > 1) {
      paymentPayload.installmentCount = paymentData.installments;
      paymentPayload.installmentValue = paymentData.installmentValue || (paymentData.value / paymentData.installments);
    }

    const response = await asaasClient.post('/payments', paymentPayload);
    return response.data as AsaasPayment;
  } catch (error) {
    const errorMessage = extractAsaasErrorMessage(error, 'Erro desconhecido');
    throw new Error(`Erro ao criar pagamento no Asaas: ${errorMessage}`);
  }
}

interface CreatePixPaymentData {
  customer: Customer;
  value: number;
  description?: string;
  dueDate?: string;
}

export async function createPixPayment(paymentData: CreatePixPaymentData): Promise<AsaasPayment> {
  try {
    const customer = await createOrGetCustomer(paymentData.customer);
    const dueDate = formatDueDate(paymentData.dueDate);

    const paymentPayload = {
      customer: customer.id,
      billingType: 'PIX',
      value: paymentData.value,
      dueDate: dueDate,
      description: paymentData.description || DEFAULT_PAYMENT_DESCRIPTION
    };

    const response = await asaasClient.post('/payments', paymentPayload);
    return response.data as AsaasPayment;
  } catch (error) {
    const errorMessage = extractAsaasErrorMessage(error, 'Erro desconhecido');
    throw new Error(`Erro ao criar pagamento PIX no Asaas: ${errorMessage}`);
  }
}

export async function getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  try {
    const response = await asaasClient.get(`/payments/${paymentId}/pixQrCode`);
    console.log('QR Code PIX retornado:', JSON.stringify(response.data, null, 2));
    return response.data as AsaasPixQrCode;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      console.error('Erro ao obter QR Code PIX:', {
        status: error.response.status,
        data: error.response.data,
        paymentId: paymentId
      });
    }
    const errorMessage = extractAsaasErrorMessage(error, 'Erro desconhecido');
    throw new Error(`Erro ao obter QR Code PIX: ${errorMessage}`);
  }
}

interface PaymentWithDates extends AsaasPayment {
  dateCreated?: string;
  createdDate?: string;
}

function isRelatedInstallment(
  payment: PaymentWithDates,
  mainPayment: AsaasPayment,
  paymentId: string,
  timeWindow: Date
): boolean {
  if (payment.id === paymentId) return false;

  const isSameCustomer = payment.customer === mainPayment.customer;
  const paymentDate = payment.dateCreated || payment.createdDate;
  const isRecent = paymentDate ? new Date(paymentDate) >= timeWindow : false;

  const mainDescriptionPrefix = mainPayment.description?.split(' - ')[0] || '';
  const hasSimilarDescription = Boolean(payment.description &&
    (payment.description.includes(mainDescriptionPrefix) ||
      mainPayment.description?.includes(payment.description.split(' - ')[0] || '')));

  return isSameCustomer && (isRecent || hasSimilarDescription);
}

export async function getPaymentInstallments(paymentId: string): Promise<AsaasPayment[]> {
  try {
    const mainPayment = await getPaymentStatus(paymentId);

    if (!mainPayment.installmentCount || mainPayment.installmentCount <= 1) {
      return [mainPayment];
    }

    const installmentsCount = mainPayment.installmentCount;
    const installments: AsaasPayment[] = [mainPayment];

    try {
      const response = await asaasClient.get('/payments', {
        params: {
          customer: mainPayment.customer,
          limit: INSTALLMENTS_SEARCH_LIMIT
        }
      });

      if (response.data?.data) {
        const timeWindow = new Date(Date.now() - INSTALLMENTS_SEARCH_WINDOW_MS);
        const relatedPayments = (response.data.data as PaymentWithDates[]).filter((p) =>
          isRelatedInstallment(p, mainPayment, paymentId, timeWindow)
        );

        relatedPayments.sort((a, b) => {
          const dateA = new Date(a.dueDate || a.dateCreated || a.createdDate || '');
          const dateB = new Date(b.dueDate || b.dateCreated || b.createdDate || '');
          return dateA.getTime() - dateB.getTime();
        });

        installments.push(...relatedPayments.slice(0, installmentsCount - 1));
      }
    } catch (searchError) {
      const errorMessage = searchError instanceof Error ? searchError.message : 'Erro desconhecido';
      console.warn('Erro ao buscar outras parcelas, usando apenas a principal:', errorMessage);
    }

    if (installments.length < installmentsCount) {
      console.log(`Encontradas ${installments.length} de ${installmentsCount} parcelas. Criando registros faltantes.`);
    }

    return installments;
  } catch (error) {
    console.error('Erro ao buscar parcelas:', error);
    try {
      const mainPayment = await getPaymentStatus(paymentId);
      return [mainPayment];
    } catch (e) {
      throw error;
    }
  }
}

export async function getPaymentStatus(paymentId: string): Promise<AsaasPayment> {
  try {
    const response = await asaasClient.get(`/payments/${paymentId}`);
    return response.data as AsaasPayment;
  } catch (error) {
    const errorMessage = extractAsaasErrorMessage(error, 'Erro desconhecido');
    throw new Error(`Erro ao consultar pagamento no Asaas: ${errorMessage}`);
  }
}

