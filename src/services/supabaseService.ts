import supabase from '../config/database';
import { SavePaymentData, PaymentStatus, PaymentInsertData, PaymentUpdateData } from '../types';

const PAYMENTS_TABLE = 'payments';
const SUPABASE_NOT_FOUND_CODE = 'PGRST116';
const DEFAULT_BILLING_TYPE = 'CREDIT_CARD';

interface PaymentRecord {
  id: string;
  asaas_payment_id: string;
  customer_name: string;
  customer_email: string;
  value: number;
  status: PaymentStatus;
  billing_type: string;
  description: string;
  gift_id?: string | null;
  message?: string | null;
  payment_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

function mapToPaymentInsertData(paymentData: SavePaymentData): PaymentInsertData {
  return {
    asaas_payment_id: paymentData.asaasPaymentId,
    customer_name: paymentData.customerName,
    customer_email: paymentData.customerEmail,
    value: paymentData.value,
    status: paymentData.status,
    billing_type: paymentData.billingType || DEFAULT_BILLING_TYPE,
    description: paymentData.description,
    gift_id: paymentData.giftId || null,
    message: paymentData.message || null,
    payment_date: paymentData.paymentDate || null
  };
}

export async function savePayment(paymentData: SavePaymentData): Promise<PaymentRecord> {
  const insertData = mapToPaymentInsertData(paymentData);

  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .insert([insertData])
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao salvar pagamento no Supabase: ${error.message}`);
  }

  return data as PaymentRecord;
}

export async function getPaymentByAsaasId(asaasPaymentId: string): Promise<PaymentRecord | null> {
  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .select('*')
    .eq('asaas_payment_id', asaasPaymentId)
    .single();

  if (error) {
    if (error.code === SUPABASE_NOT_FOUND_CODE) {
      return null;
    }
    throw new Error(`Erro ao buscar pagamento no Supabase: ${error.message}`);
  }

  return data as PaymentRecord;
}

export async function updatePaymentStatus(
  asaasPaymentId: string,
  status: PaymentStatus,
  additionalData: { paymentDate?: string; value?: number } = {}
): Promise<PaymentRecord> {
  const updateData: PaymentUpdateData = {
    status: status,
    updated_at: new Date().toISOString()
  };

  if (additionalData.paymentDate) {
    updateData.payment_date = additionalData.paymentDate;
  }
  if (additionalData.value !== undefined) {
    updateData.value = additionalData.value;
  }

  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .update(updateData)
    .eq('asaas_payment_id', asaasPaymentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar pagamento no Supabase: ${error.message}`);
  }

  return data as PaymentRecord;
}

export async function saveMultiplePayments(paymentsData: SavePaymentData[]): Promise<PaymentRecord[]> {
  const insertData: PaymentInsertData[] = paymentsData.map(mapToPaymentInsertData);

  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .insert(insertData)
    .select();

  if (error) {
    throw new Error(`Erro ao salvar pagamentos no Supabase: ${error.message}`);
  }

  return data as PaymentRecord[];
}

