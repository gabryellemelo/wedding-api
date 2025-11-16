#!/usr/bin/env node

/**
 * Script simples para fazer upload de imagens
 * Uso: node upload-image.js /caminho/para/imagem.jpg
 */

const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const imagePath = process.argv[2];
const folder = process.argv[3] || 'gifts';

if (!imagePath) {
  console.log('❌ Erro: Caminho da imagem não fornecido\n');
  console.log('Uso: node upload-image.js /caminho/para/imagem.jpg [folder]');
  console.log('\nExemplo:');
  console.log('  node upload-image.js ~/Downloads/presente.jpg');
  console.log('  node upload-image.js ./images/presente.jpg gifts');
  process.exit(1);
}

// Verifica se o arquivo existe
if (!fs.existsSync(imagePath)) {
  console.error(`❌ Erro: Arquivo não encontrado: ${imagePath}`);
  process.exit(1);
}

async function uploadImage() {
  try {
    console.log('📤 Fazendo upload da imagem...');
    console.log(`   Arquivo: ${imagePath}`);
    console.log(`   Pasta: ${folder}\n`);

    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    formData.append('folder', folder);

    const fetch = require('node-fetch');
    
    const response = await fetch(`${API_URL}/api/upload/image`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Imagem enviada com sucesso!\n');
      console.log('📋 URL da imagem:');
      console.log(`   ${data.imageUrl}\n`);
      console.log('💡 Use essa URL ao criar o presente:\n');
      console.log(`   "imageUrl": "${data.imageUrl}"\n`);
    } else {
      console.error('❌ Erro:', data.error || 'Erro desconhecido');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro ao fazer upload:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Certifique-se de que o servidor está rodando:');
      console.log('   npm start');
    }
    
    process.exit(1);
  }
}

uploadImage();
