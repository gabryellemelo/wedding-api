import express, { Request, Response } from 'express';
import axios, { isAxiosError } from 'axios';

const router = express.Router();

const REQUEST_TIMEOUT = 10000;
const CACHE_MAX_AGE = 31536000;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

function isValidImageUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return { valid: false, error: 'URL deve usar protocolo HTTP ou HTTPS' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'URL inválida' };
  }
}

function isValidImageContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return ALLOWED_CONTENT_TYPES.some(type => contentType.toLowerCase().startsWith(type));
}

router.get('/proxy', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Parâmetro "url" é obrigatório'
      });
    }

    const urlValidation = isValidImageUrl(url);
    if (!urlValidation.valid) {
      return res.status(400).json({
        error: urlValidation.error || 'URL inválida'
      });
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Referer': 'https://drive.google.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: REQUEST_TIMEOUT,
      maxContentLength: MAX_IMAGE_SIZE,
      maxBodyLength: MAX_IMAGE_SIZE
    });

    const contentType = response.headers['content-type'];
    
    if (!isValidImageContentType(contentType)) {
      return res.status(400).json({
        error: 'URL não retorna uma imagem válida'
      });
    }

    const imageBuffer = Buffer.from(response.data);
    
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      return res.status(413).json({
        error: 'Imagem muito grande'
      });
    }

    res.set('Content-Type', contentType || 'image/jpeg');
    res.set('Cache-Control', `public, max-age=${CACHE_MAX_AGE}`);
    res.set('Access-Control-Allow-Origin', '*');

    return res.send(imageBuffer);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao fazer proxy da imagem:', errorMessage);
    
    if (isAxiosError(error)) {
      if (error.response) {
        return res.status(error.response.status).json({
          error: 'Erro ao buscar imagem',
          message: errorMessage
        });
      }
      
      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({
          error: 'Timeout ao buscar imagem'
        });
      }
      
      if (error.code === 'ERR_FR_TOO_MANY_REDIRECTS') {
        return res.status(400).json({
          error: 'URL com muitos redirecionamentos'
        });
      }
    }
    
    return res.status(500).json({
      error: 'Erro interno ao buscar imagem',
      message: errorMessage
    });
  }
});

export default router;

