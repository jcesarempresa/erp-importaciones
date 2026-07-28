const fs = require('fs');

const files = [
  { path: 'frontend/src/app/cotizaciones/page.tsx', apiCall: 'crearCotizacion', type: 'cotizaciones' },
  { path: 'frontend/src/app/pedidos-entrantes/page.tsx', apiCall: 'crearCotizacion', type: 'pedidos-entrantes' },
  { path: 'frontend/src/app/ordenes-cliente/page.tsx', apiCall: 'crearOrdenCliente', type: 'ordenes-cliente' },
  { path: 'frontend/src/app/pedidos-proveedor/page.tsx', apiCall: 'crearPedidoProveedor', type: 'pedidos-proveedor' }
];

for (const fileObj of files) {
  const file = fileObj.path;
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');

  // 1. Add state
  if (!content.includes('const [observaciones, setObservaciones]')) {
    content = content.replace(
      /const \[formError, setFormError\] = useState<string \| null>\(null\);/g,
      'const [formError, setFormError] = useState<string | null>(null);\n  const [observaciones, setObservaciones] = useState<string>("");'
    );
  }

  // 2. Clear state on close
  content = content.replace(
    /setFormError\(null\);\n\s*setExtractError\(null\);/g,
    'setFormError(null);\n      setExtractError(null);\n      setObservaciones("");'
  );

  // 3. API Response
  content = content.replace(
    /const \{ items, entidad \} = await response\.json\(\);/g,
    'const { items, entidad, observaciones: obs } = await response.json();\n          if (obs) setObservaciones(obs);'
  );

  // 4. API call (crear / editar)
  if (fileObj.type === 'cotizaciones' || fileObj.type === 'pedidos-entrantes') {
    // These use `meta: Partial<Cotizacion>` as the last argument
    content = content.replace(
      /arancel,\n\s*otrosGastos,\n\s*\{\n\s*billToDireccion/g,
      'arancel,\n          otrosGastos,\n          {\n            observaciones,\n            billToDireccion'
    );
    
    // In handleEdit, populate
    content = content.replace(
      /setArancel\(cot\.arancel \|\| 0\);\n\s*setOtrosGastos\(cot\.otrosGastos \|\| 0\);/g,
      'setArancel(cot.arancel || 0);\n      setOtrosGastos(cot.otrosGastos || 0);\n      setObservaciones(cot.observaciones || "");'
    );
  } else if (fileObj.type === 'ordenes-cliente') {
    // API updated to take `observaciones?: string` as the last arg
    content = content.replace(
      /resp\.nombre\n\s*\);/g,
      'resp.nombre,\n          observaciones\n        );'
    );
    // In handleEdit, populate
    content = content.replace(
      /setFecha\(ord\.fecha \|\| new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\);/g,
      'setFecha(ord.fecha || new Date().toISOString().split(\'T\')[0]);\n      setObservaciones(ord.observaciones || "");'
    );
  } else if (fileObj.type === 'pedidos-proveedor') {
    // API updated to take `observaciones?: string` as the last arg
    content = content.replace(
      /resp\.nombre\n\s*\);/g,
      'resp.nombre,\n          observaciones\n        );'
    );
    // In handleEdit, populate
    content = content.replace(
      /setFecha\(ped\.fecha \|\| new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\);/g,
      'setFecha(ped.fecha || new Date().toISOString().split(\'T\')[0]);\n      setObservaciones(ped.observaciones || "");'
    );
  }

  // 5. Add Textarea UI before the footer
  const textareaHtml = `
                {/* Observaciones Generales */}
                <div className="mt-8 border-t border-white/10 pt-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {language === "es" ? "Observaciones Generales" : "General Notes"}
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-xl text-sm min-h-[100px]"
                    placeholder={language === "es" ? "Notas importantes, lugar de entrega, condiciones..." : "Important notes, delivery place, terms..."}
                  />
                </div>
`;

  if (!content.includes('Observaciones Generales')) {
    content = content.replace(
      /<div className="flex justify-end/g,
      textareaHtml + '\n                <div className="flex justify-end'
    );
    
    // Fallback for pedidos-entrantes which uses different spacing
    content = content.replace(
      /<div className="flex justify-end gap-3 pt-3 border-t border-slate-800\/60">/g,
      textareaHtml + '\n                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/60">'
    );
  }

  fs.writeFileSync(file, content);
}
console.log('Done UI mods');
