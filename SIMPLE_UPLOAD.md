# Como Fazer Upload de Imagens do Seu PC

## Opção 1: Via Interface do Supabase (Mais Fácil)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Storage** no menu lateral
4. Clique no bucket `wedding-images` (ou crie se não existir)
5. Clique em **Upload file** ou arraste a imagem
6. Após fazer upload, clique na imagem
7. Copie a **Public URL** que aparece
8. Use essa URL no campo `imageUrl` ao criar o presente

## Opção 2: Via API (Postman/Insomnia)

### Criar o bucket primeiro (se não existir):

1. No Supabase Dashboard > Storage
2. Clique em **Create a new bucket**
3. Nome: `wedding-images`
4. Marque como **Public bucket**
5. Crie o bucket

### Fazer upload via API:

```bash
POST http://localhost:3000/api/upload/image
Content-Type: multipart/form-data

Body (form-data):
- image: [selecione o arquivo do seu PC]
- folder: gifts (opcional)
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://seu-projeto.supabase.co/storage/v1/object/public/wedding-images/gifts/1234567890-abc123.jpg"
}
```

Use essa `imageUrl` quando criar o presente!

## Opção 3: Via Script Simples (Node.js)

Crie um arquivo `upload-image.js`:

```javascript
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000';
const imagePath = process.argv[2]; // Caminho da imagem como argumento

if (!imagePath) {
  console.log('Uso: node upload-image.js /caminho/para/imagem.jpg');
  process.exit(1);
}

async function uploadImage() {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    formData.append('folder', 'gifts');

    const response = await fetch(`${API_URL}/api/upload/image`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Imagem enviada com sucesso!');
      console.log('URL:', data.imageUrl);
      console.log('\nUse essa URL ao criar o presente:');
      console.log(`"imageUrl": "${data.imageUrl}"`);
    } else {
      console.error('❌ Erro:', data.error);
    }
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

uploadImage();
```

**Uso:**
```bash
node upload-image.js /caminho/para/sua/imagem.jpg
```

## Opção 4: Direto pelo Postman/Insomnia (Recomendado)

1. Abra o Postman/Insomnia
2. Crie uma requisição `POST` para `http://localhost:3000/api/upload/image`
3. Vá na aba **Body**
4. Selecione **form-data**
5. Adicione um campo:
   - Key: `image` (tipo: File)
   - Value: Selecione o arquivo do seu PC
6. (Opcional) Adicione outro campo:
   - Key: `folder`
   - Value: `gifts`
7. Envie a requisição
8. Copie a `imageUrl` da resposta
9. Use essa URL no campo `imageUrl` ao criar o presente via `POST /api/gifts`

## 📝 Exemplo Completo

### 1. Upload da imagem:
```
POST /api/upload/image
form-data:
  image: [arquivo.jpg do seu PC]
  folder: gifts
```

**Resposta:**
```json
{
  "success": true,
  "imageUrl": "https://xxxxx.supabase.co/storage/v1/object/public/wedding-images/gifts/123.jpg"
}
```

### 2. Criar presente com a URL:
```
POST /api/gifts
{
  "name": "Jogo de Pratos",
  "price": 150.00,
  "imageUrl": "https://xxxxx.supabase.co/storage/v1/object/public/wedding-images/gifts/123.jpg"
}
```

Pronto! ✅

## ⚠️ Importante

Antes de usar o endpoint de upload, certifique-se de:
1. Ter criado o bucket `wedding-images` no Supabase
2. O bucket estar configurado como **público**
3. Ter configurado a `SUPABASE_SERVICE_ROLE_KEY` no `.env` (veja SETUP_STORAGE.md)
