const fs = require('fs');
let content = fs.readFileSync('frontend/src/lib/api/importaciones.ts', 'utf8');

// Cotizaciones (crear y editar)
content = content.replace(
  /items: Array<\{ sku: string; descripcion: string; modelo\?: string; cantidad: number; precioUnitario: number \}>/g,
  'items: Array<{ sku: string; descripcion: string; detalles?: string; modelo?: string; cantidad: number; precioUnitario: number }>'
);

// Ordenes de Cliente
content = content.replace(
  /items: Array<\{ sku: string; descripcion: string; cantidadPedida: number; precioUnitario: number; proveedores\?: \{ proveedorId: string; proveedorNombre: string; cantidad: number \}\[\] \}>/g,
  'items: Array<{ sku: string; descripcion: string; detalles?: string; cantidadPedida: number; precioUnitario: number; proveedores?: { proveedorId: string; proveedorNombre: string; cantidad: number }[] }>'
);

content = content.replace(
  /items: Array<\{ sku: string; descripcion: string; cantidadPedida: number; precioUnitario: number; proveedores\?: \{ proveedorId: string; proveedorNombre: string; cantidad: number \}\[\]; cantidadRecibida\?: number; cantidadEntregada\?: number \}>/g,
  'items: Array<{ sku: string; descripcion: string; detalles?: string; cantidadPedida: number; precioUnitario: number; proveedores?: { proveedorId: string; proveedorNombre: string; cantidad: number }[]; cantidadRecibida?: number; cantidadEntregada?: number }>'
);

// Pedidos Proveedor
content = content.replace(
  /items: Array<\{ sku: string; cantidadPedida: number \}>/g,
  'items: Array<{ sku: string; descripcion?: string; detalles?: string; cantidadPedida: number }>'
);

content = content.replace(
  /items: Array<\{ sku: string; cantidadPedida: number; costoUnitario\?: number \}>/g,
  'items: Array<{ sku: string; descripcion?: string; detalles?: string; cantidadPedida: number; costoUnitario?: number }>'
);

fs.writeFileSync('frontend/src/lib/api/importaciones.ts', content);
console.log('Done');
