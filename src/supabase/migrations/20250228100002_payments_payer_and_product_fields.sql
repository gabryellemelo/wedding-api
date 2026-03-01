-- Vincula pagamentos a produtos (gifts) e ao pagador com dados completos para recibo e gateway.

-- Dados do pagador (além de nome e e-mail)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_document TEXT;

-- Vínculo com produto: quantidade e snapshot no momento do pagamento (para histórico/recibo)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS gift_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS gift_price_snapshot NUMERIC(10, 2);

COMMENT ON COLUMN payments.gift_id IS 'Presente escolhido (FK para gifts). NULL = contribuição em dinheiro.';
COMMENT ON COLUMN payments.quantity IS 'Quantidade de unidades do presente (ou 1 para contribuição).';
COMMENT ON COLUMN payments.gift_name_snapshot IS 'Nome do presente no momento do pagamento (para recibo/histórico).';
COMMENT ON COLUMN payments.gift_price_snapshot IS 'Preço unitário do presente no momento do pagamento.';
COMMENT ON COLUMN payments.customer_document IS 'CPF ou CNPJ do pagador (apenas números).';
COMMENT ON COLUMN payments.customer_phone IS 'Telefone do pagador (apenas números).';
