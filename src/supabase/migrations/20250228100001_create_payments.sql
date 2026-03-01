-- Tabela de pagamentos (Mercado Pago / gateway)
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway_payment_id TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  value NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  billing_type TEXT NOT NULL DEFAULT 'CREDIT_CARD',
  description TEXT,
  gift_id UUID REFERENCES gifts(id),
  message TEXT,
  payment_date TIMESTAMPTZ,
  pix_copy_paste TEXT,
  pix_qr_base64 TEXT,
  pix_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_gift_id ON payments(gift_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_id ON payments(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
