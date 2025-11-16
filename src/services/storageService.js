const supabase = require('../config/database');
const supabaseStorage = require('../config/database').storage;

/**
 * Faz upload de uma imagem para o Supabase Storage
 * @param {Buffer} fileBuffer - Buffer do arquivo
 * @param {string} fileName - Nome do arquivo
 * @param {string} folder - Pasta onde salvar (ex: 'gifts')
 * @returns {Promise<string>} - URL pública da imagem
 */
async function uploadImage(fileBuffer, fileName, folder = 'gifts') {
  try {
    // Gera um nome único para o arquivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${timestamp}-${randomString}.${fileExtension}`;
    const filePath = `${folder}/${uniqueFileName}`;

    // Faz upload para o Supabase Storage
    const { data, error } = await supabaseStorage.storage
      .from('wedding-images')
      .upload(filePath, fileBuffer, {
        contentType: getContentType(fileExtension),
        upsert: false
      });

    if (error) {
      throw new Error(`Erro ao fazer upload da imagem: ${error.message}`);
    }

    // Obtém a URL pública da imagem
    const { data: publicUrlData } = supabaseStorage.storage
      .from('wedding-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    throw error;
  }
}

/**
 * Deleta uma imagem do Supabase Storage
 * @param {string} imageUrl - URL da imagem a ser deletada
 * @returns {Promise<boolean>}
 */
async function deleteImage(imageUrl) {
  try {
    // Extrai o caminho do arquivo da URL
    const urlParts = imageUrl.split('/');
    const filePath = urlParts.slice(urlParts.indexOf('wedding-images') + 1).join('/');

    const { error } = await supabaseStorage.storage
      .from('wedding-images')
      .remove([filePath]);

    if (error) {
      throw new Error(`Erro ao deletar imagem: ${error.message}`);
    }

    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Retorna o content-type baseado na extensão do arquivo
 */
function getContentType(extension) {
  const types = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml'
  };

  return types[extension.toLowerCase()] || 'image/jpeg';
}

module.exports = {
  uploadImage,
  deleteImage
};
