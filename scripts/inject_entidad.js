const fs = require('fs');

const files = [
  { path: 'frontend/src/app/cotizaciones/page.tsx', list: 'clientes', setter: 'setSelectedClienteId' },
  { path: 'frontend/src/app/pedidos-entrantes/page.tsx', list: 'clientes', setter: 'setSelectedClienteId' },
  { path: 'frontend/src/app/ordenes-cliente/page.tsx', list: 'clientes', setter: 'setSelectedClienteId' },
  // pedidos-proveedor is not using the same AI items parsing yet, but wait, did we update it?
  // the user's screenshot was in "Pedidos de Proveedor" or "Pedidos Entrantes"?
  // Wait, the screenshot has "Ítems de Pedido" and "Importar PDF (IA)".
  // Let's check where the user is based on screenshot 1. 
  // It has "FREIGHT TERM" "PORT OF DESTINATION" "PROFORMA DATE DUE" "REQUEST FOR QUOTE (NO.)".
  // These are from Cotizaciones module!
];

for (const { path, list, setter } of files) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Inject logic after setFormItems
    const injection = `
            if (entidad) {
              const upperEntidad = entidad.toUpperCase();
              const matching = ${list}.find(c => c.nombre.toUpperCase().includes(upperEntidad) || upperEntidad.includes(c.nombre.toUpperCase()));
              if (matching) {
                ${setter}(matching.id);
              }
            }
`;

    content = content.replace(
      /setFormItems\(\[\.\.\.formItems, \.\.\.newItems\]\);\n            \}/,
      `setFormItems([...formItems, ...newItems]);\n            }\n${injection}`
    );

    fs.writeFileSync(path, content);
  }
}
console.log('Done');
