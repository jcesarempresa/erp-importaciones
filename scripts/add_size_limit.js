const fs = require('fs');

const uiFiles = [
  'frontend/src/app/cotizaciones/page.tsx',
  'frontend/src/app/pedidos-entrantes/page.tsx'
];

for (const file of uiFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add size limit check right after getting the file
    content = content.replace(
      /const file = e\.target\.files\?\.\[0\];\s*if \(\!file\) return;/g,
      `const file = e.target.files?.[0];
    if (!file) return;

    // Límite de 3.5MB para evitar 413 Payload Too Large en Vercel o timeouts
    if (file.size > 3.5 * 1024 * 1024) {
      setExtractError('El archivo es demasiado grande (máx 3.5MB). Intente comprimir el documento o usar una imagen de menor resolución.');
      return;
    }`
    );
    
    fs.writeFileSync(file, content);
  }
}
console.log('Added size limit check');
