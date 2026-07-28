const fs = require('fs');
const path = require('path');

// 1. Update API route prompt
const routeFile = path.join(__dirname, 'frontend/src/app/api/extract-order/route.ts');
if (fs.existsSync(routeFile)) {
  let content = fs.readFileSync(routeFile, 'utf8');
  
  const promptUpdate = `"entidad": "Nombre LEGAL de la empresa, cliente o proveedor. PREFIERE SIEMPRE el nombre que acompañe a la identificación fiscal o dirección (ej. FIBRANOVA C.A.) por encima de logotipos comerciales gigantes (ej. MASISA).",
        "entidadRif": "Identificación fiscal de la empresa (RIF, NIT, RUT, VAT). Si no hay, déjalo en blanco.",
        "entidadDireccion": "Dirección física de la empresa que emite o recibe. Si no hay, déjalo en blanco.",
        "entidadEmail": "Correo electrónico general o de contacto. Si no hay, déjalo en blanco.",
        "entidadTelefono": "Teléfono de contacto o fax de la empresa. Si no hay, déjalo en blanco.",`;
        
  content = content.replace(/"entidad":.*?,/g, promptUpdate);
  fs.writeFileSync(routeFile, content);
}

// 2. Update UI files
const uiFiles = [
  path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx'),
  path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx')
];

for (const file of uiFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Extract the new fields
    content = content.replace(
      /const \{ items, entidad, observaciones: obs, numeroDocumento \} = await response\.json\(\);/,
      `const { items, entidad, entidadRif, entidadDireccion, entidadEmail, entidadTelefono, observaciones: obs, numeroDocumento } = await response.json();`
    );

    // Update the auto-create logic to include the new fields and set the selected object
    const oldLogic = `            if (entidad) {
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

    const newLogic = `            if (entidad) {
              const upperEntidad = entidad.toUpperCase();
              const matching = clientes.find(c => c.nombre.toUpperCase().includes(upperEntidad) || upperEntidad.includes(c.nombre.toUpperCase()));
              if (matching) {
                setSelectedClienteId(matching.id || "");
                setSelectedCliente(matching);
              } else {
                try {
                  const nuevo = await crearCliente({
                    nombre: entidad,
                    rif: entidadRif || "Por actualizar",
                    email: entidadEmail || "Por actualizar",
                    telefono: entidadTelefono || "Por actualizar",
                    direccion: entidadDireccion || "Por actualizar"
                  });
                  setClientes(prev => [...prev, nuevo]);
                  setSelectedClienteId(nuevo.id || "");
                  setSelectedCliente(nuevo);
                } catch(e) {
                  console.error("Auto-create client error", e);
                }
              }
            }`;

    content = content.replace(oldLogic, newLogic);
    
    // Sometimes it's slightly different in cotizaciones (might be missing the 'else' block if I didn't add it)
    // Let's use regex to match it more flexibly
    const autoCreateRegex = /if \(entidad\) \{\s*const upperEntidad = entidad\.toUpperCase\(\);\s*const matching = clientes\.find[\s\S]*?setSelectedClienteId\(matching\.id \|\| ""\);\s*\}[\s\S]*?\} catch[\s\S]*?console\.error[\s\S]*?\}\s*\}\s*\}/;
    
    // Oh wait, my oldLogic replacement might fail if the spacing is off.
    // Let's just do a regex replace for the entire `if (entidad) { ... }` block.
    
    content = content.replace(
      /if\s*\(entidad\)\s*\{\s*const upperEntidad = entidad\.toUpperCase\(\);\s*const matching = clientes\.find\([^)]+\);.*?if\s*\(matching\)\s*\{[^}]+\}\s*else\s*\{[^}]*try\s*\{[^}]*crearCliente\(\{[\s\S]*?\}\);[^}]*setClientes\([^)]+\);[^}]*setSelectedClienteId\([^)]+\);[^}]*\}\s*catch\s*\(e\)\s*\{[^}]*\}\s*\}\s*\}/,
      newLogic
    );

    // If it didn't match the regex (e.g. cotizaciones where the else block wasn't added fully), 
    // we just replace the base version:
    const baseLogicRegex = /if\s*\(entidad\)\s*\{\s*const upperEntidad = entidad\.toUpperCase\(\);\s*const matching = clientes\.find\([^)]+\);\s*if\s*\(matching\)\s*\{\s*setSelectedClienteId\(matching\.id \|\| ""\);\s*\}\s*\}/;
    
    if (baseLogicRegex.test(content) && !content.includes('setSelectedCliente(matching)')) {
        content = content.replace(baseLogicRegex, newLogic);
    }
    
    fs.writeFileSync(file, content);
  }
}
console.log('Script done');
