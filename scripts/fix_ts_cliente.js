const fs = require('fs');

const uiFiles = [
  'frontend/src/app/cotizaciones/page.tsx',
  'frontend/src/app/pedidos-entrantes/page.tsx'
];

for (const file of uiFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Fix setSelectedCliente(matching)
    content = content.replace(
      /setSelectedCliente\(matching\);/g,
      `setSelectedCliente({ id: matching.id!, nombre: matching.nombre, rif: matching.rif, direccion: matching.direccion });`
    );

    // Fix setSelectedCliente(nuevo)
    content = content.replace(
      /setSelectedCliente\(nuevo\);/g,
      `setSelectedCliente({ id: nuevo.id!, nombre: nuevo.nombre, rif: nuevo.rif, direccion: nuevo.direccion });`
    );

    fs.writeFileSync(file, content);
  }
}
console.log('Fixed TS errors');
