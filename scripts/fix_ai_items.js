const fs = require('fs');

const files = [
  'frontend/src/app/cotizaciones/page.tsx',
  'frontend/src/app/pedidos-entrantes/page.tsx',
  'frontend/src/app/ordenes-cliente/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Find the block:
  // const { items } = await response.json();
  // if (items && Array.isArray(items)) {
  //   const newItems = items.map(item => ({ ... }))
  
  content = content.replace(
    /const \{ items \} = await response\.json\(\);/,
    'const { items, entidad } = await response.json();'
  );

  content = content.replace(
    /detalles: item\.detalles \|\| "",\n(.*?)modelo:/,
    'detalles: item.detalles || "",\n              showDetalles: !!item.detalles,\n$1modelo:'
  );

  // For ordenes-cliente
  content = content.replace(
    /detalles: item\.detalles \|\| "",\n(.*?)cantidadPedida:/,
    'detalles: item.detalles || "",\n              showDetalles: !!item.detalles,\n$1cantidadPedida:'
  );

  fs.writeFileSync(file, content);
}
console.log('Done');
