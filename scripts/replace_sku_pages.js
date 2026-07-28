const fs = require('fs');
const files = [
  'frontend/src/app/pedidos-entrantes/page.tsx',
  'frontend/src/app/cotizaciones/page.tsx'
];

for(const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/placeholder="SKU"/g, 'placeholder="CÓDIGO"');
  content = content.replace(/"Debe ingresar al menos un SKU válido."/g, '"Debe ingresar al menos un CÓDIGO válido."');
  content = content.replace(/"You must enter at least one valid SKU."/g, '"You must enter at least one valid CODE."');
  
  // Also change the th in print/preview components if there's any stray "SKU"
  fs.writeFileSync(file, content);
}
console.log('Replaced SKU with CÓDIGO in pages');
