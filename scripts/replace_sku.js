const fs = require('fs');
const files = [
  'frontend/src/components/ItemsPreviewModal.tsx',
  'frontend/src/components/PrintCotizacion.tsx',
  'frontend/src/components/PrintOrdenCliente.tsx',
  'frontend/src/components/PrintPedidoProveedor.tsx',
  'frontend/src/context/LanguageContext.tsx'
];

for(const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/"SKU"/g, '"Código"');
  content = content.replace(/>SKU</g, '>Código<');
  content = content.replace(/Código SKU/g, 'Código');
  content = content.replace(/Código SKU/g, 'Código'); // in case of weird encoding
  content = content.replace(/SKU Code/g, 'Code');
  content = content.replace(/label\.sku/g, 'label.codigo');
  
  // Replace in forms
  content = content.replace(/"SKU o Referencia"/g, '"Código o Referencia"');
  
  fs.writeFileSync(file, content);
}
console.log('Replaced SKU with Código in files');
