# Solução para Erro de CORS com Google Drive

O Google Drive está bloqueando a imagem por CORS. Aqui estão as soluções:

## Solução 1: Usar Proxy de Imagens (Mais Rápida)

No seu código React, use um serviço de proxy de imagens:

```jsx
// Função para adicionar proxy à URL
const getImageUrl = (url) => {
  if (!url) return null;
  // Usa um serviço de proxy que contorna CORS
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
};

// No componente:
<img 
  src={getImageUrl(gift.image)} 
  alt={gift.name}
  className="..."
  onError={(e) => {
    console.error('Erro ao carregar imagem:', gift.image);
  }}
/>
```

## Solução 2: Formato Alternativo do Google Drive

Tente este formato no banco (atualize a URL):

```sql
UPDATE gifts 
SET image_url = 'https://drive.google.com/thumbnail?id=1V9H2YybV_vgqO0HsYiZGy4AFrrJcnImY&sz=w1000'
WHERE id = '8e899896-f404-4312-bfa2-f38e75e3bb63';
```

## Solução 3: Backend como Proxy

Criar um endpoint no backend que faz proxy da imagem:

```javascript
// No seu backend Express
app.get('/api/images/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL requerida' });
  
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Referer': 'https://drive.google.com/'
      }
    });
    
    res.set('Content-Type', response.headers['content-type']);
    res.send(Buffer.from(response.data));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar imagem' });
  }
});
```

E no frontend:
```jsx
<img src={`http://localhost:3000/api/images/proxy?url=${encodeURIComponent(gift.image)}`} />
```

## Solução 4: Atributos na Tag img

Tente adicionar estes atributos:

```jsx
<img 
  src={gift.image} 
  alt={gift.name}
  crossOrigin="anonymous"
  referrerPolicy="no-referrer"
  className="..."
/>
```

## Solução 5: Usar Outro Serviço (Mais Confiável)

Se nada funcionar, use outro serviço:
- **Cloudinary** (grátis até certo limite)
- **GitHub** (repositório público)
- **Supabase Storage** (que você já tem configurado!)

Qual você prefere tentar primeiro?
