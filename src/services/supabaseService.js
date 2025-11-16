const supabase = require('../config/database');

/**
 * Salva um pagamento no Supabase
 * @param {Object} paymentData - Dados do pagamento
 * @returns {Promise<Object>} - Dados do pagamento salvo
 */
async function savePayment(paymentData) {
  try {
    const insertData = {
      asaas_payment_id: paymentData.asaasPaymentId,
      customer_name: paymentData.customerName,
      customer_email: paymentData.customerEmail,
      value: paymentData.value,
      status: paymentData.status,
      billing_type: paymentData.billingType || 'CREDIT_CARD',
      description: paymentData.description
    };

    // Adiciona gift_id se fornecido
    if (paymentData.giftId) {
      insertData.gift_id = paymentData.giftId;
    }

    const { data, error } = await supabase
      .from('payments')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao salvar pagamento no Supabase: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Busca um pagamento pelo ID do Asaas
 * @param {string} asaasPaymentId - ID do pagamento no Asaas
 * @returns {Promise<Object>} - Dados do pagamento
 */
async function getPaymentByAsaasId(asaasPaymentId) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('asaas_payment_id', asaasPaymentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Não encontrado
      }
      throw new Error(`Erro ao buscar pagamento no Supabase: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Atualiza status de um pagamento
 * @param {string} asaasPaymentId - ID do pagamento no Asaas
 * @param {string} status - Novo status
 * @param {Object} additionalData - Dados adicionais para atualizar (paymentDate, etc)
 * @returns {Promise<Object>} - Dados do pagamento atualizado
 */
async function updatePaymentStatus(asaasPaymentId, status, additionalData = {}) {
  try {
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };

    // Adiciona campos adicionais se fornecidos
    if (additionalData.paymentDate) {
      updateData.payment_date = additionalData.paymentDate;
    }
    if (additionalData.value !== undefined) {
      updateData.value = additionalData.value;
    }

    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('asaas_payment_id', asaasPaymentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar pagamento no Supabase: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  savePayment,
  getPaymentByAsaasId,
  updatePaymentStatus
};
