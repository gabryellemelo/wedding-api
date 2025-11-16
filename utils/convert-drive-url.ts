interface ConvertedUrls {
  standard: string;
  thumbnail: string;
  alternative: string;
}

const FILE_ID_REGEX = /\/file\/d\/([a-zA-Z0-9_-]+)/;
const GOOGLE_DRIVE_BASE = 'https://drive.google.com';
const THUMBNAIL_SIZE = 'w1000';

function extractFileId(shareUrl: string): string {
  const match = shareUrl.match(FILE_ID_REGEX);

  if (!match || !match[1]) {
    throw new Error(
      'URL do Google Drive inválida. Formato esperado: https://drive.google.com/file/d/FILE_ID/view?usp=sharing'
    );
  }

  return match[1];
}

export function convertDriveUrl(shareUrl: string): ConvertedUrls {
  const fileId = extractFileId(shareUrl);

  return {
    standard: `${GOOGLE_DRIVE_BASE}/uc?export=view&id=${fileId}`,
    thumbnail: `${GOOGLE_DRIVE_BASE}/thumbnail?id=${fileId}&sz=${THUMBNAIL_SIZE}`,
    alternative: `${GOOGLE_DRIVE_BASE}/uc?export=download&id=${fileId}`
  };
}

if (require.main === module) {
  const url = process.argv[2];

  if (!url) {
    console.log('❌ Erro: URL não fornecida\n');
    console.log('Uso: ts-node utils/convert-drive-url.ts "URL_DO_GOOGLE_DRIVE"');
    console.log('\nExemplo:');
    console.log('  ts-node utils/convert-drive-url.ts "https://drive.google.com/file/d/1abc123/view?usp=sharing"');
    process.exit(1);
  }

  try {
    const urls = convertDriveUrl(url);
    console.log('\n✅ URLs convertidas:\n');
    console.log('📌 Formato padrão (recomendado):');
    console.log(`   ${urls.standard}`);
    console.log('\n📌 Formato thumbnail (alternativa):');
    console.log(`   ${urls.thumbnail}`);
    console.log('\n📌 Formato download (se os outros não funcionarem):');
    console.log(`   ${urls.alternative}`);
    console.log('\n💡 Teste cada uma no navegador e use a que funcionar!\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro:', errorMessage);
    process.exit(1);
  }
}

