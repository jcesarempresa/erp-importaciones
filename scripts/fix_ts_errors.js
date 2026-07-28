const fs = require('fs');

let file, content;

// 1. cotizaciones
file = 'frontend/src/app/cotizaciones/page.tsx';
if (fs.existsSync(file)) {
  content = fs.readFileSync(file, 'utf8');
  content = content.replace(/setSelectedCliente\(""\);/g, 'setSelectedCliente(null);');
  fs.writeFileSync(file, content);
}

// 2. pedidos-entrantes
file = 'frontend/src/app/pedidos-entrantes/page.tsx';
if (fs.existsSync(file)) {
  content = fs.readFileSync(file, 'utf8');
  content = content.replace(/setSelectedCliente\(""\);/g, 'setSelectedCliente(null);');
  fs.writeFileSync(file, content);
}

// 3. ordenes-cliente
file = 'frontend/src/app/ordenes-cliente/page.tsx';
if (fs.existsSync(file)) {
  content = fs.readFileSync(file, 'utf8');
  content = content.replace(/setFormItems\(\[\{ sku: "", descripcion: "", detalles: "", modelo: "", cantidad: 1, precioUnitario: 0 \}\]\);/g, 'setFormItems([{ sku: "", descripcion: "", detalles: "", cantidadPedida: 1, precioUnitario: 0, proveedores: [] }]);');
  fs.writeFileSync(file, content);
}

console.log('Done fixing TS errors');
