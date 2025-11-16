-- Script para garantir que a URL está em uma única linha
-- Execute este SQL no Supabase SQL Editor

-- Remove todas as quebras de linha e espaços extras, garantindo URL em uma linha
UPDATE gifts 
SET image_url = REPLACE(REPLACE(REPLACE(image_url, E'\n', ''), E'\r', ''), E'\t', '')
WHERE id = '8e899896-f404-4312-bfa2-f38e75e3bb63';

-- Ou se preferir, atualize diretamente com a URL correta (garantindo que está em uma linha):
UPDATE gifts 
SET image_url = 'https://drive.google.com/uc?export=view&id=1V9H2YybV_vgqO0HsYiZGy4AFrrJcnImY'
WHERE id = '8e899896-f404-4312-bfa2-f38e75e3bb63';

-- Verificar depois:
SELECT id, name, image_url, LENGTH(image_url) as tamanho
FROM gifts
WHERE id = '8e899896-f404-4312-bfa2-f38e75e3bb63';
