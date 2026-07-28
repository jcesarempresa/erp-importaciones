const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/cotizaciones/page.tsx', 'utf8');

content = content.replace(/Cotizaciones/g, 'PedidosEntrantes');
content = content.replace(/CotizacionesPage/g, 'PedidosEntrantesPage');
content = content.replace(/cotizaciones/g, 'pedidos');
content = content.replace(/Cotizacion/g, 'Requerimiento');
content = content.replace(/cotizacion/g, 'pedido');
content = content.replace(/obtenerCotizaciones/g, 'obtenerRequerimientos');
content = content.replace(/crearCotizacion/g, 'crearRequerimiento');
content = content.replace(/aprobarCotizacion/g, 'aprobarRequerimiento');
content = content.replace(/editarCotizacion/g, 'editarRequerimiento');
content = content.replace(/anularCotizacion/g, 'anularRequerimiento');
content = content.replace(/revertirCotizacion/g, 'revertirRequerimiento');

fs.writeFileSync('frontend/src/app/pedidos-entrantes/page.tsx', content);
console.log('Done!');
