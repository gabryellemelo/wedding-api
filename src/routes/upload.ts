import express, { Request, Response } from 'express';
import multer from 'multer';
import { uploadImage, deleteImage } from '../services/storageService';

const router = express.Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 10;
const DEFAULT_FOLDER = 'gifts';
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
const FOLDER_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

function isValidImageFile(file: Express.Multer.File): boolean {
  const mimeTypeValid = ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase());
  const extension = file.originalname.toLowerCase().split('.').pop() || '';
  const extensionValid = ALLOWED_EXTENSIONS.includes(extension);
  return mimeTypeValid && extensionValid;
}

function validateFolderName(folder: string): { valid: boolean; error?: string } {
  if (!folder || typeof folder !== 'string') {
    return { valid: false, error: 'Nome da pasta inválido' };
  }

  if (!FOLDER_NAME_REGEX.test(folder)) {
    return { valid: false, error: 'Nome da pasta contém caracteres inválidos. Use apenas letras, números, hífens e underscores' };
  }

  if (folder.length > 50) {
    return { valid: false, error: 'Nome da pasta muito longo (máximo 50 caracteres)' };
  }

  return { valid: true };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (_req, file, cb) => {
    if (isValidImageFile(file)) {
      return cb(null, true);
    }
    cb(new Error(`Apenas imagens são permitidas (${ALLOWED_EXTENSIONS.join(', ')})`));
  }
});

router.post('/image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Nenhuma imagem foi enviada'
      });
    }

    const folderName = (req.body.folder as string) || DEFAULT_FOLDER;
    const folderValidation = validateFolderName(folderName);
    
    if (!folderValidation.valid) {
      return res.status(400).json({
        error: folderValidation.error || 'Nome da pasta inválido'
      });
    }

    const imageUrl = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      folderName
    );

    return res.status(200).json({
      success: true,
      imageUrl: imageUrl,
      message: 'Imagem enviada com sucesso'
    });

  } catch (error) {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      }
      return res.status(400).json({
        error: error.message
      });
    }

    console.error('Erro ao fazer upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer upload da imagem';
    return res.status(500).json({
      error: errorMessage
    });
  }
});

router.post('/images', upload.array('images', MAX_FILES), async (req: Request, res: Response) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Nenhuma imagem foi enviada'
      });
    }

    const folderName = (req.body.folder as string) || DEFAULT_FOLDER;
    const folderValidation = validateFolderName(folderName);
    
    if (!folderValidation.valid) {
      return res.status(400).json({
        error: folderValidation.error || 'Nome da pasta inválido'
      });
    }

    const imageUrls: string[] = [];

    for (const file of req.files as Express.Multer.File[]) {
      const imageUrl = await uploadImage(
        file.buffer,
        file.originalname,
        folderName
      );
      imageUrls.push(imageUrl);
    }

    return res.status(200).json({
      success: true,
      imageUrls: imageUrls,
      count: imageUrls.length,
      message: `${imageUrls.length} imagem(ns) enviada(s) com sucesso`
    });

  } catch (error) {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: `Número máximo de arquivos: ${MAX_FILES}`
        });
      }
      return res.status(400).json({
        error: error.message
      });
    }

    console.error('Erro ao fazer upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer upload das imagens';
    return res.status(500).json({
      error: errorMessage
    });
  }
});

router.delete('/image', async (req: Request, res: Response) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({
        error: 'URL da imagem é obrigatória'
      });
    }

    if (!isValidUrl(imageUrl)) {
      return res.status(400).json({
        error: 'URL da imagem inválida'
      });
    }

    await deleteImage(imageUrl);

    return res.status(200).json({
      success: true,
      message: 'Imagem deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao deletar imagem';
    return res.status(500).json({
      error: errorMessage
    });
  }
});

export default router;

