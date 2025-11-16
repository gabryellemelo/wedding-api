# Guia de Integração Frontend

Este documento contém todas as informações necessárias para integrar o frontend com a API.

## 🔗 URL Base

**Desenvolvimento:**
```
http://localhost:3000
```

**Produção:**
```
https://seu-dominio.com
```

## 📡 Endpoints Disponíveis

### 1. Listar Presentes
```http
GET /api/gifts
```

**Response:**
```json
[
  {
    "id": "uuid-1",
    "name": "Jogo de Pratos",
    "price": 150.00,
    "image_url": "https://example.com/images/pratos.jpg",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
]
```

**Exemplo JavaScript/Fetch:**
```javascript
const response = await fetch('http://localhost:3000/api/gifts');
const gifts = await response.json();
console.log(gifts);
```

**Exemplo Axios:**
```javascript
import axios from 'axios';

const gifts = await axios.get('http://localhost:3000/api/gifts');
console.log(gifts.data);
```

---

### 2. Buscar Presente por ID
```http
GET /api/gifts/:id
```

**Exemplo:**
```javascript
const giftId = 'uuid-do-presente';
const response = await fetch(`http://localhost:3000/api/gifts/${giftId}`);
const gift = await response.json();
```

---

### 3. Criar Presente (Admin)
```http
POST /api/gifts
Content-Type: application/json

{
  "name": "Jogo de Pratos",
  "price": 150.00,
  "imageUrl": "https://example.com/images/pratos.jpg"
}
```

**Nota:** O campo `imageUrl` (ou `image_url`) é opcional.

**Exemplo:**
```javascript
const newGift = await fetch('http://localhost:3000/api/gifts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Jogo de Pratos',
    price: 150.00,
    imageUrl: 'https://example.com/images/pratos.jpg' // Opcional
  })
});
const createdGift = await newGift.json();
```

---

### 4. Criar Pagamento (Principal)
```http
POST /api/payments
Content-Type: application/json

{
  "customer": {
    "name": "João Silva",
    "email": "joao@example.com",
    "cpfCnpj": "12345678900",
    "phone": "47999999999"
  },
  "value": 100.00,
  "description": "Pagamento de casamento",
  "giftId": "uuid-do-presente", // OPCIONAL
  "creditCard": {
    "holderName": "JOAO SILVA",
    "number": "5162306219378829",
    "expiryMonth": "05",
    "expiryYear": "2025",
    "ccv": "318"
  },
  "creditCardHolderInfo": {
    "name": "João Silva",
    "email": "joao@example.com",
    "cpfCnpj": "12345678900",
    "postalCode": "01310100",
    "addressNumber": "277",
    "addressComplement": "Apto 401",
    "phone": "47999999999"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "pay_123456789",
  "status": "CONFIRMED",
  "value": 100.00,
  "paymentDate": "2024-01-15",
  "invoiceUrl": "https://sandbox.asaas.com/i/...",
  "transactionReceiptUrl": "https://sandbox.asaas.com/comprovantes/...",
  "customer": {
    "name": "João Silva",
    "email": "joao@example.com"
  },
  "gift": {
    "id": "uuid-do-presente",
    "name": "Jogo de Pratos",
    "price": 150.00,
    "image_url": "https://example.com/images/pratos.jpg"
  },
  "localId": "uuid-do-registro"
}
```

**Exemplo Completo com Tratamento de Erros:**
```javascript
async function createPayment(paymentData) {
  try {
    const response = await fetch('http://localhost:3000/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao processar pagamento');
    }

    return data;
  } catch (error) {
    console.error('Erro:', error);
    throw error;
  }
}

// Uso:
const payment = await createPayment({
  customer: {
    name: 'João Silva',
    email: 'joao@example.com',
    cpfCnpj: '12345678900',
    phone: '47999999999'
  },
  giftId: 'uuid-do-presente', // Opcional
  creditCard: {
    holderName: 'JOAO SILVA',
    number: '5162306219378829',
    expiryMonth: '05',
    expiryYear: '2025',
    ccv: '318'
  },
  creditCardHolderInfo: {
    name: 'João Silva',
    email: 'joao@example.com',
    cpfCnpj: '12345678900',
    postalCode: '01310100',
    addressNumber: '277',
    addressComplement: 'Apto 401',
    phone: '47999999999'
  }
});
```

---

### 5. Health Check
```http
GET /health
```

**Exemplo:**
```javascript
const response = await fetch('http://localhost:3000/health');
const { status } = await response.json();
console.log(status); // "ok"
```

---

## 🎯 Fluxo Completo de Integração

### Exemplo React/Next.js

```jsx
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function WeddingPayment() {
  const [gifts, setGifts] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
  const [loading, setLoading] = useState(false);

  // Carregar presentes
  useEffect(() => {
    async function loadGifts() {
      try {
        const response = await fetch(`${API_URL}/api/gifts`);
        const data = await response.json();
        setGifts(data);
      } catch (error) {
        console.error('Erro ao carregar presentes:', error);
      }
    }
    loadGifts();
  }, []);

  // Processar pagamento
  const handlePayment = async (formData) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          giftId: selectedGift?.id, // Usa o presente selecionado
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      // Sucesso!
      alert('Pagamento realizado com sucesso!');
      console.log('Pagamento:', data);
      
      // Redirecionar para comprovante ou página de sucesso
      if (data.transactionReceiptUrl) {
        window.open(data.transactionReceiptUrl, '_blank');
      }

    } catch (error) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Lista de presentes */}
      <h2>Escolha um Presente</h2>
      {gifts.map(gift => (
        <div key={gift.id}>
          <input
            type="radio"
            name="gift"
            value={gift.id}
            checked={selectedGift?.id === gift.id}
            onChange={() => setSelectedGift(gift)}
          />
          <label>
            {gift.name} - R$ {gift.price.toFixed(2)}
          </label>
        </div>
      ))}

      {/* Formulário de pagamento */}
      <button
        onClick={handlePayment}
        disabled={loading || !selectedGift}
      >
        {loading ? 'Processando...' : 'Pagar'}
      </button>
    </div>
  );
}
```

---

## 🔧 Configuração de Ambiente

### Variáveis de Ambiente (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
# ou em produção:
# NEXT_PUBLIC_API_URL=https://api.seudominio.com
```

