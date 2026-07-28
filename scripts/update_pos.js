const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx'),
  path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx')
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add `pos?: string` to state type
  content = content.replace(
    /Array<\{ sku: string;/g,
    'Array<{ pos?: string; sku: string;'
  );

  // 2. Add `pos: ""` to initialization
  content = content.replace(
    /\{ sku: "",/g,
    '{ pos: "", sku: "",'
  );

  // 3. Map `pos` from `cot.items`
  content = content.replace(
    /sku: item.sku,/g,
    'pos: item.pos || "",\n                                  sku: item.sku,'
  );

  // 4. Send `pos` to backend
  // validItems.map(i => ({ sku: i.sku
  content = content.replace(
    /\{ sku: i.sku,/g,
    '{ pos: i.pos || "", sku: i.sku,'
  );

  // 5. Add input element in JSX
  const skuInputRegex = /(<ProductoAutocomplete[\s\S]*?value=\{item.sku\})/;
  const posInput = `
                        <input
                          type="text"
                          placeholder="POS"
                          value={item.pos || ""}
                          onChange={(e) => handleFormItemChange(index, "pos", e.target.value)}
                          className="glass-input w-full md:w-16 shrink-0 px-2 py-2 rounded-lg text-sm text-center font-mono"
                          title="Posición / Item No."
                        />
                        $1`;
  content = content.replace(skuInputRegex, posInput);

  fs.writeFileSync(file, content);
}

console.log('POS field added to forms.');
