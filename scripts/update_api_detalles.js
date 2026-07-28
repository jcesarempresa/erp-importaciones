const fs = require('fs');

let content = fs.readFileSync('frontend/src/lib/api/importaciones.ts', 'utf8');

// 1. Update guardarProductoSiNoExiste signature and body
content = content.replace(
  'export async function guardarProductoSiNoExiste(sku: string, descripcion: string): Promise<void> {',
  'export async function guardarProductoSiNoExiste(sku: string, descripcion: string, detalles?: string): Promise<void> {'
);

content = content.replace(
  '      descripcion: descripcion.trim(),\n      createdAt: new Date().toISOString()',
  '      descripcion: descripcion.trim(),\n      detalles: detalles || "",\n      createdAt: new Date().toISOString()'
);

// 2. Update calls to guardarProductoSiNoExiste to pass item.detalles
content = content.replace(/await guardarProductoSiNoExiste\(item\.sku, item\.descripcion\);/g, 'await guardarProductoSiNoExiste(item.sku, item.descripcion, item.detalles);');

fs.writeFileSync('frontend/src/lib/api/importaciones.ts', content);
console.log('Done!');
