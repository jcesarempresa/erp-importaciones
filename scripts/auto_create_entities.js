const fs = require('fs');

const files = [
  'frontend/src/app/cotizaciones/page.tsx',
  'frontend/src/app/pedidos-entrantes/page.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');

  // Extract numeroDocumento in API call
  content = content.replace(
    /const \{ items, entidad, observaciones: obs \} = await response\.json\(\);/g,
    'const { items, entidad, observaciones: obs, numeroDocumento } = await response.json();\n          if (numeroDocumento) setCustomerNo(numeroDocumento);'
  );

  // Replace client matching logic
  const oldMatchingLogic = `            if (entidad) {
              const upperEntidad = entidad.toUpperCase();
              const matching = clientes.find(c => c.nombre.toUpperCase().includes(upperEntidad) || upperEntidad.includes(c.nombre.toUpperCase()));
              if (matching) {
                setSelectedClienteId(matching.id || "");
              }
            }`;
  const oldMatchingLogicCotizaciones = `            if (entidad) {
              const upperEntidad = entidad.toUpperCase();
              const matching = clientes.find(c => c.nombre.toUpperCase().includes(upperEntidad) || upperEntidad.includes(c.nombre.toUpperCase()));
              if (matching) {
                setSelectedCliente(matching);
              }
            }`;

  const newMatchingLogicPedidosEntrantes = `            if (entidad) {
              const upperEntidad = entidad.toUpperCase();
              const matching = clientes.find(c => c.nombre.toUpperCase().includes(upperEntidad) || upperEntidad.includes(c.nombre.toUpperCase()));
              if (matching) {
                setSelectedClienteId(matching.id || "");
              } else {
                try {
                  const nuevo = await crearCliente({
                    nombre: entidad,
                    rif: "Por actualizar",
                    email: "Por actualizar",
                    telefono: "Por actualizar",
                    direccion: "Por actualizar"
                  });
                  setClientes(prev => [...prev, nuevo]);
                  setSelectedClienteId(nuevo.id || "");
                } catch(e) {
                  console.error("Auto-create client error", e);
                }
              }
            }`;
            
  const newMatchingLogicCotizaciones = `            if (entidad) {
              const upperEntidad = entidad.toUpperCase();
              const matching = clientes.find(c => c.nombre.toUpperCase().includes(upperEntidad) || upperEntidad.includes(c.nombre.toUpperCase()));
              if (matching) {
                setSelectedCliente(matching);
              } else {
                try {
                  const nuevo = await crearCliente({
                    nombre: entidad,
                    rif: "Por actualizar",
                    email: "Por actualizar",
                    telefono: "Por actualizar",
                    direccion: "Por actualizar"
                  });
                  setClientes(prev => [...prev, nuevo]);
                  setSelectedCliente(nuevo);
                } catch(e) {
                  console.error("Auto-create client error", e);
                }
              }
            }`;

  if (file.includes('pedidos-entrantes')) {
    content = content.replace(oldMatchingLogic, newMatchingLogicPedidosEntrantes);
    // Modal Title Update
    content = content.replace(
      /\{language === "es" \? "Crear Nueva Pedido \(Presupuesto\)" : "Create New Quotation \(Budget\)"\}/g,
      '{language === "es" ? (customerNo ? `Crear Nuevo Pedido (Nro: ${customerNo})` : "Crear Nuevo Pedido (Presupuesto)") : (customerNo ? `Create New Order (No: ${customerNo})` : "Create New Quotation (Budget)")}'
    );
  } else {
    content = content.replace(oldMatchingLogicCotizaciones, newMatchingLogicCotizaciones);
    // Modal Title Update
    content = content.replace(
      /\{language === "es" \? "Crear Nueva Cotización" : "Create New Quotation"\}/g,
      '{language === "es" ? (customerNo ? `Crear Nueva Cotización (Nro: ${customerNo})` : "Crear Nueva Cotización") : (customerNo ? `Create New Quotation (No: ${customerNo})` : "Create New Quotation")}'
    );
  }

  fs.writeFileSync(file, content);
}
console.log('Done auto-create logic');
