const supabase = require('../config/database');

/**
 * Busca um presente pelo ID
 * @param {string} giftId - ID do presente
 * @returns {Promise<Object>} - Dados do presente
 */
async function getGiftById(giftId) {
  try {
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .eq('id', giftId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Não encontrado
      }
      throw new Error(`Erro ao buscar presente no Supabase: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Lista todos os presentes
 * @returns {Promise<Array>} - Lista de presentes
 */
async function getAllGifts() {
  try {
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar presentes no Supabase: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Cria um novo presente
 * @param {Object} giftData - Dados do presente
 * @returns {Promise<Object>} - Dados do presente criado
 */
async function createGift(giftData) {
  try {
    const insertData = {
      name: giftData.name,
      price: giftData.price
    };

    // Adiciona image_url se fornecido (aceita imageUrl ou image_url)
    // Remove espaços, quebras de linha e caracteres invisíveis
    const imageUrl = giftData.imageUrl || giftData.image_url;
    if (imageUrl && imageUrl.trim() !== '') {
      insertData.image_url = imageUrl.trim().replace(/\s+/g, '').replace(/\n/g, '');
    }

    const { data, error } = await supabase
      .from('gifts')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar presente no Supabase: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getGiftById,
  getAllGifts,
  createGift
};
