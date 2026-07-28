const fs = require('fs');
const path = require('path');

// --- Pedidos Entrantes ---
const pedidosFile = path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx');
if (fs.existsSync(pedidosFile)) {
  let content = fs.readFileSync(pedidosFile, 'utf8');

  // Import eliminarRequerimiento
  content = content.replace(
    /revertirRequerimiento,/g,
    'revertirRequerimiento,\n  eliminarRequerimiento,'
  );

  // Add handleEliminar
  const handleAnular = /const handleAnular = async \(id: string\) => \{[\s\S]*?\};\n/g;
  const handleEliminarStr = `
  const handleEliminar = async (id: string) => {
    if (!confirm(language === "es"
      ? "¿Está seguro de ELIMINAR permanentemente este pedido? Esta acción no se puede deshacer."
      : "Are you sure you want to PERMANENTLY DELETE this request? This action cannot be undone.")) return;
    try {
      await eliminarRequerimiento(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al eliminar." : "Error deleting."));
    }
  };
`;
  content = content.replace(handleAnular, match => match + handleEliminarStr);

  // Add badge logic
  content = content.replace(
    /cot.estado === "anulado" \? "bg-red-500\/10 text-red-400 border border-red-500\/20 animate-pulse" :/g,
    `cot.estado === "anulado" ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" :
                        cot.estado === "presupuestado" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :`
  );
  content = content.replace(
    /cot.estado === "anulado" \? \(language === "es" \? "ANULADO" : "VOIDED"\) :/g,
    `cot.estado === "anulado" ? (language === "es" ? "ANULADO" : "VOIDED") :
                         cot.estado === "presupuestado" ? (language === "es" ? "PRESUPUESTADO" : "BUDGETED") :`
  );

  // Fix buttons: Presupuestar and Editar should be hidden/disabled if presupuestado
  // But actually we can just check if estado es requerimiento para mostrar Presupuestar.
  // The buttons are rendered if cot.estado === "requerimiento" OR if not anulado.
  // Let's hide Presupuestar and Editar if presupuestado.
  // Wait, the "Presupuestar" button is shown everywhere except anulado? Let's search.
  content = content.replace(
    /cot.estado !== "anulado" && \(\n\s*<>\n\s*<button\n\s*onClick=\{\(\) => handleAprobar\(cot.id!\)\}/g,
    `cot.estado === "requerimiento" && (
                          <>
                            <button
                              onClick={() => handleAprobar(cot.id!)}`
  );

  content = content.replace(
    /<button\n\s*onClick=\{\(\) => handleAnular\(cot.id!\)\}/g,
    `<button
                              onClick={() => handleAnular(cot.id!)}`
  );

  // Add Delete button next to Anular
  content = content.replace(
    /(<button\s*onClick=\{\(\) => handleAnular\(cot\.id!\)\}[\s\S]*?<\/button>)/,
    `$1
                            <button
                              onClick={() => handleEliminar(cot.id!)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1 border border-red-500/20"
                              title={language === "es" ? "Eliminar" : "Delete"}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>`
  );

  // Also replace globally in case there are multiple Anular buttons
  let matches = content.match(/<button\s*onClick=\{\(\) => handleAnular\(cot\.id!\)\}[\s\S]*?<\/button>/g);
  if(matches) {
    for (let m of matches) {
      if(!m.includes("Trash2")) {
        content = content.replace(m, m + `
                            <button
                              onClick={() => handleEliminar(cot.id!)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1 border border-red-500/20"
                              title={language === "es" ? "Eliminar permanentemente" : "Delete permanently"}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>`);
      }
    }
  }

  fs.writeFileSync(pedidosFile, content);
}


// --- Cotizaciones ---
const cotsFile = path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx');
if (fs.existsSync(cotsFile)) {
  let content = fs.readFileSync(cotsFile, 'utf8');

  // Import eliminarCotizacion
  content = content.replace(
    /anularCotizacion,/g,
    'anularCotizacion,\n  eliminarCotizacion,'
  );

  // Add handleEliminar
  const handleAnularCot = /const handleAnular = async \(id: string\) => \{[\s\S]*?\};\n/g;
  const handleEliminarStrCot = `
  const handleEliminar = async (id: string) => {
    if (!confirm(language === "es"
      ? "¿Está seguro de ELIMINAR permanentemente esta cotización? Esta acción no se puede deshacer."
      : "Are you sure you want to PERMANENTLY DELETE this quotation? This action cannot be undone.")) return;
    try {
      await eliminarCotizacion(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al eliminar." : "Error deleting."));
    }
  };
`;
  content = content.replace(handleAnularCot, match => match + handleEliminarStrCot);

  // Add Delete button globally
  let matches = content.match(/<button\s*onClick=\{\(\) => handleAnular\(cot\.id!\)\}[\s\S]*?<\/button>/g);
  if(matches) {
    for (let m of matches) {
      if(!m.includes("Trash2")) {
        content = content.replace(m, m + `
                            <button
                              onClick={() => handleEliminar(cot.id!)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1 border border-red-500/20"
                              title={language === "es" ? "Eliminar permanentemente" : "Delete permanently"}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>`);
      }
    }
  }

  fs.writeFileSync(cotsFile, content);
}

console.log("UI updated for deletion and statuses.");
