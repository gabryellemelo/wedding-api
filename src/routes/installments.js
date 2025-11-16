const express = require('express');
const router = express.Router();
const installmentService = require('../services/installmentService');

/**
 * POST /api/installments/calculate
 * Calcula parcelamento com juros
 * 
 * Body:
 * {
 *   "value": 1000.00,
 *   "installments": 3,
 *   "interestRate": 2.5  // Taxa de juros mensal em % (opcional, default: 0)
 * }
 */
router.post('/calculate', (req, res) => {
  try {
    const { value, installments, interestRate = 0, includeAsaasFee = true } = req.body;

    // Validações
    if (!value || value <= 0) {
      return res.status(400).json({
        error: 'Valor deve ser maior que zero'
      });
    }

    if (!installments || installments < 1) {
      return res.status(400).json({
        error: 'Número de parcelas deve ser maior que zero'
      });
    }

    if (installments > 12) {
      return res.status(400).json({
        error: 'Número máximo de parcelas é 12'
      });
    }

    if (interestRate < 0 || interestRate > 100) {
      return res.status(400).json({
        error: 'Taxa de juros deve estar entre 0 e 100%'
      });
    }

    // Calcula o parcelamento
    const result = installmentService.calculateInstallments(
      parseFloat(value),
      parseInt(installments),
      parseFloat(interestRate),
      includeAsaasFee !== false // Default: true
    );

    // Calcula as datas de vencimento
    const dueDates = installmentService.calculateDueDates(
      result.installments,
      new Date()
    );

    // Adiciona datas às parcelas
    result.installmentsList = result.installmentsList.map((inst, index) => ({
      ...inst,
      dueDate: dueDates[index]
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao calcular parcelamento:', error);
    res.status(500).json({
      error: error.message || 'Erro ao calcular parcelamento'
    });
  }
});

module.exports = router;
