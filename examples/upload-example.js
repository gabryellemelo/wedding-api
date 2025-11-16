/**
 * Exemplo de como fazer upload de imagens e criar presentes
 */

const API_URL = 'http://localhost:3000';

// ============================================
// 1. Fazer upload de uma imagem
// ============================================
async function uploadImage(imageFile, folder = 'gifts') {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('folder', folder);

    const response = await fetch(`${API_URL}/api/upload/image`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao fazer upload');
    }

    return data.imageUrl;
  } catch (error) {
    console.error('Erro no upload:', error);
    throw error;
  }
}

// ============================================
// 2. Criar presente com imagem
// ============================================
async function createGiftWithImage(name, price, imageFile) {
  try {
    // Primeiro faz upload da imagem
    console.log('Fazendo upload da imagem...');
    const imageUrl = await uploadImage(imageFile);
    console.log('Imagem enviada:', imageUrl);

    // Depois cria o presente com a URL da imagem
    console.log('Criando presente...');
    const response = await fetch(`${API_URL}/api/gifts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
        price: price,
        imageUrl: imageUrl
      })
    });

    const gift = await response.json();

    if (!response.ok) {
      throw new Error(gift.error || 'Erro ao criar presente');
    }

    console.log('Presente criado:', gift);
    return gift;
  } catch (error) {
    console.error('Erro ao criar presente:', error);
    throw error;
  }
}

// ============================================
// 3. Exemplo HTML/JavaScript para usar no frontend
// ============================================
/*
<!DOCTYPE html>
<html>
<head>
  <title>Upload de Imagem</title>
</head>
<body>
  <input type="file" id="imageInput" accept="image/*" />
  <input type="text" id="giftName" placeholder="Nome do presente" />
  <input type="number" id="giftPrice" placeholder="Preço" />
  <button onclick="createGift()">Criar Presente</button>

  <script>
    const API_URL = 'http://localhost:3000';

    async function createGift() {
      const imageInput = document.getElementById('imageInput');
      const name = document.getElementById('giftName').value;
      const price = parseFloat(document.getElementById('giftPrice').value);

      if (!imageInput.files[0] || !name || !price) {
        alert('Preencha todos os campos');
        return;
      }

      try {
        // 1. Upload da imagem
        const formData = new FormData();
        formData.append('image', imageInput.files[0]);
        
        const uploadResponse = await fetch(`${API_URL}/api/upload/image`, {
          method: 'POST',
          body: formData
        });
        
        const uploadData = await uploadResponse.json();
        
        if (!uploadResponse.ok) {
          throw new Error(uploadData.error);
        }

        // 2. Criar presente com a URL da imagem
        const giftResponse = await fetch(`${API_URL}/api/gifts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name,
            price: price,
            imageUrl: uploadData.imageUrl
          })
        });

        const gift = await giftResponse.json();
        
        if (!giftResponse.ok) {
          throw new Error(gift.error);
        }

        alert('Presente criado com sucesso!');
        console.log('Presente:', gift);
      } catch (error) {
        alert(`Erro: ${error.message}`);
      }
    }
  </script>
</body>
</html>
*/

// ============================================
// 4. Exemplo React
// ============================================
/*
import { useState } from 'react';

const API_URL = 'http://localhost:3000';

function GiftForm() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload da imagem
      const formData = new FormData();
      formData.append('image', image);
      
      const uploadRes = await fetch(`${API_URL}/api/upload/image`, {
        method: 'POST',
        body: formData
      });
      
      const uploadData = await uploadRes.json();
      
      if (!uploadRes.ok) throw new Error(uploadData.error);

      // Criar presente
      const giftRes = await fetch(`${API_URL}/api/gifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price: parseFloat(price),
          imageUrl: uploadData.imageUrl
        })
      });

      const gift = await giftRes.json();
      
      if (!giftRes.ok) throw new Error(gift.error);

      alert('Presente criado!');
      // Limpar formulário
      setName('');
      setPrice('');
      setImage(null);
    } catch (error) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do presente"
        required
      />
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Preço"
        required
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files[0])}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Criando...' : 'Criar Presente'}
      </button>
    </form>
  );
}
*/

module.exports = {
  uploadImage,
  createGiftWithImage
};
