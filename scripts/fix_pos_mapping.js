const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx'),
  path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx')
];

for (const file of filesToUpdate) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Fix saving: validItems.map(i => ({ sku: i.sku...
    content = content.replace(
      /validItems\.map\(i => \(\{ sku: i\.sku, descripcion: i\.descripcion \|\| "", detalles: i\.detalles \|\| "", modelo: i\.modelo \|\| "", cantidad: i\.cantidad, precioUnitario: i\.precioUnitario \}\)\)/g,
      'validItems.map(i => ({ pos: i.pos || "", sku: i.sku, descripcion: i.descripcion || "", detalles: i.detalles || "", modelo: i.modelo || "", cantidad: i.cantidad, precioUnitario: i.precioUnitario }))'
    );

    // Fix loading: setFormItems(cot.items.map(item => ({...
    content = content.replace(
      /setFormItems\(cot\.items\.map\(item => \(\{\s*sku: item\.sku,/g,
      'setFormItems(cot.items.map(item => ({\n                                  pos: item.pos || "",\n                                  sku: item.sku,'
    );

    fs.writeFileSync(file, content);
  }
}

console.log('Fixed pos mapping in save and load operations.');
