# Configuração do Supabase Storage para Upload de Imagens

Este guia explica como configurar o Supabase Storage para fazer upload de imagens dos presentes.

## 📋 Passo a Passo

### 1. Criar Bucket no Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Storage** no menu lateral
4. Clique em **Create a new bucket**
5. Configure:
   - **Name**: `wedding-images`
   - **Public bucket**: ✅ Marque como público (para acessar as imagens via URL)
6. Clique em **Create bucket**

### 2. Configurar Política de Acesso (RLS)

1. No bucket criado, vá em **Policies**
2. Clique em **New Policy**
3. Selecione **For full customization**, clique em **Use this template**
4. Configure a política:

**Policy Name:** `Allow public read access`
**Allowed operation:** SELECT
**Policy definition:**
```sql
bucket_id = 'wedding-images'
```

5. Crie outra política:

**Policy Name:** `Allow authenticated insert`
**Allowed operation:** INSERT
**Policy definition:**
```sql
bucket_id = 'wedding-images'
```

**USING expression:**
```sql
true
```

6. Opcionalmente, crie política para UPDATE e DELETE se necessário.

### 3. Configurar Service Role Key (para uploads do backend)

⚠️ **IMPORTANTE**: Para uploads via API (backend), você precisa usar a **Service Role Key**, não a **anon key**.

1. No Supabase Dashboard, vá em **Settings** > **API**
2. Copie a **service_role key** (mantenha segura, nunca exponha no frontend!)
3. Adicione no seu `.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

### 4. Atualizar Configuração do Banco

Atualize o arquivo `src/config/database.js` para suportar uploads:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

// Cliente para operações normais (usa anon key)
const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente para operações de storage (usa service role key se disponível)
const supabaseStorage = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
module.exports.storage = supabaseStorage;
```

## ✅ Teste

Após configurar, teste o upload:

```bash
curl -X POST http://localhost:3000/api/upload/image \
  -F "image=@/caminho/para/sua/imagem.jpg" \
  -F "folder=gifts"
```

Se tudo estiver correto, você receberá uma resposta com a URL da imagem:

```json
{
  "success": true,
  "imageUrl": "https://seu-projeto.supabase.co/storage/v1/object/public/wedding-images/gifts/1234567890-abc123.jpg",
  "message": "Imagem enviada com sucesso"
}
```

## 🔒 Segurança

- **Nunca exponha a Service Role Key no frontend**
- Use apenas a **anon key** no frontend
- Configure políticas RLS adequadas
- Limite o tamanho dos arquivos (atualmente 5MB)
