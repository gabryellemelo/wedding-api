const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * GET /api/images/proxy
 * Faz proxy de imagens para contornar problemas de CORS
 * 
 * Query params:
 * - url: URL da imagem a ser buscada
 */
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        error: 'Parâmetro "url" é obrigatório'
      });
    }

    // Valida se é uma URL válida
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'URL inválida'
      });
    }

    // Faz requisição para a imagem
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Referer': 'https://drive.google.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000 // 10 segundos
    });

    // Define o content-type correto
    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache de 1 ano
    res.set('Access-Control-Allow-Origin', '*'); // Permite CORS

    // Envia a imagem
    res.send(Buffer.from(response.data));

  } catch (error) {
    console.error('Erro ao fazer proxy da imagem:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: 'Erro ao buscar imagem',
        message: error.message
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        error: 'Timeout ao buscar imagem'
      });
    } else {
      res.status(500).json({
        error: 'Erro interno ao buscar imagem',
        message: error.message
      });
    }
  }
});

module.exports = router;
