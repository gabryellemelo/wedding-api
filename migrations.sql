-- Script de migração para adicionar suporte a presentes
-- Execute este SQL no Supabase SQL Editor

-- 1. Criar tabela de presentes (se ainda não existe)
CREATE TABLE IF NOT EXISTS gifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna image_url se a tabela já existe sem essa coluna
ALTER TABLE gifts 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Adicionar coluna gift_id na tabela payments (se ainda não existe)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS gift_id UUID REFERENCES gifts(id);

-- 3. Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_payments_gift_id ON payments(gift_id);

-- Verificar se as alterações foram aplicadas
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payments' 
  AND column_name IN ('gift_id', 'payment_date')
ORDER BY column_name;
