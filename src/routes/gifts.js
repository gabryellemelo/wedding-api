const express = require('express');
const router = express.Router();
const giftsService = require('../services/giftsService');

/**
 * GET /api/gifts
 * Lista todos os presentes disponíveis
 */
router.get('/', async (req, res) => {
  try {
    const gifts = await giftsService.getAllGifts();
    // Normaliza os campos para facilitar no frontend
    const normalizedGifts = gifts.map(gift => {
      // Limpa a URL de quebras de linha e espaços
      const cleanImageUrl = gift.image_url?.trim().replace(/[\n\r\t]/g, '') || null;
      return {
        ...gift,
        image_url: cleanImageUrl,
        image: cleanImageUrl, // Adiciona 'image' como alias de 'image_url'
        imageUrl: cleanImageUrl // Também adiciona 'imageUrl'
      };
    });
    res.status(200).json(normalizedGifts);
  } catch (error) {
    console.error('Erro ao listar presentes:', error);
    res.status(500).json({
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/gifts/:id
 * Busca um presente pelo ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const gift = await giftsService.getGiftById(id);

    if (!gift) {
      return res.status(404).json({
        error: 'Presente não encontrado'
      });
    }

    // Normaliza os campos para facilitar no frontend
    // Limpa a URL de quebras de linha e espaços
    const cleanImageUrl = gift.image_url?.trim().replace(/[\n\r\t]/g, '') || null;
    const normalizedGift = {
      ...gift,
      image_url: cleanImageUrl,
      image: cleanImageUrl, // Adiciona 'image' como alias de 'image_url'
      imageUrl: cleanImageUrl // Também adiciona 'imageUrl'
    };

    res.status(200).json(normalizedGift);
  } catch (error) {
    console.error('Erro ao buscar presente:', error);
    res.status(500).json({
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/gifts
 * Cria um novo presente
 */
router.post('/', async (req, res) => {
  try {
    const { name, price, imageUrl, image_url } = req.body;

    // Validação
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Nome do presente é obrigatório'
      });
    }

    if (!price || price <= 0) {
      return res.status(400).json({
        error: 'Preço do presente deve ser maior que zero'
      });
    }

    const gift = await giftsService.createGift({ 
      name, 
      price, 
      imageUrl: imageUrl || image_url 
    });

    res.status(201).json(gift);
  } catch (error) {
    console.error('Erro ao criar presente:', error);
    res.status(500).json({
      error: error.message || 'Erro interno do servidor'
    });
  }
});

module.exports = router;
