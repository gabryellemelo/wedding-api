const axios = require('axios');
require('dotenv').config();

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';

if (!ASAAS_API_KEY) {
  throw new Error('ASAAS_API_KEY deve estar configurado no arquivo .env');
}

const asaasClient = axios.create({
  baseURL: ASAAS_BASE_URL,
  headers: {
    'access_token': ASAAS_API_KEY,
    'Content-Type': 'application/json'
  }
});

/**
 * Normaliza o telefone para o formato aceito pelo Asaas
 * Aceita: 47999999999, (47) 99999-9999, 47 99999-9999, etc
 * Retorna: 47999999999 (apenas números) ou undefined se inválido
 */
function normalizePhone(phone) {
  if (!phone) return undefined;
  
  // Remove todos os caracteres não numéricos
  const numbersOnly = phone.replace(/\D/g, '');
  
  // Valida se tem pelo menos 10 dígitos (DDD + número)
  if (numbersOnly.length < 10 || numbersOnly.length > 11) {
    return undefined;
  }
  
  // Se tem 11 dígitos e começa com 0, remove o 0
  if (numbersOnly.length === 11 && numbersOnly.startsWith('0')) {
    return numbersOnly.substring(1);
  }
  
  return numbersOnly;
}

/**
 * Formata os dados do cliente antes de enviar para o Asaas
 */
function formatCustomerData(customerData) {
  const formatted = {
    name: customerData.name,
    email: customerData.email,
    cpfCnpj: customerData.cpfCnpj?.replace(/\D/g, ''), // Remove formatação do CPF/CNPJ
  };
  
  // Adiciona telefone apenas se estiver presente e válido
  const normalizedPhone = normalizePhone(customerData.phone);
  if (normalizedPhone) {
    formatted.phone = normalizedPhone;
  }
  
  return formatted;
}

/**
 * Cria um cliente no Asaas (se não existir)
 * @param {Object} customerData - Dados do cliente
 * @returns {Promise<Object>} - Dados do cliente criado/retornado
 */
async function createOrGetCustomer(customerData) {
  try {
    // Formata os dados do cliente antes de enviar
    const formattedCustomer = formatCustomerData(customerData);
    
    // Primeiro, tenta buscar cliente existente por CPF/CNPJ
    const cpfCnpjClean = formattedCustomer.cpfCnpj?.replace(/\D/g, '');
    const searchResponse = await asaasClient.get('/customers', {
      params: {
        cpfCnpj: cpfCnpjClean
      }
    });

    // Se encontrar cliente existente, retorna
    if (searchResponse.data && searchResponse.data.data && searchResponse.data.data.length > 0) {
      return searchResponse.data.data[0];
    }

    // Se não encontrar, cria novo cliente
    const createResponse = await asaasClient.post('/customers', formattedCustomer);
    return createResponse.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Erro ao criar/buscar cliente no Asaas: ${error.response.data.errors?.[0]?.description || error.response.data.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Cria uma cobrança com cartão de crédito no Asaas
 * @param {Object} paymentData - Dados do pagamento
 * @returns {Promise<Object>} - Dados do pagamento criado
 */
async function createCreditCardPayment(paymentData) {
  try {
    // Primeiro cria ou busca o cliente
    const customer = await createOrGetCustomer(paymentData.customer);

    // Formata os dados do portador do cartão
    const formattedHolderInfo = {
      name: paymentData.creditCardHolderInfo.name,
      email: paymentData.creditCardHolderInfo.email,
      cpfCnpj: paymentData.creditCardHolderInfo.cpfCnpj?.replace(/\D/g, ''),
      postalCode: paymentData.creditCardHolderInfo.postalCode?.replace(/\D/g, ''),
      addressNumber: paymentData.creditCardHolderInfo.addressNumber,
      addressComplement: paymentData.creditCardHolderInfo.addressComplement
    };
    
    // Normaliza telefone do portador do cartão
    const holderPhone = normalizePhone(paymentData.creditCardHolderInfo.phone);
    if (holderPhone) {
      formattedHolderInfo.phone = holderPhone;
    }

    // Calcula a data de vencimento (hoje ou a data fornecida)
    const dueDate = paymentData.dueDate || new Date().toISOString().split('T')[0];

    // Monta o payload para criação do pagamento
    const paymentPayload = {
      customer: customer.id,
      billingType: 'CREDIT_CARD',
      value: paymentData.value,
      dueDate: dueDate,
      description: paymentData.description || 'Pagamento de casamento',
      creditCard: {
        holderName: paymentData.creditCard.holderName,
        number: paymentData.creditCard.number,
        expiryMonth: paymentData.creditCard.expiryMonth,
        expiryYear: paymentData.creditCard.expiryYear,
        ccv: paymentData.creditCard.ccv
      },
      creditCardHolderInfo: formattedHolderInfo
    };

    // Adiciona parcelamento se fornecido
    if (paymentData.installments && paymentData.installments > 1) {
      paymentPayload.installmentCount = paymentData.installments;
      paymentPayload.installmentValue = paymentData.installmentValue || (paymentData.value / paymentData.installments);
    }

    // Cria o pagamento
    const response = await asaasClient.post('/payments', paymentPayload);
    return response.data;
  } catch (error) {
    if (error.response) {
      const errorMessage = error.response.data.errors?.[0]?.description 
        || error.response.data.message 
        || error.message;
      throw new Error(`Erro ao criar pagamento no Asaas: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Consulta status de um pagamento no Asaas
 * @param {string} paymentId - ID do pagamento no Asaas
 * @returns {Promise<Object>} - Dados do pagamento
 */
async function getPaymentStatus(paymentId) {
  try {
    const response = await asaasClient.get(`/payments/${paymentId}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Erro ao consultar pagamento no Asaas: ${error.response.data.message || error.message}`);
    }
    throw error;
  }
}

module.exports = {
  createCreditCardPayment,
  getPaymentStatus,
  createOrGetCustomer
};
