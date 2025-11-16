export type BillingType = 'CREDIT_CARD' | 'PIX' | 'BOLETO' | 'UNDEFINED';

export type PaymentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'RECEIVED'
  | 'OVERDUE'
  | 'REFUNDED'
  | 'RECEIVED_IN_CASH_UNDONE'
  | 'CHARGEBACK_REQUESTED'
  | 'CHARGEBACK_DISPUTE'
  | 'AWAITING_CHARGEBACK_REVERSAL'
  | 'DUNNING_REQUESTED'
  | 'DUNNING_RECEIVED'
  | 'AWAITING_RISK_ANALYSIS';

export interface Customer {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
}

export interface CreditCard {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface CreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone?: string;
}

export interface InstallmentDetail {
  installment: number;
  value: number;
  dueDate: string | null;
}

export interface InstallmentInfo {
  totalValue: number;
  installments: number;
  installmentValue: number;
  totalWithInterest: number;
  totalInterest: number;
  interestRate: number;
  asaasFee: number;
  asaasFeePercentage: number;
  userInterest?: number;
  installmentsList: InstallmentDetail[];
}

export interface PixData {
  qrCode: string | null;
  encodedImage: string | null;
  copyPaste: string | null;
  expirationDate: string | null;
  error?: string;
}

export interface SavedPaymentInfo {
  id: string;
  asaasPaymentId: string;
  value: number;
  status: PaymentStatus;
  description: string;
}

export interface PaymentCustomerInfo {
  name: string;
  email: string;
}

export interface PaymentGiftInfo {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

export interface CreatePaymentRequest {
  customer: Customer;
  value?: number;
  description?: string;
  billingType?: BillingType;
  creditCard?: CreditCard;
  creditCardHolderInfo?: CreditCardHolderInfo;
  giftId?: string;
  installments?: number;
  interestRate?: number;
  message?: string;
}

export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  value: number;
  billingType: BillingType;
  paymentDate: string | null;
  invoiceUrl: string | null;
  transactionReceiptUrl: string | null;
  customer: PaymentCustomerInfo;
  gift?: PaymentGiftInfo;
  localId: string | undefined;
  pix?: PixData;
  installments?: InstallmentInfo;
  savedPayments?: SavedPaymentInfo[];
}

export interface Gift {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CalculateInstallmentsRequest {
  value: number;
  installments: number;
  interestRate?: number;
  includeAsaasFee?: boolean;
}

export interface CalculateInstallmentsResponse extends InstallmentInfo {
  installmentsList: InstallmentDetail[];
}

export interface AsaasPayment {
  id: string;
  status: PaymentStatus;
  value: number;
  billingType: BillingType;
  paymentDate?: string | null;
  dueDate: string;
  description: string;
  customer: string;
  installmentCount?: number;
  installmentValue?: number;
  subscription?: string;
  invoiceUrl?: string;
  transactionReceiptUrl?: string;
  pixQrCodeId?: string;
  pixQrCodeBase64?: string;
  pixCopiaECola?: string;
  netValue?: number;
  originalValue?: number;
  originalDueDate?: string;
  clientPaymentDate?: string;
  installmentNumber?: number;
  nossoNumero?: string;
  bankSlipUrl?: string;
  pixQrCode?: string;
  creditCard?: {
    creditCardBrand: string;
    creditCardNumber: string;
    creditCardToken: string;
  };
  chargeback?: {
    status: string;
    reason: string;
  };
  externalReference?: string;
  deleted?: boolean;
  anticipated?: boolean;
  anticipable?: boolean;
  lastUpdateDate?: string;
  fine?: {
    value: number;
  };
  interest?: {
    value: number;
  };
  discount?: {
    value: number;
    dueDateLimit: string;
    type: string;
  };
  split?: Array<{
    walletId: string;
    fixedValue: number;
    percentualValue: number;
  }>;
  createdDate?: string;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
  observations?: string;
  groupName?: string;
  company?: string;
  dateCreated?: string;
}

export interface AsaasPixQrCode {
  id?: string;
  encodedImage?: string;
  payload?: string;
  pixCopiaECola?: string;
  copyPaste?: string;
  qrCode?: string;
  expirationDate?: string;
  success?: boolean;
  description?: string;
}

export interface AsaasWebhook {
  event: string;
  payment: AsaasPayment;
}

export interface AsaasCreditCard {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface FormattedCustomerData {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
}

export interface FormattedHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone?: string;
}

export interface AsaasPaymentPayload {
  customer: string;
  billingType: string;
  value: number;
  dueDate: string;
  description: string;
  creditCard?: AsaasCreditCard;
  creditCardHolderInfo?: FormattedHolderInfo;
  installmentCount?: number;
  installmentValue?: number;
}

export interface SavePaymentData {
  asaasPaymentId: string;
  customerName: string;
  customerEmail: string;
  value: number;
  status: PaymentStatus;
  billingType: BillingType;
  description: string;
  giftId?: string | null;
  message?: string | null;
  paymentDate?: string | null;
}

export interface PaymentInsertData {
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
}

export interface PaymentUpdateData {
  status: PaymentStatus;
  updated_at: string;
  payment_date?: string;
  value?: number;
}

export interface GiftInsertData {
  name: string;
  price: number;
  image_url?: string;
}

export interface PaymentWithDates extends AsaasPayment {
  dateCreated?: string;
  createdDate?: string;
}

