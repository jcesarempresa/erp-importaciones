const fs = require('fs');
const path = require('path');

const pedidosFile = path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx');
const cotizacionesFile = path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx');

// --- UPDATE PEDIDOS-ENTRANTES ---
if (fs.existsSync(pedidosFile)) {
  let content = fs.readFileSync(pedidosFile, 'utf8');

  // 1. Remove TOTAL header
  content = content.replace(
    /<th className="px-4 py-3 border-b border-slate-700 font-semibold text-slate-300">TOTAL<\/th>/g,
    ''
  );

  // 2. Remove the Total <td> and subtotal text
  const totalTdRegex = /<td className="p-4 font-mono font-bold text-indigo-400">[\s\S]*?<\/td>/;
  content = content.replace(totalTdRegex, '');

  // 3. Remove price from item preview
  content = content.replace(
    /\{i\.sku\} x\{i\.cantidad\} \(\\\$\{i\.precioUnitario\}\)/g,
    '{i.sku} x{i.cantidad}'
  );

  // 4. Pass hidePrices={true} to PrintCotizacion
  content = content.replace(
    /<PrintCotizacion\s*cotizacion=\{printTarget\}\s*empresa=\{empresa\}\s*language=\{language\}\s*clientes=\{clientes\}\s*onClose=\{.*\}/,
    match => match + ' hidePrices={true}'
  );

  // 5. Add pos to formItems state
  content = content.replace(
    /const \[formItems, setFormItems\] = useState<Array<\{ sku: string; descripcion: string; detalles: string; modelo: string; cantidad: number; precioUnitario: number; showDetalles\?: boolean \}>>\(\[/,
    'const [formItems, setFormItems] = useState<Array<{ pos?: string; sku: string; descripcion: string; detalles: string; modelo: string; cantidad: number; precioUnitario: number; showDetalles?: boolean }>>(['
  );

  // 6. Add pos to initial state and handleAddFormItem
  content = content.replace(
    /\{ sku: "", descripcion: "", detalles: "", modelo: "", cantidad: 1, precioUnitario: 0 \}/g,
    '{ pos: "", sku: "", descripcion: "", detalles: "", modelo: "", cantidad: 1, precioUnitario: 0 }'
  );

  // 7. Add pos input to the UI
  // The UI has <ProductoAutocomplete value={item.sku}
  // Let's insert a small input before it
  const skuRegex = /(<ProductoAutocomplete\s*value=\{item\.sku\})/g;
  content = content.replace(skuRegex, 
    '<input type="text" placeholder="Pos" value={item.pos || ""} onChange={e => handleFormItemChange(index, "pos", e.target.value)} className="glass-input w-12 px-2 py-2 rounded-lg text-sm text-center font-mono" />\n$1'
  );

  fs.writeFileSync(pedidosFile, content);
}

// --- UPDATE COTIZACIONES ---
if (fs.existsSync(cotizacionesFile)) {
  let content = fs.readFileSync(cotizacionesFile, 'utf8');

  // 1. Add pos to formItems state
  content = content.replace(
    /const \[formItems, setFormItems\] = useState<Array<\{ sku: string; descripcion: string; detalles: string; modelo: string; cantidad: number; precioUnitario: number; showDetalles\?: boolean \}>>\(\[/,
    'const [formItems, setFormItems] = useState<Array<{ pos?: string; sku: string; descripcion: string; detalles: string; modelo: string; cantidad: number; precioUnitario: number; showDetalles?: boolean }>>(['
  );

  // 2. Add pos to initial state and handleAddFormItem
  content = content.replace(
    /\{ sku: "", descripcion: "", detalles: "", modelo: "", cantidad: 1, precioUnitario: 0 \}/g,
    '{ pos: "", sku: "", descripcion: "", detalles: "", modelo: "", cantidad: 1, precioUnitario: 0 }'
  );

  // 3. Add pos input to the UI
  const skuRegex = /(<ProductoAutocomplete\s*value=\{item\.sku\})/g;
  content = content.replace(skuRegex, 
    '<input type="text" placeholder="Pos" value={item.pos || ""} onChange={e => handleFormItemChange(index, "pos", e.target.value)} className="glass-input w-12 px-2 py-2 rounded-lg text-sm text-center font-mono" />\n$1'
  );

  fs.writeFileSync(cotizacionesFile, content);
}

console.log('Fixed pedidos prices and added pos input.');
