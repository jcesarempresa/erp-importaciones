const fs = require('fs');

const files = [
  'frontend/src/app/cotizaciones/page.tsx',
  'frontend/src/app/pedidos-entrantes/page.tsx',
  'frontend/src/app/ordenes-cliente/page.tsx',
  'frontend/src/app/pedidos-proveedor/page.tsx'
];

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

// A regex to match the exact block we injected
const blockRegex = /\s*\{\/\* Observaciones Generales \*\/\}\s*<div className="mt-8 border-t border-white\/10 pt-6">\s*<label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">\s*\{language === "es" \? "Observaciones Generales" : "General Notes"\}\s*<\/label>\s*<textarea\s*value=\{observaciones\}\s*onChange=\{\(e\) => setObservaciones\(e\.target\.value\)\}\s*className="glass-input w-full px-4 py-3 rounded-xl text-sm min-h-\[100px\]"\s*placeholder=\{language === "es" \? "Notas importantes, lugar de entrega, condiciones\.\.\." : "Important notes, delivery place, terms\.\.\."\}\s*\/>\s*<\/div>/g;

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');

  // 1. Remove all instances of the block
  content = content.replace(blockRegex, '');

  // 2. Inject exactly once before the main Cancel button block
  // We can find the main footer by looking for:
  // <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/60">
  // OR
  // <div className="flex justify-end pt-6 border-t border-white/10 mt-8 space-x-4">
  // but ONLY the one that contains onClick={() => setModalOpen(false)}
  
  // Let's use a regex that matches the div containing the modal Cancel button
  content = content.replace(
    /(<div className="[^"]*flex justify-end[^"]*">\s*<button\s+type="button"\s+onClick=\{\(\) => setModalOpen\(false\)\})/g,
    textareaHtml + '\n                $1'
  );

  fs.writeFileSync(file, content);
}
console.log('Done fixing duplicate UI');
