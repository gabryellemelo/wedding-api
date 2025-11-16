# Sistema de Parcelamento com Taxas do Asaas

## 📋 Como Funciona

O sistema calcula parcelamento **incluindo automaticamente as taxas do Asaas**, para que você não tenha que pagar essas taxas do seu bolso.

### Taxas do Asaas (Cartão de Crédito):
- **2,7%** sobre o valor TOTAL da cobrança (aumentado por segurança)
- **R$ 0,49** fixo por transação (uma vez)

**Fórmula:** `novoValor = valorTotal + (valorTotal × 2,7%) + R$ 0,49`

**Exemplo:**
- Valor original: R$ 100,00
- 3x sem juros:
  - Taxa percentual: R$ 100,00 × 2,7% = R$ 2,70
  - Taxa fixa: R$ 0,49 (uma vez por transação)
  - **Total de taxas: R$ 3,19**
  - **Valor total para cliente: R$ 103,19**
  - **Parcela: R$ 34,40** (R$ 103,19 ÷ 3)
  - **Você recebe: R$ 100,00 líquido**

O sistema também suporta juros adicionais (opcional) usando a **Tabela Price** (Sistema de Amortização Francês).

## 🔢 Endpoint de Cálculo

### POST /api/installments/calculate

Calcula o parcelamento com juros **antes** de criar o pagamento, para mostrar ao cliente.

**Request:**
```json
{
  "value": 1000.00,
  "installments": 3,
  "interestRate": 2.5
}
```

**Parâmetros:**
- `value` (obrigatório) - Valor total
- `installments` (obrigatório) - Número de parcelas (1-12)
- `interestRate` (opcional) - Taxa de juros mensal em % (ex: 2.5 para 2.5%). Default: 0

**Response:**
```json
{
  "totalValue": 1000.00,
  "installments": 3,
  "installmentValue": 345.65,
  "totalWithInterest": 1036.95,
  "totalInterest": 36.95,
  "interestRate": 0,
  "asaasFee": 36.95,
  "userInterest": 0,
  "installmentsList": [
    {
      "installment": 1,
      "value": 345.65,
      "dueDate": "2024-11-30"
    },
    {
      "installment": 2,
      "value": 345.65,
      "dueDate": "2024-12-30"
    },
    {
      "installment": 3,
      "value": 345.65,
      "dueDate": "2025-01-30"
    }
  ]
}
```

**Campos importantes:**
- `totalValue`: Valor original (o que você quer receber)
- `totalWithInterest`: Valor total que o cliente paga (com taxas)
- `asaasFee`: Taxa total do Asaas (2,7% sobre o valor total + R$ 0,49 por transação)
- `userInterest`: Juros adicionais (se você definir `interestRate`)

## 💳 Criar Pagamento Parcelado

### POST /api/payments

Ao criar o pagamento, você pode incluir parcelamento:

**Request:**
```json
{
  "customer": { ... },
  "value": 1000.00,
  "installments": 3,
  "interestRate": 2.5,
  "creditCard": { ... },
  "creditCardHolderInfo": { ... }
}
```

**Response inclui informações de parcelamento:**
```json
{
  "id": "pay_123",
  "status": "CONFIRMED",
  "value": 1029.99,
  "installments": {
    "count": 3,
    "installmentValue": 343.33,
    "totalValue": 1000.00,
    "totalWithInterest": 1029.99,
    "totalInterest": 29.99,
    "interestRate": 2.5,
    "installmentsList": [ ... ]
  },
  ...
}
```

## 📊 Exemplos de Uso

### Exemplo 1: Parcelamento sem juros (3x sem juros)

```javascript
POST /api/installments/calculate
{
  "value": 300.00,
  "installments": 3,
  "interestRate": 0
}

// Resultado:
// - Valor original: R$ 300,00 (o que você recebe)
// - Taxa Asaas: (R$ 300,00 × 2,7%) + R$ 0,49 = R$ 8,10 + R$ 0,49 = R$ 8,59
// - Total que cliente paga: R$ 308,59
// - Parcela: R$ 102,86 (R$ 308,59 ÷ 3)
```

