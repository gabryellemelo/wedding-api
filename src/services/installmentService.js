/**
 * Serviço para calcular parcelamento com juros e taxas do Asaas
 */

// Taxas do Asaas para cartão de crédito parcelado
const ASAAS_FEE_PERCENTAGE = 2.7; // 2,7% sobre o valor TOTAL da cobrança (aumentado por segurança)
const ASAAS_FEE_FIXED = 0.49; // R$ 0,49 fixo por transação (uma vez)

/**
 * Calcula o valor das parcelas incluindo taxas do Asaas e juros (se houver)
 * @param {number} totalValue - Valor total original
 * @param {number} installments - Número de parcelas
 * @param {number} interestRate - Taxa de juros mensal em % (opcional, ex: 2.5 para 2.5%)
 * @param {boolean} includeAsaasFee - Se true, inclui as taxas do Asaas no cálculo (default: true)
 * @returns {Object} - Detalhes do parcelamento
 */
function calculateInstallments(totalValue, installments, interestRate = 0, includeAsaasFee = true) {
  if (installments < 1) {
    throw new Error('Número de parcelas deve ser maior que zero');
  }

  if (installments === 1) {
    // À vista - calcula taxa do Asaas (se incluída)
    let finalValue = totalValue;
    let asaasFee = 0;
    
    if (includeAsaasFee) {
      // Taxa do Asaas: novoValor = valorTotal + (valorTotal × 2,7%) + R$ 0,49
      const percentageFee = totalValue * ASAAS_FEE_PERCENTAGE / 100;
      finalValue = totalValue + percentageFee + ASAAS_FEE_FIXED;
      asaasFee = percentageFee + ASAAS_FEE_FIXED;
    }
    
    return {
      totalValue: totalValue,
      installments: 1,
      installmentValue: Math.round(finalValue * 100) / 100,
      totalWithInterest: Math.round(finalValue * 100) / 100,
      totalInterest: Math.round(asaasFee * 100) / 100,
      interestRate: 0,
      asaasFee: includeAsaasFee ? Math.round(asaasFee * 100) / 100 : 0,
      installmentsList: [
        {
          installment: 1,
          value: Math.round(finalValue * 100) / 100,
          dueDate: null
        }
      ]
    };
  }

  // Se não tem juros, divide igualmente + taxas Asaas
  if (interestRate === 0) {
    let finalValue = totalValue;
    let asaasFeeTotal = 0;
    
    if (includeAsaasFee) {
      // Taxa do Asaas: novoValor = valorTotal + (valorTotal × 2,7%) + R$ 0,49
      const percentageFee = totalValue * ASAAS_FEE_PERCENTAGE / 100;
      finalValue = totalValue + percentageFee + ASAAS_FEE_FIXED;
      asaasFeeTotal = percentageFee + ASAAS_FEE_FIXED;
    }
    
    // Divide o valor total (com taxas) igualmente entre as parcelas
    const installmentValue = finalValue / installments;
    
    return {
      totalValue: totalValue,
      installments: installments,
      installmentValue: Math.round(installmentValue * 100) / 100,
      totalWithInterest: Math.round(finalValue * 100) / 100,
      totalInterest: Math.round(asaasFeeTotal * 100) / 100,
      interestRate: 0,
      asaasFee: includeAsaasFee ? Math.round(asaasFeeTotal * 100) / 100 : 0,
      installmentsList: Array.from({ length: installments }, (_, i) => ({
        installment: i + 1,
        value: Math.round(installmentValue * 100) / 100,
        dueDate: null
      }))
    };
  }

  // Cálculo com juros (Sistema de Amortização Price - Tabela Price)
  // Fórmula: PMT = PV * [i * (1 + i)^n] / [(1 + i)^n - 1]
  // interestRate já vem em percentual (ex: 2.5 para 2.5%)
  const monthlyRate = interestRate / 100; // Converte de percentual para decimal (2.5% = 0.025)
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, installments);
  const denominator = Math.pow(1 + monthlyRate, installments) - 1;
  const installmentValueWithInterest = totalValue * (numerator / denominator);
  const totalWithInterestOnly = installmentValueWithInterest * installments;

  // Adiciona taxa do Asaas sobre o valor total com juros
  // Taxa Asaas: novoValor = valorTotalComJuros × 2,49% + R$ 0,49
  let finalValue;
  let asaasFeeTotal = 0;
  let userInterest = 0;
  
  if (includeAsaasFee) {
    // Aplica taxa: novoValor = valorTotalComJuros + (valorTotalComJuros × 2,7%) + R$ 0,49
    const percentageFee = totalWithInterestOnly * ASAAS_FEE_PERCENTAGE / 100;
    finalValue = totalWithInterestOnly + percentageFee + ASAAS_FEE_FIXED;
    asaasFeeTotal = percentageFee + ASAAS_FEE_FIXED;
    userInterest = totalWithInterestOnly - totalValue;
  } else {
    finalValue = totalWithInterestOnly;
    userInterest = totalWithInterestOnly - totalValue;
  }
  
  // Divide o valor final (com juros + taxas) igualmente entre as parcelas
  const installmentValue = finalValue / installments;
  const totalInterest = finalValue - totalValue;

  // Gera lista de parcelas
  const installmentsList = Array.from({ length: installments }, (_, i) => ({
    installment: i + 1,
    value: Math.round(installmentValue * 100) / 100,
    dueDate: null // Pode ser calculado depois
  }));

  return {
    totalValue: totalValue,
    installments: installments,
    installmentValue: Math.round(installmentValue * 100) / 100,
    totalWithInterest: Math.round(finalValue * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    interestRate: interestRate,
    asaasFee: includeAsaasFee ? Math.round(asaasFeeTotal * 100) / 100 : 0,
    userInterest: interestRate > 0 ? Math.round(userInterest * 100) / 100 : 0,
    installmentsList: installmentsList
  };
}

/**
 * Calcula datas de vencimento das parcelas
 * @param {number} installments - Número de parcelas
 * @param {Date} firstDueDate - Data da primeira parcela
 * @returns {Array} - Array de datas
 */
function calculateDueDates(installments, firstDueDate = new Date()) {
  const dates = [];
  const date = new Date(firstDueDate);

  for (let i = 0; i < installments; i++) {
    const dueDate = new Date(date);
    dueDate.setMonth(date.getMonth() + i);
    dates.push(dueDate.toISOString().split('T')[0]); // Formato YYYY-MM-DD
  }

  return dates;
}

module.exports = {
  calculateInstallments,
  calculateDueDates
};
