const fs = require('fs');
const glob = require('glob'); // This might not be available, let's just use manual paths since we know the pages

const directories = [
  'frontend/src/app/cotizaciones/page.tsx',
  'frontend/src/app/pedidos-entrantes/page.tsx',
  'frontend/src/app/ordenes-cliente/page.tsx',
  'frontend/src/app/pedidos-proveedor/page.tsx',
  'frontend/src/app/facturacion/page.tsx',
  'frontend/src/app/despachos/page.tsx',
  'frontend/src/components/ProductoAutocomplete.tsx',
  'frontend/src/components/layout/Sidebar.tsx',
  'frontend/src/components/layout/Header.tsx'
];

for (const file of directories) {
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');

  // Replace all <option> and <option ...> that don't have a className yet
  // Or just forcefully add className to all of them.
  
  // Simplest is to just replace <option with <option className="bg-slate-900 text-white" 
  // but we need to avoid duplicating if it already has one.
  
  content = content.replace(/<option\s+([^>]*)className="[^"]*"([^>]*)>/g, '<option $1 $2>'); // remove existing
  content = content.replace(/<option([^>]*)>/g, '<option className="bg-slate-900 text-white" $1>');

  fs.writeFileSync(file, content);
}
console.log('Done fixing option styles');
