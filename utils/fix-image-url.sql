-- Script para corrigir URLs de imagens que têm quebras de linha ou espaços extras
-- Execute este SQL no Supabase SQL Editor

-- Limpar quebras de linha e espaços extras das URLs de imagem
UPDATE gifts 
SET image_url = TRIM(REGEXP_REPLACE(image_url, '[\n\r\t]', '', 'g'))
WHERE image_url IS NOT NULL 
  AND (image_url LIKE '%\n%' OR image_url LIKE '%\r%' OR image_url LIKE '%\t%');

-- Verificar se foi corrigido
SELECT id, name, image_url, LENGTH(image_url) as url_length
FROM gifts
WHERE image_url IS NOT NULL;
