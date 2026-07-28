const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const videoUrl = 'https://videos.pexels.com/video-files/35908039/15231558_1280_720_25fps.mp4';
const outputPath = path.join(__dirname, '..', 'frontend', 'public', 'cargo_video.mp4');

console.log('Iniciando descarga de video...');
console.log('Origen:', videoUrl);
console.log('Destino:', outputPath);

function downloadFile(urlStr, destPath) {
  const url = new URL(urlStr);
  const client = url.protocol === 'https:' ? https : http;

  const requestOptions = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*'
    }
  };

  client.get(urlStr, requestOptions, (response) => {
    // Si hay redirección
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      console.log(`Redirigiendo a: ${response.headers.location}`);
      downloadFile(response.headers.location, destPath);
      return;
    }

    if (response.statusCode !== 200) {
      console.error(`Error: Código de estado del servidor es ${response.statusCode}`);
      response.resume();
      return;
    }

    const file = fs.createWriteStream(destPath);
    response.pipe(file);

    file.on('finish', () => {
      file.close();
      console.log('¡Descarga finalizada con éxito!');
      process.exit(0);
    });
  }).on('error', (err) => {
    fs.unlink(destPath, () => {});
    console.error(`Error en la descarga: ${err.message}`);
    process.exit(1);
  });
}

downloadFile(videoUrl, outputPath);
