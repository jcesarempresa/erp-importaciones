const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx'),
  path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx')
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Update Headers
  const headersRegex = /<div className="hidden md:flex flex-wrap md:flex-nowrap items-center gap-2 px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">[\s\S]*?<\/div>\s*<div className="space-y-2">/;
  const newHeaders = `
                  <div className="hidden md:flex flex-wrap items-center gap-2 px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="w-full md:w-32 shrink-0">{language === "es" ? "CÓDIGO" : "CODE"}</div>
                    <div className="w-full md:w-12 shrink-0 text-center">POS</div>
                    <div className="w-full md:flex-1">{language === "es" ? "Descripción" : "Desc."}</div>
                    <div className="w-full md:w-24 shrink-0">{language === "es" ? "Modelo" : "Model"}</div>
                    <div className="w-full md:w-20 shrink-0">Unidad</div>
                    <div className="w-full md:w-24 shrink-0">Plazo</div>
                    <div className="w-full md:w-32 shrink-0">F. Entrega</div>
                    <div className="w-16 shrink-0 text-center">{language === "es" ? "Cant." : "Qty"}</div>
                    <div className="w-24 shrink-0 text-right">{language === "es" ? "Precio U." : "Unit P."}</div>
                    <div className="w-24 shrink-0 text-right">Total</div>
                    <div className="w-8 shrink-0"></div>
                  </div>
                  <div className="space-y-2">`;
  content = content.replace(headersRegex, newHeaders);

  // Note: I also changed md:flex-nowrap to md:flex-wrap in the headers because we might wrap if the screen is too small for 10 columns.
  
  // Now inject the new inputs right after 'modelo' input
  // Find the modelo input:
  const modeloInputRegex = /(<input\s+type="text"\s+placeholder=\{language === "es" \? "Modelo" : "Model"\}[\s\S]*?onChange=\{\(e\) => handleFormItemChange\(index, "modelo", e.target.value\)\}[\s\S]*?\/>)/;
  
  const newInputs = `
                        <input
                          type="text"
                          placeholder="Unidad (ej. PZA)"
                          value={item.unidad || ""}
                          onChange={(e) => handleFormItemChange(index, "unidad", e.target.value)}
                          className="glass-input w-full md:w-20 shrink-0 px-2 py-2 rounded-lg text-sm text-center"
                        />
                        <input
                          type="text"
                          placeholder="Plazo (ej. 15d)"
                          value={item.plazo || ""}
                          onChange={(e) => handleFormItemChange(index, "plazo", e.target.value)}
                          className="glass-input w-full md:w-24 shrink-0 px-2 py-2 rounded-lg text-sm text-center"
                        />
                        <input
                          type="text"
                          placeholder="F. Entrega"
                          value={item.fechaEntrega || ""}
                          onChange={(e) => handleFormItemChange(index, "fechaEntrega", e.target.value)}
                          className="glass-input w-full md:w-32 shrink-0 px-2 py-2 rounded-lg text-sm text-center"
                        />`;
  
  content = content.replace(modeloInputRegex, (match) => {
    return match + newInputs;
  });

  // Adjust existing input widths so they fit better on desktop
  // CÓDIGO: md:w-48 -> md:w-32
  content = content.replace(/containerClassName="w-full md:w-48 shrink-0"/, 'containerClassName="w-full md:w-32 shrink-0"');
  // POS: md:w-16 -> md:w-12
  content = content.replace(/className="glass-input w-full md:w-16 shrink-0 px-2 py-2 rounded-lg text-sm text-center font-mono"/, 'className="glass-input w-full md:w-12 shrink-0 px-2 py-2 rounded-lg text-sm text-center font-mono"');
  // MODELO: w-32 -> md:w-24
  content = content.replace(/className="glass-input w-32 px-3 py-2 rounded-lg text-sm"/, 'className="glass-input w-full md:w-24 shrink-0 px-3 py-2 rounded-lg text-sm"');
  // CANTIDAD: w-20 -> w-16
  content = content.replace(/className="glass-input w-20 px-3 py-2 rounded-lg text-sm text-center"/, 'className="glass-input w-16 px-3 py-2 rounded-lg text-sm text-center"');
  // PRECIO UNITARIO: w-28 -> w-24
  content = content.replace(/className="glass-input w-28 px-3 py-2 rounded-lg text-sm text-right"/, 'className="glass-input w-24 px-3 py-2 rounded-lg text-sm text-right"');

  // Change md:flex-nowrap to md:flex-wrap for the item container itself
  content = content.replace(/<div className="flex flex-wrap md:flex-nowrap items-center gap-2 p-2 bg-slate-800\/30 rounded-xl border border-slate-700\/50">/g, '<div className="flex flex-wrap items-center gap-2 p-2 bg-slate-800/30 rounded-xl border border-slate-700/50">');

  fs.writeFileSync(file, content);
}

console.log('UI inputs updated.');
