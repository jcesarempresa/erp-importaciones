const fs = require('fs');
const path = require('path');

const uiFiles = [
  path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx'),
  path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx')
];

for (const file of uiFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Import editarCliente
    if (!content.includes('editarCliente')) {
      content = content.replace(/crearCliente\s*,/g, 'crearCliente, editarCliente,');
    }

    // 2. Add quickCliEditingId state
    if (!content.includes('quickCliEditingId')) {
      content = content.replace(
        /const \[showQuickClientForm, setShowQuickClientForm\] = useState\(false\);/,
        `const [showQuickClientForm, setShowQuickClientForm] = useState(false);\n  const [quickCliEditingId, setQuickCliEditingId] = useState<string | null>(null);`
      );
    }

    // 3. Update handleCreateQuickCliente logic
    const oldLogicRegex = /const nuevo = await crearCliente\(\{[\s\S]*?direccionDespacho: quickCliDireccionDespacho\s*\}\);\s*const clis = await obtenerClientes\(\);\s*setClientes\(clis\);\s*setSelectedClienteId\(nuevo\.id \|\| ""\);\s*setSelectedCliente\(\{ id: nuevo\.id!, nombre: nuevo\.nombre, rif: nuevo\.rif, direccion: nuevo\.direccion \}\);\s*setBillToDireccion\(nuevo\.direccion \|\| ""\);\s*setShipToDireccion\(nuevo\.direccionDespacho \|\| nuevo\.direccion \|\| ""\);/m;
    
    // Sometimes it might not have setBillToDireccion (in pedidos-entrantes vs cotizaciones)
    // Let's use a more robust replacement strategy for handleCreateQuickCliente
    const oldCreateBlock = `const nuevo = await crearCliente({
        nombre: quickCliNombre,
        rif: finalRif,
        email: quickCliEmail,
        telefono: quickCliTelefono,
        direccion: quickCliDireccion,
        direccionDespacho: quickCliDireccionDespacho
      });`;
      
    if (content.includes(oldCreateBlock)) {
        const newCreateBlock = `const datosCliente = {
        nombre: quickCliNombre,
        rif: finalRif,
        email: quickCliEmail,
        telefono: quickCliTelefono,
        direccion: quickCliDireccion,
        direccionDespacho: quickCliDireccionDespacho
      };
      
      let nuevoId = "";
      let nuevoData = null;
      
      if (quickCliEditingId) {
        await editarCliente(quickCliEditingId, datosCliente);
        nuevoId = quickCliEditingId;
      } else {
        const creado = await crearCliente(datosCliente);
        nuevoId = creado.id || "";
      }`;
      
      content = content.replace(oldCreateBlock, newCreateBlock);
      
      // Now fix the assignments after
      content = content.replace(/setSelectedClienteId\(nuevo\.id \|\| ""\);/g, 'setSelectedClienteId(nuevoId);');
      
      content = content.replace(/setSelectedCliente\(\{ id: nuevo\.id!, nombre: nuevo\.nombre, rif: nuevo\.rif, direccion: nuevo\.direccion \}\);/g, 
        `const clisList = await obtenerClientes();
      setClientes(clisList);
      const updatedCli = clisList.find(c => c.id === nuevoId);
      if (updatedCli) {
        setSelectedCliente({ id: updatedCli.id!, nombre: updatedCli.nombre, rif: updatedCli.rif, direccion: updatedCli.direccion });
      }`);
      
      // For cotizaciones setBillToDireccion
      content = content.replace(/setBillToDireccion\(nuevo\.direccion \|\| ""\);/g, 'if(updatedCli) setBillToDireccion(updatedCli.direccion || "");');
      content = content.replace(/setShipToDireccion\(nuevo\.direccionDespacho \|\| nuevo\.direccion \|\| ""\);/g, 'if(updatedCli) setShipToDireccion(updatedCli.direccionDespacho || updatedCli.direccion || "");');
      
      // Also remove redundant setClientes(clis) if it was there
      content = content.replace(/const clis = await obtenerClientes\(\);\s*setClientes\(clis\);/, '');
    }

    // 4. Update Modal Title
    content = content.replace(
      /language === "es" \? "Registrar Nuevo Cliente Comercial" : "Register New Commercial Customer"/,
      `quickCliEditingId ? (language === "es" ? "Editar Cliente Comercial" : "Edit Commercial Customer") : (language === "es" ? "Registrar Nuevo Cliente Comercial" : "Register New Commercial Customer")`
    );

    fs.writeFileSync(file, content);
  }
}
console.log("Updated page files for editing.");
