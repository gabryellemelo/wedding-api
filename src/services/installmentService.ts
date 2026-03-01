import { InstallmentInfo, InstallmentDetail } from '../types';

const PROCESSING_FEE_FIXED = 0.49;
const ROUNDING_FACTOR = 100;
const PERCENTAGE_DIVISOR = 100;

const FEE_1X = 2.99;
const FEE_2_6X = 3.49;
const FEE_7_12X = 3.99;
const FEE_13_21X = 4.29;
const FEE_MAX = 4.29;

function roundToTwoDecimals(value: number): number {
  return Math.round(value * ROUNDING_FACTOR) / ROUNDING_FACTOR;
}

function getProcessingFeePercentage(installments: number): number {
  if (installments === 1) {
    return FEE_1X;
  }
  if (installments >= 2 && installments <= 6) {
    return FEE_2_6X;
  }
  if (installments >= 7 && installments <= 12) {
    return FEE_7_12X;
  }
  if (installments >= 13 && installments <= 21) {
    return FEE_13_21X;
  }
  return FEE_MAX;
}

function calculateProcessingFee(baseValue: number, feePercentage: number): number {
  const percentageFee = (baseValue * feePercentage) / PERCENTAGE_DIVISOR;
  return percentageFee + PROCESSING_FEE_FIXED;
}

function createInstallmentList(installments: number, installmentValue: number): InstallmentDetail[] {
  return Array.from({ length: installments }, (_, i) => ({
    installment: i + 1,
    value: roundToTwoDecimals(installmentValue),
    dueDate: null
  }));
}

function calculatePriceInstallment(baseValue: number, monthlyRate: number, installments: number): number {
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, installments);
  const denominator = Math.pow(1 + monthlyRate, installments) - 1;
  return baseValue * (numerator / denominator);
}

export function calculateInstallments(
  totalValue: number,
  installments: number,
  interestRate: number = 0,
  includeProcessingFee: boolean = true
): InstallmentInfo {
  if (installments < 1) {
    throw new Error('Número de parcelas deve ser maior que zero');
  }

  if (installments === 1) {
    const feePercentage = includeProcessingFee ? getProcessingFeePercentage(1) : 0;
    const processingFee = includeProcessingFee ? calculateProcessingFee(totalValue, feePercentage) : 0;
    const finalValue = totalValue + processingFee;

    return {
      totalValue: totalValue,
      installments: 1,
      installmentValue: roundToTwoDecimals(finalValue),
      totalWithInterest: roundToTwoDecimals(finalValue),
      totalInterest: roundToTwoDecimals(processingFee),
      interestRate: 0,
      processingFee: roundToTwoDecimals(processingFee),
      processingFeePercentage: feePercentage,
      installmentsList: [{
        installment: 1,
        value: roundToTwoDecimals(finalValue),
        dueDate: null
      }]
    };
  }

  if (interestRate === 0) {
    const feePercentage = includeProcessingFee ? getProcessingFeePercentage(installments) : 0;
    const processingFeeTotal = includeProcessingFee ? calculateProcessingFee(totalValue, feePercentage) : 0;
    const finalValue = totalValue + processingFeeTotal;
    const installmentValue = finalValue / installments;

    return {
      totalValue: totalValue,
      installments: installments,
      installmentValue: roundToTwoDecimals(installmentValue),
      totalWithInterest: roundToTwoDecimals(finalValue),
      totalInterest: roundToTwoDecimals(processingFeeTotal),
      interestRate: 0,
      processingFee: roundToTwoDecimals(processingFeeTotal),
      processingFeePercentage: feePercentage,
      installmentsList: createInstallmentList(installments, installmentValue)
    };
  }

  const monthlyRate = interestRate / PERCENTAGE_DIVISOR;
  const installmentValueWithInterest = calculatePriceInstallment(totalValue, monthlyRate, installments);
  const totalWithInterestOnly = installmentValueWithInterest * installments;

  const feePercentage = includeProcessingFee ? getProcessingFeePercentage(installments) : 0;
  const processingFeeTotal = includeProcessingFee ? calculateProcessingFee(totalWithInterestOnly, feePercentage) : 0;
  const finalValue = totalWithInterestOnly + processingFeeTotal;
  const installmentValue = finalValue / installments;
  const totalInterest = finalValue - totalValue;
  const userInterest = totalWithInterestOnly - totalValue;

  return {
    totalValue: totalValue,
    installments: installments,
    installmentValue: roundToTwoDecimals(installmentValue),
    totalWithInterest: roundToTwoDecimals(finalValue),
    totalInterest: roundToTwoDecimals(totalInterest),
    interestRate: interestRate,
    processingFee: roundToTwoDecimals(processingFeeTotal),
    processingFeePercentage: feePercentage,
    userInterest: roundToTwoDecimals(userInterest),
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

