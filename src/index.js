const express = require('express');
const cors = require('cors');
require('dotenv').config();

const paymentsRoutes = require('./routes/payments');
const webhooksRoutes = require('./routes/webhooks');
const giftsRoutes = require('./routes/gifts');
const uploadRoutes = require('./routes/upload');
const imagesRoutes = require('./routes/images');
const installmentsRoutes = require('./routes/installments');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/payments', paymentsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/gifts', giftsRoutes);
app.use('/api/installments', installmentsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/images', imagesRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada'
  });
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`💳 Pagamentos: http://localhost:${PORT}/api/payments`);
  console.log(`🎁 Presentes: http://localhost:${PORT}/api/gifts`);
  console.log(`💳 Parcelamento: http://localhost:${PORT}/api/installments/calculate`);
  console.log(`📤 Upload: http://localhost:${PORT}/api/upload/image`);
  console.log(`🔔 Webhooks: http://localhost:${PORT}/api/webhooks/asaas`);
});

module.exports = app;
