import { InstallmentInfo, InstallmentDetail } from '../types';

const ROUNDING_FACTOR = 100;
const PERCENTAGE_DIVISOR = 100;

const MERCADOPAGO_ACRESCIMO_POR_PARCELAS: Record<number, number> = {
  1: 0,
  2: 8.14,
  3: 9.73,
  4: 11.36,
  5: 12.81,
  6: 14.15,
  7: 15.22,
  8: 16.73,
  9: 18.19,
  10: 19.15,
  11: 20.62,
  12: 22.11,
};

function roundToTwoDecimals(value: number): number {
  return Math.round(value * ROUNDING_FACTOR) / ROUNDING_FACTOR;
}

function getMercadoPagoAcrescimoPercentage(installments: number): number {
  if (installments <= 1) return 0;
  return MERCADOPAGO_ACRESCIMO_POR_PARCELAS[installments] ?? MERCADOPAGO_ACRESCIMO_POR_PARCELAS[12];
}

function createInstallmentList(installments: number, installmentValue: number): InstallmentDetail[] {
  return Array.from({ length: installments }, (_, i) => ({
    installment: i + 1,
    value: roundToTwoDecimals(installmentValue),
    dueDate: null
  }));
}

/**
 * Calcula parcelas com a taxa de acréscimo do Mercado Pago (o que o cliente paga).
 * includeProcessingFee: quando true, usa taxas MP; quando false, total sem acréscimo (ex.: PIX).
 */
export function calculateInstallments(
  totalValue: number,
  installments: number,
  _interestRate: number = 0,
  includeProcessingFee: boolean = true
): InstallmentInfo {
  if (installments < 1) {
    throw new Error('Número de parcelas deve ser maior que zero');
  }

  if (!includeProcessingFee) {
    const installmentValue = totalValue / installments;
    return {
      totalValue: totalValue,
      installments: installments,
      installmentValue: roundToTwoDecimals(installmentValue),
      totalWithInterest: roundToTwoDecimals(totalValue),
      totalInterest: 0,
      interestRate: 0,
      processingFee: 0,
      processingFeePercentage: 0,
      installmentsList: createInstallmentList(installments, installmentValue)
    };
  }

  const feePercentage = getMercadoPagoAcrescimoPercentage(installments);
  const totalWithInterest = totalValue * (1 + feePercentage / PERCENTAGE_DIVISOR);
  const installmentValue = totalWithInterest / installments;
  const totalInterest = totalWithInterest - totalValue;

  return {
    totalValue: totalValue,
    installments: installments,
    installmentValue: roundToTwoDecimals(installmentValue),
    totalWithInterest: roundToTwoDecimals(totalWithInterest),
    totalInterest: roundToTwoDecimals(totalInterest),
    interestRate: 0,
    processingFee: roundToTwoDecimals(totalInterest),
    processingFeePercentage: feePercentage,
    installmentsList: createInstallmentList(installments, installmentValue)
  };
}

export function calculateDueDates(installments: number, firstDueDate: Date = new Date()): string[] {
  const dates: string[] = [];
  const baseDate = new Date(firstDueDate);

  for (let i = 0; i < installments; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(baseDate.getMonth() + i);
    dates.push(dueDate.toISOString().split('T')[0]);
  }

  return dates;
}