### Exemplo 2: Parcelamento com juros adicionais (6x com 2.5% ao mês)

```javascript
POST /api/installments/calculate
{
  "value": 1000.00,
  "installments": 6,
  "interestRate": 2.5
}

// Resultado:
// - Valor original: R$ 1.000,00 (o que você recebe)
// - Parcela: R$ 181,XX (com juros + taxas Asaas)
// - Total que cliente paga: R$ 1.086,XX
// - Taxa Asaas: ~R$ 26,XX
// - Juros adicionais: ~R$ 60,XX
```

## 🎯 Fluxo Recomendado no Frontend

1. **Cliente seleciona presente ou valor**
2. **Cliente escolhe número de parcelas**
3. **Frontend chama `/api/installments/calculate`** para mostrar:
   - Valor de cada parcela
   - Total com juros
   - Valor dos juros
4. **Cliente confirma e cria o pagamento** com `installments` e `interestRate`

## 💡 Exemplo React

```jsx
const [installments, setInstallments] = useState(1);
const [interestRate] = useState(2.5); // Taxa fixa ou configurável
const [installmentInfo, setInstallmentInfo] = useState(null);

// Calcular parcelamento quando mudar
useEffect(() => {
  if (installments > 1 && gift?.price) {
    fetch('http://localhost:3000/api/installments/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: gift.price,
        installments: installments,
        interestRate: interestRate
      })
    })
    .then(res => res.json())
    .then(data => setInstallmentInfo(data));
  }
}, [installments, gift]);

// Mostrar para o cliente
{installmentInfo && (
  <div>
    <p>Valor: R$ {installmentInfo.totalValue.toFixed(2)}</p>
    <p>Parcelas: {installmentInfo.installments}x de R$ {installmentInfo.installmentValue.toFixed(2)}</p>
    <p>Total com juros: R$ {installmentInfo.totalWithInterest.toFixed(2)}</p>
    <p>Juros: R$ {installmentInfo.totalInterest.toFixed(2)}</p>
  </div>
)}
```

## ⚙️ Configuração de Taxa de Juros

Você pode:
- **Taxa fixa**: Definir uma taxa padrão (ex: 2.5% ao mês)
- **Taxa variável**: Diferentes taxas por número de parcelas
  - 2x: 0% (sem juros)
  - 3x: 1.5%
  - 4x-6x: 2.5%
  - 7x-12x: 3.5%

## 📝 Notas Importantes

1. **Taxas do Asaas são incluídas automaticamente** - o cliente paga, você não!
2. **O valor enviado ao Asaas deve ser o valor COM taxas** (`totalWithInterest`)
3. **As parcelas são divididas igualmente** pelo Asaas
4. **Taxa de juros adicional é opcional** - se você definir `interestRate`, será adicionado além das taxas do Asaas
5. **Você recebe o valor original** (`totalValue`) - as taxas são pagas pelo cliente

## 💰 Exemplo Prático

**Cenário:** Presente de R$ 150,00 em 3x

**Sem calcular taxas (ERRADO):**
- Você envia R$ 150,00 para o Asaas
- Asaas cobra taxas: (R$ 150,00 × 2,7%) + R$ 0,49 = R$ 4,05 + R$ 0,49 = R$ 4,54
- **Você recebe: R$ 145,46** ❌ (perdeu dinheiro!)

**Com cálculo de taxas (CORRETO):**
- Sistema calcula: R$ 150,00 + (R$ 150,00 × 2,7%) + R$ 0,49 = R$ 150,00 + R$ 4,05 + R$ 0,49 = R$ 154,54
- Você envia R$ 154,54 para o Asaas
- Asaas cobra taxas: (R$ 154,54 × 2,7%) + R$ 0,49 = R$ 4,17 + R$ 0,49 = R$ 4,66
- **Você recebe: R$ 149,88** ✅ (quase o valor completo, pequena diferença por arredondamento)
