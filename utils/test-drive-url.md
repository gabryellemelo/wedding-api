# Teste se a URL do Google Drive funciona

## Verificar se a imagem está acessível

A URL que você está usando:
```
https://drive.google.com/uc?export=view&id=1V9H2YybV_vgqO0HsYiZGy4AFrrJcnImY
```

### Problemas Comuns:

1. **Arquivo não está público**
   - No Google Drive, clique com botão direito na imagem
   - "Gerenciar acesso" ou "Share"
   - Configure para "Qualquer pessoa com o link"
   - Pode levar alguns minutos para propagar

2. **Formato da URL incorreto**
   - Use: `https://drive.google.com/uc?export=view&id=FILE_ID`
   - Não use: `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`

3. **CORS - Google Drive pode bloquear**
   - Google Drive às vezes bloqueia requisições de outros domínios
   - Se não funcionar, use **Imgur** que é mais confiável

### Teste rápido:

1. Abra a URL diretamente no navegador:
   ```
   https://drive.google.com/uc?export=view&id=1V9H2YybV_vgqO0HsYiZGy4AFrrJcnImY
   ```

2. Se abrir a imagem = URL funciona ✅
3. Se pedir login ou erro = arquivo não está público ❌

### Alternativa mais fácil: Imgur

1. Acesse https://imgur.com/upload
2. Faça upload da imagem
3. Copie o link direto (ex: `https://i.imgur.com/abc123.jpg`)
4. Use essa URL - sempre funciona!
