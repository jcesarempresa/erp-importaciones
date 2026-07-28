const fs = require('fs');
const path = require('path');

const uiFiles = [
  path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx'),
  path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx')
];

for (const file of uiFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Add obsExpanded state
    if (!content.includes('obsExpanded')) {
      content = content.replace(
        /const \[observaciones, setObservaciones\] = useState<string>\(""\);/,
        `const [observaciones, setObservaciones] = useState<string>("");\n  const [obsExpanded, setObsExpanded] = useState(false);`
      );
    }

    // 2. Change AI import to showDetalles: false
    content = content.replace(/showDetalles:\s*!!item\.detalles/g, 'showDetalles: false');

    // 3. Update the item detalles render block
    const oldDetallesBlockRegex = /\{item\.showDetalles && \(\s*<div className="mt-2 w-full">\s*<textarea[\s\S]*?className="glass-input w-full px-3 py-2 rounded-lg text-xs min-h-\[60px\] resize-y"\s*\/>\s*<\/div>\s*\)\}/;
    
    const newDetallesBlock = `{!item.showDetalles && item.detalles ? (
                        <div className="mt-2 w-full flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-700/50 group transition-all">
                          <div className="text-[10px] text-slate-400 truncate flex-1 font-mono pr-4 cursor-pointer" onClick={() => { const u = [...formItems]; u[index].showDetalles = true; setFormItems(u); }}>
                            {item.detalles}
                          </div>
                          <button 
                            type="button" 
                            onClick={() => { const u = [...formItems]; u[index].showDetalles = true; setFormItems(u); }}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 rounded cursor-pointer shrink-0 transition-colors"
                          >
                            {language === "es" ? "Ampliar" : "Expand"}
                          </button>
                        </div>
                      ) : item.showDetalles ? (
                        <div className="mt-2 w-full relative">
                          <textarea
                            placeholder={language === "es" ? "Especificaciones, detalles técnicos o información adicional tipo párrafo..." : "Specifications, technical details or additional paragraph info..."}
                            value={item.detalles || ""}
                            onChange={(e) => handleFormItemChange(index, "detalles", e.target.value)}
                            className="glass-input w-full px-3 py-2 rounded-lg text-xs min-h-[70px] resize-y pr-16"
                            rows={3}
                          />
                          <button 
                            type="button" 
                            onClick={() => { const u = [...formItems]; u[index].showDetalles = false; setFormItems(u); }}
                            className="absolute top-2 right-2 text-[10px] bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 px-2 py-1 rounded cursor-pointer transition-colors"
                          >
                            {language === "es" ? "Contraer" : "Collapse"}
                          </button>
                        </div>
                      ) : null}`;

    content = content.replace(oldDetallesBlockRegex, newDetallesBlock);

    // 4. Update the observaciones generales block
    const oldObsBlockRegex = /<label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">\s*\{language === "es" \? "Observaciones Generales" : "General Notes"\}\s*<\/label>\s*<textarea\s*value=\{observaciones\}\s*onChange=\{\(e\) => setObservaciones\(e\.target\.value\)\}\s*className="glass-input w-full px-4 py-3 rounded-xl text-sm min-h-\[100px\]"\s*placeholder=\{language === "es" \? "Notas importantes, lugar de entrega, condiciones\.\.\." : "Important notes, delivery place, terms\.\.\."\}\s*\/>/;

    const newObsBlock = `<div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {language === "es" ? "Observaciones Generales" : "General Notes"}
                    </label>
                    {observaciones && (
                      <button 
                        type="button" 
                        onClick={() => setObsExpanded(!obsExpanded)} 
                        className={\`text-[10px] px-2 py-1 rounded transition-colors \${obsExpanded ? 'text-slate-400 bg-slate-800/50 hover:bg-slate-800' : 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 font-bold'}\`}
                      >
                        {obsExpanded ? (language === "es" ? "Contraer" : "Collapse") : (language === "es" ? "Ampliar" : "Expand")}
                      </button>
                    )}
                  </div>
                  {!obsExpanded && observaciones ? (
                    <div 
                      className="w-full px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-xs text-slate-400 truncate font-mono cursor-pointer hover:bg-slate-900/80 transition-colors"
                      onClick={() => setObsExpanded(true)}
                    >
                      {observaciones}
                    </div>
                  ) : (
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      className="glass-input w-full px-4 py-3 rounded-xl text-sm min-h-[100px] resize-y"
                      placeholder={language === "es" ? "Notas importantes, lugar de entrega, condiciones..." : "Important notes, delivery place, terms..."}
                      rows={4}
                    />
                  )}`;

    content = content.replace(oldObsBlockRegex, newObsBlock);

    fs.writeFileSync(file, content);
  }
}
console.log('Added Ampliar toggles for UI items and observations.');