### Usando no código:

```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
```

---

## ⚠️ Tratamento de Erros

### Códigos de Status HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Dados inválidos (validação)
- `404` - Não encontrado
- `500` - Erro interno do servidor

### Exemplo de Tratamento:

```javascript
async function handleApiCall(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new Error(`Dados inválidos: ${data.error}`);
        case 404:
          throw new Error('Recurso não encontrado');
        case 500:
          throw new Error('Erro interno do servidor');
        default:
          throw new Error(data.error || 'Erro desconhecido');
      }
    }

    return data;
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error;
  }
}
```

---

## 📝 Validações Importantes

### Campos Obrigatórios no Pagamento:

- `customer.name` ✅
- `customer.email` ✅
- `customer.cpfCnpj` ✅
- `creditCard.holderName` ✅
- `creditCard.number` ✅
- `creditCard.expiryMonth` ✅
- `creditCard.expiryYear` ✅
- `creditCard.ccv` ✅
- `creditCardHolderInfo.name` ✅
- `creditCardHolderInfo.email` ✅
- `creditCardHolderInfo.cpfCnpj` ✅
- `creditCardHolderInfo.postalCode` ✅

### Formato de Telefone:

O telefone pode ser enviado em qualquer formato, a API normaliza automaticamente:
- `47999999999` ✅
- `(47) 99999-9999` ✅
- `47 99999-9999` ✅

### Formato de CPF/CNPJ:

Pode ser enviado com ou sem formatação, a API limpa automaticamente:
- `12345678900` ✅
- `123.456.789-00` ✅

### Quando usar `giftId` vs `value`:

- **Com `giftId`**: O valor do presente será usado automaticamente
- **Sem `giftId`**: Use o campo `value` para definir um valor personalizado

---

## 🔒 Segurança

### ⚠️ Importante:

1. **NUNCA** exponha a API Key do Asaas no frontend
2. A API deve estar protegida por CORS configurado
3. Para produção, use HTTPS
4. Valide dados no frontend antes de enviar

### CORS:

A API já está configurada para aceitar requisições de qualquer origem (CORS habilitado). Em produção, recomenda-se restringir:

```javascript
// No backend (já configurado)
app.use(cors()); // Aceita todas as origens

// Em produção, configure:
app.use(cors({
  origin: 'https://seu-frontend.com'
}));
```

---

## 🧪 Exemplo Completo de Formulário

```jsx
import { useState } from 'react';

const API_URL = 'http://localhost:3000';

export default function PaymentForm() {
  const [formData, setFormData] = useState({
    customer: {
      name: '',
      email: '',
      cpfCnpj: '',
      phone: ''
    },
    creditCard: {
      holderName: '',
      number: '',
      expiryMonth: '',
      expiryYear: '',
      ccv: ''
    },
    creditCardHolderInfo: {
      name: '',
      email: '',
      cpfCnpj: '',
      postalCode: '',
      addressNumber: '',
      addressComplement: '',
      phone: ''
    },
    giftId: null
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Pagamento realizado com sucesso!');
        // Limpar formulário ou redirecionar
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      alert('Erro ao processar pagamento');
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Campos do formulário */}
      <input
        type="text"
        placeholder="Nome"
        value={formData.customer.name}
        onChange={(e) => setFormData({
          ...formData,
          customer: { ...formData.customer, name: e.target.value }
        })}
        required
      />
      {/* ... outros campos ... */}
      <button type="submit">Pagar</button>
    </form>
  );
}
```

---

## 📦 Bibliotecas Recomendadas

### Para React/Next.js:
- `axios` - Cliente HTTP
- `react-hook-form` - Gerenciamento de formulários
- `zod` - Validação de schema

### Para Vue:
- `axios` - Cliente HTTP
- `vee-validate` - Validação de formulários

### Para Vanilla JS:
- `fetch` - Nativo do browser
- `axios` - Alternativa ao fetch

---

## 🔗 Links Úteis

- Documentação da API: Veja `README.md`
- Health Check: `GET /health`
- Teste de endpoint: Use Postman ou Insomnia

---

## ❓ Dúvidas Comuns

**P: Posso usar `giftId` e `value` ao mesmo tempo?**
R: Não. Se `giftId` for fornecido, o `value` será ignorado e o valor do presente será usado.

**P: O que acontece se o presente não for encontrado?**
R: A API retorna erro 400 com a mensagem "Presente não encontrado".

**P: Como saber se o pagamento foi confirmado?**
R: O status virá na resposta (`status: "CONFIRMED"`). Você também pode configurar webhooks para receber notificações automáticas.

**P: Posso testar sem cartão de crédito real?**
R: Sim! Use o ambiente sandbox do Asaas. Veja cartões de teste na documentação do Asaas.
