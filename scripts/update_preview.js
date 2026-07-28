const fs = require('fs');
const path = require('path');

const pedidosFile = path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx');
const cotizacionesFile = path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx');

if (fs.existsSync(pedidosFile)) {
  let content = fs.readFileSync(pedidosFile, 'utf8');
  content = content.replace(
    /<div key=\{idx\} className="font-mono text-\[10px\]">\s*\{i\.sku\} x\{i\.cantidad\}\s*<\/div>/g,
    `<div key={idx} className="font-mono text-[10px] flex items-center gap-1">
                          <span className="truncate max-w-[200px]" title={i.descripcion || i.sku}>{i.descripcion || i.sku}</span> 
                          <span className="text-slate-400 font-bold">x{i.cantidad}</span>
                        </div>`
  );
  fs.writeFileSync(pedidosFile, content);
}

if (fs.existsSync(cotizacionesFile)) {
  let content = fs.readFileSync(cotizacionesFile, 'utf8');
  content = content.replace(
    /<div key=\{idx\} className="font-mono text-\[10px\]">\s*\{i\.sku\} x\{i\.cantidad\} \(\\\$\{i\.precioUnitario\}\)\s*<\/div>/g,
    `<div key={idx} className="font-mono text-[10px] flex items-center gap-1">
                          <span className="truncate max-w-[200px]" title={i.descripcion || i.sku}>{i.descripcion || i.sku}</span> 
                          <span className="text-slate-400 font-bold">x{i.cantidad}</span> 
                          <span className="text-emerald-400">(\${i.precioUnitario})</span>
                        </div>`
  );
  fs.writeFileSync(cotizacionesFile, content);
}

console.log('Updated item previews to show descriptions.');
