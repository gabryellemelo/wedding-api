-- Script para adicionar coluna image_url na tabela gifts
-- Execute este SQL no Supabase SQL Editor

-- Verificar se a coluna já existe
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'gifts' 
  AND column_name = 'image_url';

-- Adicionar coluna se não existir
ALTER TABLE gifts 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Verificar se foi criada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'gifts'
ORDER BY column_name;
