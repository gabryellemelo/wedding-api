const MP_INSTALLMENTS_URL = 'https://api.mercadopago.com/v1/payment_methods/installments';
const TIMEOUT_MS = 15_000;

export interface MercadoPagoPayerCost {
  installments: number;
  installment_rate: number;
  total_amount: number;
  installment_amount: number;
  recommended_message: string;
}

export interface MercadoPagoInstallmentOption {
  payment_method_id: string;
  payment_type_id: string;
  issuer: { id: number; name: string };
  payer_costs: MercadoPagoPayerCost[];
}

export interface InstallmentOptionForFront {
  installments: number;
  installmentValue: number;
  totalAmount: number;
  recommendedMessage: string;
  installmentsList: { installment: number; value: number; dueDate: null }[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getMercadoPagoInstallments(
  amount: number,
  paymentMethodId: string,
  bin: string
): Promise<InstallmentOptionForFront[]> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }

  const params = new URLSearchParams({
    amount: String(amount),
    payment_method_id: paymentMethodId,
    bin: bin.replace(/\D/g, '').slice(0, 8),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const res = await fetch(`${MP_INSTALLMENTS_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mercado Pago installments: ${res.status} ${text}`);
  }

  const data = (await res.json()) as MercadoPagoInstallmentOption[];

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const first = data[0];
  if (!first.payer_costs || !Array.isArray(first.payer_costs)) {
    return [];
  }

  return first.payer_costs.map((pc) => {
    const n = pc.installments || 1;
    const value = round2(pc.installment_amount ?? pc.total_amount / n);
    const total = round2(pc.total_amount ?? value * n);
    return {
      installments: n,
      installmentValue: value,
      totalAmount: total,
      recommendedMessage: pc.recommended_message ?? `${n}x de R$ ${value.toFixed(2)} (Total: R$ ${total.toFixed(2)})`,
      installmentsList: Array.from({ length: n }, (_, i) => ({
        installment: i + 1,
        value,
        dueDate: null as null,
      })),
    };
  });
}
