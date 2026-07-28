const fs = require('fs');
const path = 'frontend/src/app/pedidos-entrantes/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Remove Headers "Precio U." and "Total"
content = content.replace(
  /<div className="flex-1 font-semibold text-slate-400 pl-4">\{language === "es" \? "Precio U\." : "Unit Price"\}<\/div>\s*<div className="flex-1 font-semibold text-slate-400 text-right pr-4">Total<\/div>/,
  ''
);

// 2. Remove inputs in the map
content = content.replace(
  /<input\s+type="number"\s+placeholder=\{language === "es" \? "Precio U\." : "Unit Price"\}[\s\S]*?min="0"\s*\/>\s*<div className="w-24 text-right font-medium text-white tabular-nums px-2">\s*\{formatCurrency\(item\.cantidad \* \(item\.precioUnitario \|\| 0\)\)\}\s*<\/div>/,
  ''
);

// 3. Remove Totals block (the flex container with Flete, Arancel, and Subtotals)
// Let's find the specific block starting with:
// <div className="mt-8 flex justify-between items-start border-t border-white/10 pt-6">
// and ending before the Cancel / Guardar buttons
content = content.replace(
  /<div className="mt-8 flex justify-between items-start border-t border-white\/10 pt-6">[\s\S]*?(?=<div className="flex justify-end pt-6 border-t border-white\/10 mt-8 space-x-4">)/,
  ''
);

// 4. In `const validItems = formItems.filter...`, remove the `precioUnitario >= 0` check
content = content.replace(
  /&& i\.precioUnitario >= 0/,
  ''
);

fs.writeFileSync(path, content);
console.log('Done');
