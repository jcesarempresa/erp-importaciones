const fs = require('fs');

const files = [
  'frontend/src/app/cotizaciones/page.tsx',
  'frontend/src/app/pedidos-entrantes/page.tsx',
  'frontend/src/app/ordenes-cliente/page.tsx',
  'frontend/src/app/pedidos-proveedor/page.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');

  // We need to re-generate the handleCloseModal but skipping more globals
  let resetLines = [];
  const simpleRegex = /const\s+\[([a-zA-Z0-9_]+),\s*(set[a-zA-Z0-9_]+)\]\s*=\s*useState([^;]*);/g;
  let match;
  
  while ((match = simpleRegex.exec(content)) !== null) {
    const varName = match[1];
    const setterName = match[2];
    const rest = match[3];
    
    // Skip globals that shouldn't reset on modal close
    if (['cotizaciones', 'pedidos', 'ordenes', 'pedidosEntrantes', 'clientes', 'responsables', 'loading', 'error', 'empresa', 'printTarget', 'proveedores', 'productos', 'historicoProductos', 'modalOpen'].includes(varName)) {
      continue;
    }
    
    const valMatch = rest.match(/\((.*)\)$/s);
    let initialVal = valMatch ? valMatch[1].trim() : '""';
    
    if (initialVal === '') initialVal = '""'; 
    if (setterName === 'setFormItems' && file.includes('pedidos-proveedor')) {
      initialVal = '[{ sku: "", descripcion: "", detalles: "", cantidadPedida: 1, showDetalles: false }]';
    } else if (setterName === 'setFormItems') {
      initialVal = '[{ sku: "", descripcion: "", detalles: "", modelo: "", cantidad: 1, precioUnitario: 0 }]';
    } else if (setterName === 'setFecha') {
      initialVal = 'new Date().toISOString().split("T")[0]';
    } else if (initialVal.includes('=>')) {
       initialVal = initialVal.replace(/\(\)\s*=>/, '').trim();
    }
    
    resetLines.push(`${setterName}(${initialVal});`);
  }

  const handleClose = `
  const handleCloseModal = () => {
    // Check if there is data
    const hasData = (formItems && formItems.length > 0 && formItems[0].sku !== "") || observaciones;
    if (hasData) {
      if (!window.confirm(language === "es" ? "¿Está seguro que desea descartar este pedido y cerrar?" : "Are you sure you want to discard this order and close?")) {
        return;
      }
    }
    setModalOpen(false);
    ${resetLines.join('\n    ')}
  };
`;

  // Replace existing handleCloseModal
  content = content.replace(
    /const handleCloseModal = \(\) => \{[\s\S]*?\};\s*return \(/,
    handleClose + '\n  return ('
  );

  fs.writeFileSync(file, content);
}
console.log('Done refixing modal close');
