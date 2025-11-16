# Wedding API

API REST desenvolvida em TypeScript para gerenciamento de pagamentos e presentes de casamento, integrada com Asaas para processamento de pagamentos e Supabase para persistência de dados.

## 🎯 Funcionalidades

- 💳 Pagamentos com cartão de crédito (à vista ou parcelado)
- 💰 Pagamentos via PIX
- 🎁 Sistema de lista de presentes
- 📸 Upload e gerenciamento de imagens
- 📊 Cálculo de parcelamento com juros e taxas
- 🔔 Webhooks para atualização automática de status de pagamento
- 💬 Mensagens personalizadas para o casal

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta no [Supabase](https://supabase.com)
- Conta no [Asaas](https://www.asaas.com)

## 🚀 Configuração

### 1. Instalação

```bash
npm install
```

### 2. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
ASAAS_API_KEY=sua_chave_api_asaas
ASAAS_BASE_URL=https://sua_url
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_chave_public_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
PORT=3000
```

### 3. Banco de Dados (Supabase)

Execute o seguinte SQL no SQL Editor do Supabase:

```sql
-- Tabela de presentes
CREATE TABLE IF NOT EXISTS gifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asaas_payment_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  value NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL,
  billing_type TEXT NOT NULL DEFAULT 'CREDIT_CARD',
  description TEXT,
  gift_id UUID REFERENCES gifts(id),
  message TEXT,
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payments_gift_id ON payments(gift_id);
CREATE INDEX IF NOT EXISTS idx_payments_asaas_id ON payments(asaas_payment_id);
```

### 4. Storage (Supabase)

1. No painel do Supabase, vá em **Storage**
2. Crie um bucket chamado `wedding-images`
3. Configure as políticas de acesso conforme necessário

## ▶️ Executando

### Desenvolvimento

```bash
npm run dev
```

### Produção

```bash
npm run build
npm start
```

O servidor estará rodando em `http://localhost:3000`

## 📡 Endpoints Principais

### Pagamentos

- `POST /api/payments` - Criar pagamento (cartão ou PIX)
- `GET /api/payments/:id/pix-qrcode` - Obter QR Code PIX

### Presentes

- `GET /api/gifts` - Listar todos os presentes
- `GET /api/gifts/:id` - Buscar presente por ID
- `POST /api/gifts` - Criar novo presente

### Parcelamento

- `POST /api/installments/calculate` - Calcular parcelamento com juros

### Upload

- `POST /api/upload/image` - Upload de imagem única
- `POST /api/upload/images` - Upload de múltiplas imagens
- `DELETE /api/upload/image` - Deletar imagem

### Imagens

- `GET /api/images/proxy` - Proxy para imagens externas (CORS)

### Webhooks

- `POST /api/webhooks/asaas` - Receber webhooks do Asaas

### Health Check

- `GET /health` - Verificar status da API

## 🛠️ Estrutura do Projeto

```
wedding-api/
├── src/
│   ├── index.ts                 # Servidor Express
│   ├── config/
│   │   └── database.ts          # Configuração Supabase
│   ├── routes/
│   │   ├── payments.ts          # Rotas de pagamento
│   │   ├── gifts.ts             # Rotas de presentes
│   │   ├── installments.ts       # Rotas de parcelamento
│   │   ├── upload.ts            # Rotas de upload
│   │   ├── images.ts            # Rotas de imagens
│   │   └── webhooks.ts          # Rotas de webhooks
│   ├── services/
│   │   ├── asaasService.ts      # Integração Asaas
│   │   ├── supabaseService.ts   # Integração Supabase
│   │   ├── giftsService.ts      # Serviço de presentes
│   │   ├── installmentService.ts # Cálculo de parcelamento
│   │   └── storageService.ts    # Upload de imagens
│   └── types/
│       └── index.ts             # Tipos TypeScript
├── utils/
│   └── convert-drive-url.ts      # Utilitário para URLs do Google Drive
├── tsconfig.json
├── package.json
└── README.md
```

## 📦 Scripts Disponíveis

- `npm run dev` - Executar em modo desenvolvimento
- `npm run dev:watch` - Executar com hot-reload
- `npm run build` - Compilar TypeScript
- `npm start` - Executar versão compilada

## 🔒 Segurança

- Nunca commite o arquivo `.env`
- Use variáveis de ambiente em produção
- Configure CORS adequadamente
- Valide todos os inputs da API

## 📝 Notas

- A API calcula automaticamente taxas do Asaas baseadas no número de parcelas
- Suporta parcelamento com juros personalizados (Tabela Price)
- Webhooks atualizam automaticamente o status dos pagamentos
- Imagens podem ser armazenadas no Supabase Storage ou usar URLs externas

## 🔗 Links Úteis

- [Documentação Asaas](https://docs.asaas.com/)
- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Express](https://expressjs.com/)

