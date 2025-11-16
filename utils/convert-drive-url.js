/**
 * Utilitário para converter URL do Google Drive para formato que funciona em <img>
 * 
 * Uso: node utils/convert-drive-url.js "https://drive.google.com/file/d/ID/view?usp=sharing"
 */

function convertDriveUrl(shareUrl) {
  // Extrai o FILE_ID da URL compartilhada
  const match = shareUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  
  if (!match || !match[1]) {
    throw new Error('URL do Google Drive inválida. Formato esperado: https://drive.google.com/file/d/FILE_ID/view?usp=sharing');
  }
  
  const fileId = match[1];
  
  // Retorna a URL no formato correto para imagens
  // Tenta múltiplos formatos que funcionam com Google Drive
  return {
    standard: `https://drive.google.com/uc?export=view&id=${fileId}`,
    thumbnail: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
    alternative: `https://drive.google.com/uc?export=download&id=${fileId}`
  };
}

// Se executado diretamente
if (require.main === module) {
  const url = process.argv[2];
  
  if (!url) {
    console.log('❌ Erro: URL não fornecida\n');
    console.log('Uso: node utils/convert-drive-url.js "URL_DO_GOOGLE_DRIVE"');
    console.log('\nExemplo:');
    console.log('  node utils/convert-drive-url.js "https://drive.google.com/file/d/1abc123/view?usp=sharing"');
    process.exit(1);
  }
  
  try {
    const urls = convertDriveUrl(url);
    console.log('\n✅ URLs convertidas:\n');
    console.log('📌 Formato padrão (recomendado):');
    console.log('   ' + urls.standard);
    console.log('\n📌 Formato thumbnail (alternativa):');
    console.log('   ' + urls.thumbnail);
    console.log('\n📌 Formato download (se os outros não funcionarem):');
    console.log('   ' + urls.alternative);
    console.log('\n💡 Teste cada uma no navegador e use a que funcionar!\n');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

module.exports = { convertDriveUrl };
