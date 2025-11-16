import { supabaseStorage } from '../config/database';

const STORAGE_BUCKET = 'wedding-images';
const DEFAULT_FOLDER = 'gifts';
const DEFAULT_EXTENSION = 'jpg';
const RANDOM_STRING_LENGTH = 13;
const RANDOM_STRING_START = 2;

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml'
};

const DEFAULT_CONTENT_TYPE = 'image/jpeg';

function getContentType(extension: string): string {
  return CONTENT_TYPES[extension.toLowerCase()] || DEFAULT_CONTENT_TYPE;
}

function generateUniqueFileName(fileName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(RANDOM_STRING_START, RANDOM_STRING_START + RANDOM_STRING_LENGTH);
  const fileExtension = fileName.split('.').pop() || DEFAULT_EXTENSION;
  return `${timestamp}-${randomString}.${fileExtension}`;
}

function extractFilePathFromUrl(imageUrl: string): string {
  const urlParts = imageUrl.split('/');
  const bucketIndex = urlParts.indexOf(STORAGE_BUCKET);
  if (bucketIndex === -1) {
    throw new Error('URL da imagem inválida: bucket não encontrado');
  }
  return urlParts.slice(bucketIndex + 1).join('/');
}

export async function uploadImage(
  fileBuffer: Buffer,
  fileName: string,
  folder: string = DEFAULT_FOLDER
): Promise<string> {
  const fileExtension = fileName.split('.').pop() || DEFAULT_EXTENSION;
  const uniqueFileName = generateUniqueFileName(fileName);
  const filePath = `${folder}/${uniqueFileName}`;

  const { error } = await supabaseStorage.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: getContentType(fileExtension),
      upsert: false
    });

  if (error) {
    throw new Error(`Erro ao fazer upload da imagem: ${error.message}`);
  }

  const { data: publicUrlData } = supabaseStorage.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

export async function deleteImage(imageUrl: string): Promise<boolean> {
  const filePath = extractFilePathFromUrl(imageUrl);

  const { error } = await supabaseStorage.storage
    .from(STORAGE_BUCKET)
    .remove([filePath]);

  if (error) {
    throw new Error(`Erro ao deletar imagem: ${error.message}`);
  }

  return true;
}

