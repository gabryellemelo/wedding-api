# Wedding API - Integração Asaas + Supabase

API REST para criação de cobranças com cartão de crédito através do Asaas, com persistência no Supabase.

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- Conta no [Supabase](https://supabase.com)
- Conta no [Asaas](https://www.asaas.com)

## 🚀 Configuração Inicial

### 1. Configuração do Supabase

1. Acesse https://supabase.com e crie uma conta ou faça login
2. Clique em "New Project"
3. Preencha:
   - **Name**: Nome do projeto (ex: "wedding-api")
   - **Database Password**: Escolha uma senha forte (salve para uso posterior)
   - **Region**: Escolha a região mais próxima
   - **Pricing Plan**: Free tier (ou outro conforme necessidade)
4. Aguarde a criação do projeto (2-3 minutos)
5. Após criação, vá em **Settings** > **API**
6. Copie as seguintes informações:
   - **Project URL** (será `SUPABASE_URL`)
   - **anon public** key (será `SUPABASE_KEY`)
7. Vá em **SQL Editor** e execute o seguinte comando:

**Se você já tem a tabela `payments` criada (caso mais comum), execute apenas a migração:**

```sql
-- Criar tabela de presentes
CREATE TABLE IF NOT EXISTS gifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna image_url se a tabela já existe
ALTER TABLE gifts 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Adicionar coluna gift_id na tabela payments (se não existir)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS gift_id UUID REFERENCES gifts(id);

-- Adicionar coluna payment_date (se não existir)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_payments_gift_id ON payments(gift_id);
```

**Se você está criando do zero, execute:**

```sql
-- Tabela de presentes
CREATE TABLE gifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pagamentos
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asaas_payment_id TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  value NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL,
  billing_type TEXT NOT NULL DEFAULT 'CREDIT_CARD',
  description TEXT,
  payment_date DATE,
  gift_id UUID REFERENCES gifts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Configuração do Asaas

1. Acesse https://www.asaas.com e crie uma conta ou faça login
2. Vá em **Configurações** > **Integrações** > **Minha API**
3. Escolha o ambiente:
   - **Sandbox**: Para testes (recomendado inicialmente)
   - **Produção**: Para uso real
4. Gere uma nova **API Token** ou copie uma existente
5. Anote o token gerado (será `ASAAS_API_KEY`)
6. Anote a URL base:
   - Sandbox: `https://sandbox.asaas.com/api/v3`
   - Produção: `https://www.asaas.com/api/v3`

#### Configuração de Webhooks (Opcional mas Recomendado)

Para receber notificações automáticas quando o status de um pagamento mudar:

1. Vá em **Configurações** > **Webhooks** no painel do Asaas
2. Clique em **Adicionar Webhook**
3. Preencha:
   - **URL do Webhook**: `https://seu-dominio.com/api/webhooks/asaas`
     - Para desenvolvimento local, use um serviço como [ngrok](https://ngrok.com) para expor sua API:
     ```bash
     ngrok http 3000
     # Use a URL gerada: https://xxxx.ngrok.io/api/webhooks/asaas
     ```
   - **Eventos**: Selecione os eventos que deseja receber:
     - `PAYMENT_CREATED` - Quando um pagamento é criado
     - `PAYMENT_CONFIRMED` - Quando um pagamento é confirmado
     - `PAYMENT_RECEIVED` - Quando um pagamento é recebido
     - `PAYMENT_OVERDUE` - Quando um pagamento está vencido
     - `PAYMENT_DELETED` - Quando um pagamento é deletado
     - `PAYMENT_RESTORED` - Quando um pagamento é restaurado
     - `PAYMENT_REFUNDED` - Quando um pagamento é estornado
4. Salve as configurações

### 3. Configuração do Projeto

1. Instale as dependências:
```bash
npm install
```

2. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

3. Edite o arquivo `.env` e preencha com suas credenciais:

```
ASAAS_API_KEY=sua_chave_api_asaas
ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_chave_public_supabase
PORT=3000
```

## ▶️ Executando o Projeto

```bash
npm start
```

O servidor estará rodando em `http://localhost:3000`

## 📡 Endpoints

### POST /api/payments

Cria uma cobrança com cartão de crédito no Asaas e persiste no Supabase.

**Request Body:**

```json
{
  "customer": {
    "name": "Nome do cliente",
    "email": "email@example.com",
    "cpfCnpj": "12345678900",
    "phone": "47999999999"
  },
  "value": 100.00,
  "description": "Descrição do pagamento",
  "giftId": "uuid-do-presente",
  "installments": 3,
  "interestRate": 2.5,
  "creditCard": {
    "holderName": "NOME NO CARTAO",
    "number": "5162306219378829",
    "expiryMonth": "05",
    "expiryYear": "2025",
    "ccv": "318"
  },
  "creditCardHolderInfo": {
    "name": "Nome do portador",
    "email": "email@example.com",
    "cpfCnpj": "12345678900",
    "postalCode": "01310100",
    "addressNumber": "277",
    "addressComplement": "Apto 401",
    "phone": "47999999999"
  }
}
```

**Nota:** 
- O campo `giftId` é opcional. Se fornecido, o valor do presente será usado automaticamente e o campo `value` será ignorado.
- Os campos `installments` e `interestRate` são opcionais. Se `installments > 1`, o sistema calculará os juros e aplicará no valor total.

**Response (201 Created):**

```json
{
  "id": "pay_123456789",
  "status": "CONFIRMED",
  "value": 100.00,
  "paymentDate": "2024-01-15",
  "invoiceUrl": "https://...",
  "transactionReceiptUrl": "https://...",
  "customer": {
    "name": "Nome do cliente",
    "email": "email@example.com"
  },
  "gift": {
    "id": "uuid-do-presente",
    "name": "Nome do Presente",
    "price": 100.00
  },
  "installments": {
    "count": 3,
    "installmentValue": 34.33,
    "totalValue": 100.00,
    "totalWithInterest": 102.99,
    "totalInterest": 2.99,
    "interestRate": 2.5,
    "installmentsList": [...]
  },
  "localId": "uuid-do-registro-no-supabase"
}
```

### GET /api/gifts

Lista todos os presentes disponíveis.

**Response (200 OK):**

```json
[
  {
    "id": "uuid-1",
    "name": "Jogo de Pratos",
    "price": 150.00,
    "image_url": "https://example.com/images/pratos.jpg",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "uuid-2",
    "name": "Ferro de Passar",
    "price": 200.00,
    "image_url": "https://example.com/images/ferro.jpg",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
]
```

### GET /api/gifts/:id

Busca um presente específico pelo ID.

**Response (200 OK):**

```json
{
  "id": "uuid-1",
  "name": "Jogo de Pratos",
  "price": 150.00,
  "image_url": "https://example.com/images/pratos.jpg",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

### POST /api/gifts

Cria um novo presente.

**Request Body:**

```json
{
  "name": "Jogo de Pratos",
  "price": 150.00,
  "imageUrl": "https://example.com/images/pratos.jpg"
}
```

**Nota:** O campo `imageUrl` (ou `image_url`) é opcional.

**Response (201 Created):**

```json
{
  "id": "uuid-gerado",
  "name": "Jogo de Pratos",
  "price": 150.00,
  "image_url": "https://example.com/images/pratos.jpg",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

### POST /api/webhooks/asaas

Endpoint para receber webhooks do Asaas com notificações de mudanças de status de pagamento.

**Request Body (enviado pelo Asaas):**

```json
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_123456789",
    "status": "CONFIRMED",
    "value": 100.00,
    "paymentDate": "2024-01-15"
  }
}
```

**Response (200 OK):**

```json
{
  "received": true,
  "paymentId": "pay_123456789",
  "status": "CONFIRMED",
  "event": "PAYMENT_CONFIRMED"
}
```

**Comportamento:**
- Quando recebe um webhook, a API automaticamente atualiza o status do pagamento no Supabase
- Se o pagamento não for encontrado no banco, o webhook é ignorado
- O endpoint sempre retorna 200 para evitar retentativas do Asaas

### POST /api/installments/calculate

Calcula parcelamento com juros para mostrar ao cliente antes de criar o pagamento.

**Request Body:**

```json
{
  "value": 1000.00,
  "installments": 3,
  "interestRate": 2.5
}
```

**Response (200 OK):**

```json
{
  "totalValue": 1000.00,
  "installments": 3,
  "installmentValue": 343.33,
  "totalWithInterest": 1029.99,
  "totalInterest": 29.99,
  "interestRate": 2.5,
  "installmentsList": [
    {
      "installment": 1,
      "value": 343.33,
      "dueDate": "2024-11-30"
    },
    {
      "installment": 2,
      "value": 343.33,
      "dueDate": "2024-12-30"
    },
    {
      "installment": 3,
      "value": 343.33,
      "dueDate": "2025-01-30"
    }
  ]
}
```

**Nota:** Veja `PARCELAMENTO.md` para documentação completa sobre parcelamento.

### GET /health

Endpoint de health check para verificar se a API está funcionando.

**Response (200 OK):**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🛠️ Estrutura do Projeto

```
wedding-api/
├── src/
│   ├── index.js              # Servidor Express principal
│   ├── routes/
│   │   ├── payments.js        # Rotas de pagamento
│   │   ├── webhooks.js        # Rotas de webhooks
│   │   └── gifts.js           # Rotas de presentes
│   ├── services/
│   │   ├── asaasService.js    # Integração com API Asaas
│   │   ├── supabaseService.js # Integração com Supabase
│   │   └── giftsService.js    # Gerenciamento de presentes
│   └── config/
│       └── database.js        # Configuração Supabase
├── .env.example               # Exemplo de variáveis de ambiente
├── .gitignore
├── package.json
└── README.md
```

## 📦 Dependências

- `express` - Framework web
- `@supabase/supabase-js` - Cliente Supabase
- `axios` - Cliente HTTP para chamadas à API Asaas
- `dotenv` - Gerenciamento de variáveis de ambiente
- `cors` - Habilitar CORS

## ⚠️ Observações Importantes

1. **Ambiente Sandbox**: Use o ambiente sandbox do Asaas para testes. Cartões de teste podem ser encontrados na documentação do Asaas.

2. **Segurança**: Nunca commite o arquivo `.env` com suas credenciais reais. Use sempre o `.env.example` como template.

3. **Tratamento de Erros**: A API retorna erros formatados com status HTTP apropriados e mensagens descritivas.

4. **Validação**: A API valida os dados antes de processar, retornando erros 400 para dados inválidos.

## 🎨 Integração Frontend

Para instruções detalhadas de como integrar esta API com seu frontend, consulte o arquivo **[INTEGRATION.md](./INTEGRATION.md)**.

O arquivo contém:
- Todos os endpoints com exemplos
- Códigos de exemplo em JavaScript/React
- Tratamento de erros
- Validações necessárias
- Fluxo completo de integração

## 🔗 Links Úteis

- [Documentação Asaas](https://docs.asaas.com/)
- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Express](https://expressjs.com/)
