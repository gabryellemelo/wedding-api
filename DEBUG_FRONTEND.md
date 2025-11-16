# Debug - Por que a imagem não aparece no frontend?

Se a URL funciona no navegador mas não aparece no frontend, pode ser:

## 1. Verificar a URL no banco

A URL deve estar exatamente assim (sem espaços, quebras de linha, etc):
```
https://drive.google.com/uc?export=view&id=1V9H2YybV_vgqO0HsYiZGy4AFrrJcnImY
```

## 2. Verificar a resposta da API

Abra o console do navegador (F12) e veja o que a API retorna:
```javascript
// Deve retornar:
{
  "id": "...",
  "name": "Jogo de Pratos",
  "image_url": "https://drive.google.com/uc?export=view&id=1V9H2YybV_vgqO0HsYiZGy4AFrrJcnImY"
}
```

## 3. Problemas comuns no frontend

### Problema A: Tag <img> não está usando a URL

**Errado:**
```html
<img src="{gift.image_url}" />
```

**Correto:**
```html
<img src={gift.image_url} />
```
ou
```html
<img src={`${gift.image_url}`} />
```

### Problema B: URL com espaços/quebras de linha

No JavaScript, limpe a URL antes de usar:
```javascript
const imageUrl = gift.image_url?.trim().replace(/\s+/g, '');
```

### Problema C: CORS (Cross-Origin Resource Sharing)

Se aparecer erro de CORS no console, o Google Drive pode estar bloqueando. Soluções:

**Solução 1: Adicionar atributos na tag img**
```html
<img 
  src={gift.image_url} 
  crossOrigin="anonymous"
  referrerPolicy="no-referrer"
/>
```

**Solução 2: Usar proxy (temporário para desenvolvimento)**
```javascript
const imageUrl = `https://images.weserv.nl/?url=${encodeURIComponent(gift.image_url)}`;
```

**Solução 3: Verificar se precisa de referer**
Alguns serviços bloqueiam se não houver referer. Tente:
```html
<img src={gift.image_url} referrerPolicy="unsafe-url" />
```

## 4. Exemplo completo React/Next.js

```jsx
function GiftCard({ gift }) {
  // Limpa a URL de espaços e quebras de linha
  const imageUrl = gift.image_url?.trim().replace(/[\n\r\t]/g, '') || '';
  
  return (
    <div>
      {imageUrl ? (
        <img 
          src={imageUrl}
          alt={gift.name}
          onError={(e) => {
            console.error('Erro ao carregar imagem:', imageUrl);
            // Fallback se não carregar
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <div>Sem imagem</div>
      )}
      <h3>{gift.name}</h3>
      <p>R$ {gift.price}</p>
    </div>
  );
}
```

## 5. Debug rápido no console

Abra o console do navegador (F12) e execute:

```javascript
// Ver se a URL está correta
const url = "https://drive.google.com/uc?export=view&id=1V9H2YybV_vgqO0HsYiZGy4AFrrJcnImY";
console.log('URL:', url);
console.log('Tamanho:', url.length);

// Testar se a imagem carrega
const img = new Image();
img.onload = () => console.log('✅ Imagem carregou!');
img.onerror = () => console.log('❌ Erro ao carregar imagem');
img.src = url;
```

## 6. Verificar Network Tab

1. Abra DevTools (F12)
2. Vá em **Network**
3. Recarregue a página
4. Procure pela requisição da imagem
5. Veja o status:
   - ✅ **200** = Imagem carregou
   - ❌ **CORS error** = Bloqueio do Google Drive
   - ❌ **404** = URL incorreta

## 7. Solução definitiva se CORS continuar

Se o Google Drive continuar bloqueando, você pode:

1. **Fazer download e hospedar em outro lugar**
2. **Usar um serviço de proxy para imagens**
3. **Configurar um servidor proxy no seu backend**
4. **Usar Google Drive API** (mais complexo)

Mas primeiro, verifique se a URL está sendo passada corretamente no frontend!
