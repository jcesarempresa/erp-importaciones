const fs = require('fs');

const routeFile = 'frontend/src/app/api/extract-order/route.ts';
if (fs.existsSync(routeFile)) {
  let content = fs.readFileSync(routeFile, 'utf8');
  if (!content.includes('export const maxDuration = 60;')) {
    content = content.replace(
      /export async function POST\(request: Request\) {/,
      'export const maxDuration = 60;\n\nexport async function POST(request: Request) {'
    );
  }
  fs.writeFileSync(routeFile, content);
}

const uiFiles = [
  'frontend/src/app/cotizaciones/page.tsx',
  'frontend/src/app/pedidos-entrantes/page.tsx'
];

for (const file of uiFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Change accept="application/pdf" to accept="application/pdf,image/png,image/jpeg,image/webp"
    content = content.replace(
      /accept="application\/pdf"/g,
      'accept="application/pdf,image/png,image/jpeg,image/webp"'
    );
    
    // Change text Importar PDF to Importar Doc/Img
    content = content.replace(
      /"Importar PDF \(IA\)" : "Import PDF \(AI\)"/g,
      '"Importar Doc/Img (IA)" : "Import Doc/Img (AI)"'
    );
    content = content.replace(
      /"Importar PDF" : "Import PDF"/g,
      '"Importar Doc" : "Import Doc"'
    );

    // Some places might have `Importar PDF (IA)` without ternary
    content = content.replace(
      />\s*Importar PDF \(IA\)\s*</g,
      '> Importar Doc/Img (IA) <'
    );
    
    fs.writeFileSync(file, content);
  }
}
console.log('Added image support');
