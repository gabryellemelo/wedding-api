import express, { Request, Response } from 'express';
import { calculateInstallments, calculateDueDates } from '../services/installmentService';
import { CalculateInstallmentsResponse } from '../types';

const router = express.Router();

const MAX_INSTALLMENTS = 21;
const MIN_INSTALLMENTS = 1;
const MIN_VALUE = 0.01;
const MAX_INTEREST_RATE = 100;
const MIN_INTEREST_RATE = 0;

interface CalculateInstallmentsRequestBody {
  value?: number | string;
  installments?: number | string;
  interestRate?: number | string;
  includeAsaasFee?: boolean;
}

function parseNumericValue(value: number | string | undefined, fieldName: string): { valid: boolean; value?: number; error?: string } {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} é obrigatório` };
  }

  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) {
    return { valid: false, error: `${fieldName} deve ser um número válido` };
  }

  return { valid: true, value: numericValue };
}

router.post('/calculate', (req: Request<{}, {}, CalculateInstallmentsRequestBody>, res: Response) => {
  try {
    const { value, installments, interestRate, includeAsaasFee = true } = req.body;

    const valueValidation = parseNumericValue(value, 'Valor');
    if (!valueValidation.valid || !valueValidation.value) {
      return res.status(400).json({
        error: valueValidation.error || 'Valor inválido'
      });
    }

    if (valueValidation.value <= MIN_VALUE) {
      return res.status(400).json({
        error: `Valor deve ser maior que ${MIN_VALUE}`
      });
    }

    const installmentsValidation = parseNumericValue(installments, 'Número de parcelas');
    if (!installmentsValidation.valid || !installmentsValidation.value) {
      return res.status(400).json({
        error: installmentsValidation.error || 'Número de parcelas inválido'
      });
    }

    const installmentsInt = Math.floor(installmentsValidation.value);
    if (installmentsInt < MIN_INSTALLMENTS) {
      return res.status(400).json({
        error: `Número de parcelas deve ser maior ou igual a ${MIN_INSTALLMENTS}`
      });
    }

    if (installmentsInt > MAX_INSTALLMENTS) {
      return res.status(400).json({
        error: `Número máximo de parcelas é ${MAX_INSTALLMENTS}`
      });
    }

    const interestRateValue = interestRate !== undefined 
      ? parseNumericValue(interestRate, 'Taxa de juros')
      : { valid: true, value: 0 };

    if (!interestRateValue.valid || interestRateValue.value === undefined) {
      return res.status(400).json({
        error: interestRateValue.error || 'Taxa de juros inválida'
      });
    }

    if (interestRateValue.value < MIN_INTEREST_RATE || interestRateValue.value > MAX_INTEREST_RATE) {
      return res.status(400).json({
        error: `Taxa de juros deve estar entre ${MIN_INTEREST_RATE} e ${MAX_INTEREST_RATE}%`
      });
    }

    if (typeof includeAsaasFee !== 'boolean' && includeAsaasFee !== undefined) {
      return res.status(400).json({
        error: 'includeAsaasFee deve ser um valor booleano'
      });
    }

    const result = calculateInstallments(
      valueValidation.value,
      installmentsInt,
      interestRateValue.value,
      includeAsaasFee !== false
    );

    const dueDates = calculateDueDates(
      result.installments,
      new Date()
    );

    const response: CalculateInstallmentsResponse = {
      ...result,
      installmentsList: result.installmentsList.map((inst, index) => ({
        ...inst,
        dueDate: dueDates[index]
      }))
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Erro ao calcular parcelamento:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao calcular parcelamento';
    return res.status(500).json({
      error: errorMessage
    });
  }
});

export default router;

