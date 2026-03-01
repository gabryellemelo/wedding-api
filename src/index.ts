import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'dotenv/config';

import paymentsRoutes from './routes/payments';
import webhooksRoutes from './routes/webhooks';
import giftsRoutes from './routes/gifts';
import uploadRoutes from './routes/upload';
import imagesRoutes from './routes/images';
import installmentsRoutes from './routes/installments';

const DEFAULT_PORT = 3000;
const API_BASE_PATH = '/api';
const HEALTH_PATH = '/health';

const PORT = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get(HEALTH_PATH, (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(`${API_BASE_PATH}/payments`, paymentsRoutes);
app.use(`${API_BASE_PATH}/webhooks`, webhooksRoutes);
app.use(`${API_BASE_PATH}/gifts`, giftsRoutes);
app.use(`${API_BASE_PATH}/installments`, installmentsRoutes);
app.use(`${API_BASE_PATH}/upload`, uploadRoutes);
app.use(`${API_BASE_PATH}/images`, imagesRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: err.message
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Rota não encontrada'
  });
});

function logServerStartup(port: number): void {
  const baseUrl = `http://localhost:${port}`;
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📋 Health check: ${baseUrl}${HEALTH_PATH}`);
  console.log(`💳 Pagamentos: ${baseUrl}${API_BASE_PATH}/payments`);
  console.log(`🎁 Presentes: ${baseUrl}${API_BASE_PATH}/gifts`);
  console.log(`💳 Parcelamento: ${baseUrl}${API_BASE_PATH}/installments/calculate`);
  console.log(`📤 Upload: ${baseUrl}${API_BASE_PATH}/upload/image`);
  console.log(`🔔 Webhooks MP: configurar no painel MP -> Edge Function webhook-mercadopago`);
}

app.listen(PORT, () => {
  logServerStartup(PORT);
});

export default app;

