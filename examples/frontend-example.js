/**
 * Exemplo básico de integração com a API
 * Use este código como referência para integrar no seu frontend
 */

const API_URL = 'http://localhost:3000'; // ou sua URL de produção

// ============================================
// 1. LISTAR PRESENTES
// ============================================
async function listGifts() {
  try {
    const response = await fetch(`${API_URL}/api/gifts`);
    const gifts = await response.json();
    return gifts;
  } catch (error) {
    console.error('Erro ao listar presentes:', error);
    throw error;
  }
}

// ============================================
// 2. BUSCAR PRESENTE POR ID
// ============================================
async function getGiftById(giftId) {
  try {
    const response = await fetch(`${API_URL}/api/gifts/${giftId}`);
    if (!response.ok) {
      throw new Error('Presente não encontrado');
    }
    const gift = await response.json();
    return gift;
  } catch (error) {
    console.error('Erro ao buscar presente:', error);
    throw error;
  }
}

// ============================================
// 3. CRIAR PAGAMENTO
// ============================================
async function createPayment(paymentData) {
  try {
    const response = await fetch(`${API_URL}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao processar pagamento');
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    throw error;
  }
}

// ============================================
// 4. EXEMPLO DE USO COMPLETO
// ============================================
async function exemploCompleto() {
  try {
    // 1. Listar presentes disponíveis
    console.log('Carregando presentes...');
    const gifts = await listGifts();
    console.log('Presentes:', gifts);

    // 2. Selecionar um presente (exemplo)
    const selectedGift = gifts[0];
    console.log('Presente selecionado:', selectedGift);

    // 3. Criar pagamento com o presente selecionado
    const paymentData = {
      customer: {
        name: 'João Silva',
        email: 'joao@example.com',
        cpfCnpj: '12345678900',
        phone: '47999999999'
      },
      giftId: selectedGift.id, // ID do presente selecionado
      description: 'Presente de casamento',
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
    };

    console.log('Criando pagamento...');
    const payment = await createPayment(paymentData);
    
    console.log('Pagamento criado com sucesso!');
    console.log('ID:', payment.id);
    console.log('Status:', payment.status);
    console.log('Comprovante:', payment.transactionReceiptUrl);

    // 4. Redirecionar para comprovante (se necessário)
    if (payment.transactionReceiptUrl) {
      // window.open(payment.transactionReceiptUrl, '_blank');
      console.log('URL do comprovante:', payment.transactionReceiptUrl);
    }

    return payment;
  } catch (error) {
    console.error('Erro no processo:', error.message);
    throw error;
  }
}

// ============================================
// 5. EXEMPLO COM PAGAMENTO SEM PRESENTE (valor customizado)
// ============================================
async function criarPagamentoCustomizado() {
  const paymentData = {
    customer: {
      name: 'Maria Santos',
      email: 'maria@example.com',
      cpfCnpj: '98765432100',
      phone: '47988888888'
    },
    value: 250.00, // Valor personalizado (sem giftId)
    description: 'Contribuição para lua de mel',
    creditCard: {
      holderName: 'MARIA SANTOS',
      number: '5162306219378829',
      expiryMonth: '10',
      expiryYear: '2026',
      ccv: '123'
    },
    creditCardHolderInfo: {
      name: 'Maria Santos',
      email: 'maria@example.com',
      cpfCnpj: '98765432100',
      postalCode: '01310100',
      addressNumber: '100',
      addressComplement: '',
      phone: '47988888888'
    }
  };

  try {
    const payment = await createPayment(paymentData);
    console.log('Pagamento criado:', payment);
    return payment;
  } catch (error) {
    console.error('Erro:', error.message);
    throw error;
  }
}

// ============================================
// EXPORTAR FUNÇÕES (se usar módulos ES6)
// ============================================
// export { listGifts, getGiftById, createPayment };

// Para usar em HTML:
// <script type="module">
//   import { listGifts, createPayment } from './frontend-example.js';
// </script>
