const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx'),
  path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx')
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // 1. Fix Headers
  const oldHeaders = `<div className="hidden md:flex flex-wrap md:flex-nowrap items-center gap-2 px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="w-full md:w-48 shrink-0">{language === "es" ? "CÓDIGO" : "CODE"}</div>
                    <div className="w-full md:w-16 shrink-0 text-center">POS</div>
                    <div className="w-full md:flex-1">{language === "es" ? "Descripción del Producto" : "Product Description"}</div>
                    <div className="w-full md:w-32 shrink-0">{language === "es" ? "Modelo" : "Model"}</div>
                    <div className="w-20 shrink-0 text-center">{language === "es" ? "Cant." : "Qty"}</div>
                    <div className="w-28 shrink-0 text-right">{language === "es" ? "Precio U." : "Unit P."}</div>
                    <div className="w-24 shrink-0 text-right">Total</div>
                    <div className="w-8 shrink-0"></div>
                  </div>`;
  const newHeaders = `<div className="hidden md:flex flex-wrap md:flex-nowrap items-center gap-2 px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
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
                  </div>`;
  content = content.replace(oldHeaders, newHeaders);

  // 2. Fix Flex container class to allow wrapping if the screen is too small
  content = content.replace(
    `<div className="flex flex-wrap md:flex-nowrap items-center gap-2 p-2 bg-slate-800/30 rounded-xl border border-slate-700/50">`,
    `<div className="flex flex-wrap items-center gap-2 p-2 bg-slate-800/30 rounded-xl border border-slate-700/50">`
  );

  // 3. Update Inputs Widths
  content = content.replace(
    `containerClassName="w-full md:w-48 shrink-0"`,
    `containerClassName="w-full md:w-32 shrink-0"`
  );
  content = content.replace(
    `className="glass-input w-full md:w-16 shrink-0 px-2 py-2 rounded-lg text-sm text-center font-mono"`,
    `className="glass-input w-full md:w-12 shrink-0 px-2 py-2 rounded-lg text-sm text-center font-mono"`
  );
  content = content.replace(
    `className="glass-input w-full md:w-32 px-3 py-2 rounded-lg text-sm"`,
    `className="glass-input w-full md:w-24 shrink-0 px-3 py-2 rounded-lg text-sm"`
  );
  content = content.replace(
    `className="glass-input w-20 px-3 py-2 rounded-lg text-sm text-center"`,
    `className="glass-input w-16 shrink-0 px-3 py-2 rounded-lg text-sm text-center"`
  );
  content = content.replace(
    `className="glass-input w-28 px-3 py-2 rounded-lg text-sm text-right"`,
    `className="glass-input w-24 shrink-0 px-3 py-2 rounded-lg text-sm text-right"`
  );

  // 4. Inject the 3 new inputs after "Modelo"
  const oldModeloInput = `<input
                          type="text"
                          placeholder={language === "es" ? "Modelo" : "Model"}
                          value={item.modelo || ""}
                          onChange={(e) => handleFormItemChange(index, "modelo", e.target.value)}
                          className="glass-input w-full md:w-24 shrink-0 px-3 py-2 rounded-lg text-sm"
                        />`;
  const injectedInputs = `<input
                          type="text"
                          placeholder={language === "es" ? "Modelo" : "Model"}
                          value={item.modelo || ""}
                          onChange={(e) => handleFormItemChange(index, "modelo", e.target.value)}
                          className="glass-input w-full md:w-24 shrink-0 px-3 py-2 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Unid."
                          value={item.unidad || ""}
                          onChange={(e) => handleFormItemChange(index, "unidad", e.target.value)}
                          className="glass-input w-full md:w-20 shrink-0 px-2 py-2 rounded-lg text-sm text-center"
                        />
                        <input
                          type="text"
                          placeholder="Plazo"
                          value={item.plazo || ""}
                          onChange={(e) => handleFormItemChange(index, "plazo", e.target.value)}
                          className="glass-input w-full md:w-24 shrink-0 px-2 py-2 rounded-lg text-sm text-center"
                        />
                        <input
                          type="text"
                          placeholder="F. Entr."
                          value={item.fechaEntrega || ""}
                          onChange={(e) => handleFormItemChange(index, "fechaEntrega", e.target.value)}
                          className="glass-input w-full md:w-32 shrink-0 px-2 py-2 rounded-lg text-sm text-center"
                        />`;
  
  if (content.includes(oldModeloInput)) {
    content = content.replace(oldModeloInput, injectedInputs);
  } else {
    console.log("Could not find exact Modelo input match in " + file);
  }

  fs.writeFileSync(file, content);
}

console.log('UI inputs explicitly updated.');
