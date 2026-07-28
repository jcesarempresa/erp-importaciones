const fs = require('fs');

const files = [
  'frontend/src/app/cotizaciones/page.tsx',
  'frontend/src/app/pedidos-entrantes/page.tsx',
  'frontend/src/app/ordenes-cliente/page.tsx',
  'frontend/src/app/pedidos-proveedor/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    content = content.replace(
      /value=\{item\.precioUnitario \|\| ""\}/g,
      'value={item.precioUnitario !== undefined ? item.precioUnitario : ""}'
    );

    content = content.replace(
      /value=\{item\.costoUnitario \|\| ""\}/g,
      'value={item.costoUnitario !== undefined ? item.costoUnitario : ""}'
    );

    // Also remove `required` from precioUnitario and costoUnitario inputs just in case, but keeping the value fix is enough to let '0' display.
    
    fs.writeFileSync(file, content);
  }
}
console.log('Done');
