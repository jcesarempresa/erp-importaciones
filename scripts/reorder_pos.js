const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx'),
  path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx')
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // 1. Swap CÓDIGO and POS inputs
  const posInputRegex = /<input\s+type="text"\s+placeholder="POS"[\s\S]*?\/>\s*/;
  const matchPos = content.match(posInputRegex);
  if (matchPos) {
    const posInputString = matchPos[0];
    content = content.replace(posInputString, ''); // Remove POS from where it is currently
    
    // Insert POS after ProductoAutocomplete for CÓDIGO
    // I will find the end of the first ProductoAutocomplete by finding the exact string.
    const autocompleteRegex = /<ProductoAutocomplete\s+value=\{item\.sku\}[\s\S]*?className="glass-input w-full px-3 py-2 rounded-lg text-sm font-mono"\s*\/>\s*/;
    content = content.replace(autocompleteRegex, (match) => {
      return match + posInputString;
    });
  }

  // 2. Add header legend
  // We need to find the <div className="space-y-2"> block that wraps formItems.map and insert headers before it.
  const headersJSX = `
                  <div className="hidden md:flex flex-wrap md:flex-nowrap items-center gap-2 px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="w-full md:w-48 shrink-0">{language === "es" ? "CÓDIGO" : "CODE"}</div>
                    <div className="w-full md:w-16 shrink-0 text-center">POS</div>
                    <div className="w-full md:flex-1">{language === "es" ? "Descripción del Producto" : "Product Description"}</div>
                    <div className="w-full md:w-32 shrink-0">{language === "es" ? "Modelo" : "Model"}</div>
                    <div className="w-20 shrink-0 text-center">{language === "es" ? "Cant." : "Qty"}</div>
                    <div className="w-28 shrink-0 text-right">{language === "es" ? "Precio U." : "Unit P."}</div>
                    <div className="w-24 shrink-0 text-right">Total</div>
                    <div className="w-8 shrink-0"></div>
                  </div>
                  <div className="space-y-2">`;
                  
  // Avoid duplicating if I run this script multiple times
  if (!content.includes('tracking-wider')) {
    content = content.replace(/<div className="space-y-2">/, headersJSX);
  }

  fs.writeFileSync(file, content);
}

console.log('Layout updated.');
