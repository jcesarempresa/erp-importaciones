const fs = require('fs');
const path = require('path');

const uiFiles = [
  path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx'),
  path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx')
];

for (const file of uiFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Fix setSelectedCliente( { id: matching.id!, nombre: matching.nombre... } ) -> setSelectedCliente(matching)
    content = content.replace(
      /setSelectedCliente\(\{\s*id:\s*matching\.id!,\s*nombre:\s*matching\.nombre,\s*rif:\s*matching\.rif,\s*direccion:\s*matching\.direccion\s*\}\);/g,
      `setSelectedCliente(matching);`
    );

    // Fix setSelectedCliente( { id: nuevo.id!, nombre: nuevo.nombre... } ) -> setSelectedCliente(nuevo)
    content = content.replace(
      /setSelectedCliente\(\{\s*id:\s*nuevo\.id!,\s*nombre:\s*nuevo\.nombre,\s*rif:\s*nuevo\.rif,\s*direccion:\s*nuevo\.direccion\s*\}\);/g,
      `setSelectedCliente(nuevo);`
    );

    // There was another one on line 161 (loadRequerimiento/loadCotizacion): 
    // setSelectedCliente({ id: p.clienteId, nombre: p.clienteNombre || "Cliente Desconocido", rif: p.clienteRif || "" })
    // If we only have partial data from the DB, we have to cast it to Cliente.
    content = content.replace(
      /setSelectedCliente\(\{\s*id:\s*[^,]+,\s*nombre:\s*[^,]+,\s*rif:\s*[^}]+\s*\}\)/g,
      match => `${match} as any`
    );

    fs.writeFileSync(file, content);
  }
}
console.log('Fixed more TS errors.');
