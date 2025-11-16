const express = require('express');
const router = express.Router();
const multer = require('multer');
const storageService = require('../services/storageService');

// Configuração do multer para processar uploads em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Aceita apenas imagens
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)'));
  }
});

/**
 * POST /api/upload/image
 * Faz upload de uma imagem para o Supabase Storage
 */
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Nenhuma imagem foi enviada'
      });
    }

    // Pasta opcional (default: 'gifts')
    const folder = req.body.folder || 'gifts';

    // Faz upload da imagem
    const imageUrl = await storageService.uploadImage(
      req.file.buffer,
      req.file.originalname,
      folder
    );

    res.status(200).json({
      success: true,
      imageUrl: imageUrl,
      message: 'Imagem enviada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    res.status(500).json({
      error: error.message || 'Erro ao fazer upload da imagem'
    });
  }
});

/**
 * POST /api/upload/images
 * Faz upload de múltiplas imagens
 */
router.post('/images', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Nenhuma imagem foi enviada'
      });
    }

    const folder = req.body.folder || 'gifts';
    const imageUrls = [];

    // Faz upload de cada imagem
    for (const file of req.files) {
      const imageUrl = await storageService.uploadImage(
        file.buffer,
        file.originalname,
        folder
      );
      imageUrls.push(imageUrl);
    }

    res.status(200).json({
      success: true,
      imageUrls: imageUrls,
      count: imageUrls.length,
      message: `${imageUrls.length} imagem(ns) enviada(s) com sucesso`
    });

  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    res.status(500).json({
      error: error.message || 'Erro ao fazer upload das imagens'
    });
  }
});

/**
 * DELETE /api/upload/image
 * Deleta uma imagem do storage
 */
router.delete('/image', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: 'URL da imagem é obrigatória'
      });
    }

    await storageService.deleteImage(imageUrl);

    res.status(200).json({
      success: true,
      message: 'Imagem deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    res.status(500).json({
      error: error.message || 'Erro ao deletar imagem'
    });
  }
});

module.exports = router;
