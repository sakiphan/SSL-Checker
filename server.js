require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const routes = require('./src/routes');

// Data klasörünün varlığını kontrol et ve oluştur
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Express uygulamasını oluştur
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rotaları uygula
app.use(routes);

// Diğer tüm istekleri ana sayfaya yönlendir (SPA için)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`SSL Monitor sunucusu http://localhost:${PORT} adresinde çalışıyor`);
}); 