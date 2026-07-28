const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/pedidos-entrantes/page.tsx', 'utf8');

content = content.replace(/Cotizaci[oó]n/g, 'Pedido');
content = content.replace(/cotizaci[oó]n/g, 'pedido');
content = content.replace(/Cotizaciones/g, 'Pedidos');

fs.writeFileSync('frontend/src/app/pedidos-entrantes/page.tsx', content);
console.log('Done!');
