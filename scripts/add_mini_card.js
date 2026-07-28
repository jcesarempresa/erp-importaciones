const fs = require('fs');
const path = require('path');

const uiFiles = [
  path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx'),
  path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx')
];

for (const file of uiFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Ensure lucide-react has Mail, Phone, MapPin, Building2, etc
    if (!content.includes('Mail') && content.includes('lucide-react')) {
      content = content.replace(/import {([^}]+)} from "lucide-react";/, (match, p1) => {
        let icons = p1.split(',').map(i => i.trim());
        ['Mail', 'Phone', 'MapPin', 'Building2'].forEach(i => {
          if (!icons.includes(i)) icons.push(i);
        });
        return `import { ${icons.join(', ')} } from "lucide-react";`;
      });
    }

    // 2. Add onEditCurrent to ContactoSearchModal
    // The modal call looks like this:
    /*
      <ContactoSearchModal
        tipo="cliente"
        items={clientes}
        selected={selectedCliente}
        onSelect={(cli) => {
          setSelectedClienteId(cli.id || "");
          const matching = clientes.find((c) => c.id === cli.id);
          if (matching) {
            setSelectedCliente(matching);
            setBillToDireccion(matching.direccion || "");
            setShipToDireccion(matching.direccionDespacho || matching.direccion || "");
          }
        }}
        onCreateNew={() => setShowQuickClientForm(true)}
      />
    */
    // Let's just find the onCreateNew prop and insert onEditCurrent right below it
    content = content.replace(
      /onCreateNew=\{[^}]+\}/g,
      (match) => {
        if (!match.includes('setShowQuickClientForm')) return match; // just in case
        return `${match}\n                    onEditCurrent={() => {\n                      if (selectedCliente) {\n                        setQuickCliEditingId(selectedCliente.id || null);\n                        setQuickCliNombre(selectedCliente.nombre);\n                        setQuickCliRif(selectedCliente.rif || "");\n                        setQuickCliRequiereRif(!!selectedCliente.rif);\n                        setQuickCliEmail(selectedCliente.email || "");\n                        setQuickCliTelefono(selectedCliente.telefono || "");\n                        setQuickCliDireccion(selectedCliente.direccion || "");\n                        setQuickCliDireccionDespacho((selectedCliente as Cliente).direccionDespacho || "");\n                        setShowQuickClientForm(true);\n                      }\n                    }}`;
      }
    );

    // 3. Add the mini-card right below the <ContactoSearchModal /> div wrapper
    // The structure usually is:
    /*
      <div className="space-y-1.5 min-w-[280px]">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-indigo-400" />
          {language === "es" ? "Cliente Comercial" : "Commercial Customer"}
        </label>
        <ContactoSearchModal ... />
        ...here...
      </div>
    */
    
    // So let's find `tipo="cliente"` inside ContactoSearchModal, and then look for its closing `/>`.
    // Wait, let's just do a string replace for `tipo="cliente"` component block if possible.
    // Instead of regex, I'll just append it right after the `ContactoSearchModal` that has `tipo="cliente"`
    const parts = content.split('<ContactoSearchModal');
    let newContent = parts[0];
    for (let i = 1; i < parts.length; i++) {
      if (parts[i].includes('tipo="cliente"')) {
        // Find where it ends
        const closeIdx = parts[i].indexOf('/>');
        if (closeIdx !== -1) {
          const beforeClose = parts[i].substring(0, closeIdx + 2);
          const afterClose = parts[i].substring(closeIdx + 2);
          
          const cardHtml = `
                    {selectedCliente && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
                        {selectedCliente.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                            <span className="truncate">{selectedCliente.email}</span>
                          </div>
                        )}
                        {selectedCliente.telefono && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Phone className="h-3 w-3 text-slate-500 shrink-0" />
                            <span className="truncate">{selectedCliente.telefono}</span>
                          </div>
                        )}
                        {selectedCliente.direccion && (
                          <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
                            <MapPin className="h-3 w-3 text-slate-500 mt-0.5 shrink-0" />
                            <span className="truncate whitespace-normal leading-tight">{selectedCliente.direccion}</span>
                          </div>
                        )}
                      </div>
                    )}`;
                    
          newContent += '<ContactoSearchModal' + beforeClose + cardHtml + afterClose;
        } else {
          newContent += '<ContactoSearchModal' + parts[i];
        }
      } else {
        newContent += '<ContactoSearchModal' + parts[i];
      }
    }

    fs.writeFileSync(file, newContent);
  }
}
console.log("Mini client info card and edit hook added.");
