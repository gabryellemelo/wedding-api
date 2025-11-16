-- Limpar quebras de linha da URL de imagem
UPDATE gifts 
SET image_url = TRIM(REGEXP_REPLACE(image_url, '[\n\r\t]', '', 'g'))
WHERE id = '8e899896-f404-4312-bfa2-f38e75e3bb63';
