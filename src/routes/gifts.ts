import express, { Request, Response } from 'express';
import { getAllGifts, getGiftById, createGift } from '../services/giftsService';
import { Gift } from '../types';

const router = express.Router();

interface CreateGiftRequestBody {
  name?: string;
  price?: number | string;
  imageUrl?: string;
  image_url?: string;
}

function normalizeGiftImage(gift: Gift) {
  const cleanImageUrl = gift.image_url?.trim().replace(/[\n\r\t]/g, '') || null;
  return {
    ...gift,
    image_url: cleanImageUrl,
    image: cleanImageUrl,
    imageUrl: cleanImageUrl
  };
}

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const gifts = await getAllGifts();
    const normalizedGifts = gifts.map(normalizeGiftImage);
    return res.status(200).json(normalizedGifts);
  } catch (error) {
    console.error('Erro ao listar presentes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return res.status(500).json({
      error: errorMessage
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: 'ID inválido. Deve ser um UUID válido.'
      });
    }

    const gift = await getGiftById(id);

    if (!gift) {
      return res.status(404).json({
        error: 'Presente não encontrado'
      });
    }

    const normalizedGift = normalizeGiftImage(gift);
    return res.status(200).json(normalizedGift);
  } catch (error) {
    console.error('Erro ao buscar presente:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return res.status(500).json({
      error: errorMessage
    });
  }
});

router.post('/', async (req: Request<{}, {}, CreateGiftRequestBody>, res: Response) => {
  try {
    const { name, price, imageUrl, image_url } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: 'Nome do presente é obrigatório e deve ser uma string válida'
      });
    }

    if (price === undefined || price === null) {
      return res.status(400).json({
        error: 'Preço do presente é obrigatório'
      });
    }

    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        error: 'Preço do presente deve ser um número maior que zero'
      });
    }

    const gift = await createGift({
      name: name.trim(),
      price: numericPrice,
      imageUrl: imageUrl || image_url
    });

    const normalizedGift = normalizeGiftImage(gift);
    return res.status(201).json(normalizedGift);
  } catch (error) {
    console.error('Erro ao criar presente:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return res.status(500).json({
      error: errorMessage
    });
  }
});

export default router;

