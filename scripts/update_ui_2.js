const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add List icon import
  content = content.replace(/import \{\s*([\s\S]*?)\s*\} from "lucide-react";/, (match, p1) => {
    if (p1.includes('List,')) return match;
    return `import {\n  List,\n  ${p1}\n} from "lucide-react";`;
  });

  // 2. Add ItemsPreviewModal import
  if (!content.includes('ItemsPreviewModal')) {
    content = content.replace(/import ProductoAutocomplete, \{ ProductoHistorico \} from "@\/components\/ProductoAutocomplete";/, 
      `import ProductoAutocomplete, { ProductoHistorico } from "@/components/ProductoAutocomplete";\nimport ItemsPreviewModal from "@/components/ItemsPreviewModal";`);
  }
  
  // Make sure ItemCotizacion is imported in types if not there
  content = content.replace(/import \{ Requerimiento, Cliente, Responsable \} from "@\/types";/, `import { Requerimiento, Cliente, Responsable, ItemCotizacion } from "@/types";`);
  content = content.replace(/import \{ Cotizacion, Cliente, Responsable \} from "@\/types";/, `import { Cotizacion, Cliente, Responsable, ItemCotizacion } from "@/types";`);

  // 3. Add viewingItems state
  if (!content.includes('viewingItems')) {
    content = content.replace(/const \[loading, setLoading\] = useState\(true\);/, `const [loading, setLoading] = useState(true);\n  const [viewingItems, setViewingItems] = useState<ItemCotizacion[] | null>(null);`);
  }

  // 4. Replace ITEMS column rendering
  // The column looks like this:
  /*
  <td className="p-4">
    <div className="space-y-1">
      {cot.items.map((i, idx) => (
        <div key={idx} className="font-mono text-[10px] flex items-center gap-1">
          <span className="truncate max-w-[200px]" title={i.descripcion || i.sku}>{i.descripcion || i.sku}</span> 
          <span className="text-slate-400 font-bold">x{i.cantidad}</span>
        </div>
      ))}
    </div>
  </td>
  */
  // Or with price in cotizaciones.
  const regexItemsTd = /<td className="p-4">\s*<div className="space-y-1">\s*\{cot\.items\.map\([\s\S]*?\)\}\s*<\/div>\s*<\/td>/g;
  
  const newItemTd = `<td className="p-4">
                      <button
                        onClick={() => setViewingItems(cot.items)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors flex items-center gap-2 text-xs font-medium"
                      >
                        <List className="h-4 w-4" />
                        {cot.items.length} {language === "es" ? "ítems" : "items"}
                      </button>
                    </td>`;
  
  content = content.replace(regexItemsTd, newItemTd);

  // 5. Fix Trash2 button location
  // Find the Anular and Eliminar buttons.
  // In pedidos: 
  /*
  <button onClick={() => handleAnular(cot.id!)} ...> ... </button>
  <button onClick={() => handleEliminar(cot.id!)} ...> ... </button>
  */
  // They are currently INSIDE the {cot.estado === "requerimiento" && (...)} or similar?
  // Actually, wait. The structure is:
  /*
    <div className="flex gap-2 justify-end items-center">
      <button ...> Imprimir </button>
      
      {cot.estado === "aprobado" && ( ... )}
      {cot.estado === "requerimiento" && ( ... Presupuestar, Editar, Anular, Eliminar ... )}
    </div>
  */
  // Wait! In the script `update_ui.js`, I put `Eliminar` NEXT TO `Anular`.
  // If `Anular` is inside `{cot.estado === "requerimiento" && ... }` then `Eliminar` is also inside it!
  // This means "Anulado" status won't show the Trash button.
  
  // We need to move both `handleAnular` and `handleEliminar` out? No, `Anular` should only be available if it's NOT anulado.
  // Let's just remove the `Eliminar` button from where it is and append it at the end of the `</div>` of the `.flex` container.
  
  const deleteBtnRegex = /\s*<button\s*onClick=\{\(\) => handleEliminar\(cot\.id!\)\}[\s\S]*?<\/button>/g;
  // Remove all existing delete buttons
  content = content.replace(deleteBtnRegex, '');

  // Add the delete button AT THE END of the flex container.
  // The flex container ends with: `</div>\n                    </td>`
  const flexContainerEndRegex = /<\/div>\s*<\/td>/g;
  
  const deleteBtn = `
                        <button
                          onClick={() => handleEliminar(cot.id!)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1 border border-red-500/20"
                          title={language === "es" ? "Eliminar permanentemente" : "Delete permanently"}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>`;
                    
  content = content.replace(flexContainerEndRegex, deleteBtn);

  // 6. Add the Modal at the very end of the file, just before the last </div>
  // Let's find the closing tag of the main layout, usually `<ContactoSearchModal` is at the end.
  const modalInjectionRegex = /(<ContactoSearchModal[\s\S]*?\/>\s*)}/g;
  
  const itemsModalStr = `$1
      <ItemsPreviewModal
        isOpen={!!viewingItems}
        onClose={() => setViewingItems(null)}
        items={viewingItems || []}
      />
      }`;
  
  content = content.replace(modalInjectionRegex, itemsModalStr);

  fs.writeFileSync(filePath, content);
}

processFile(path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx'));
processFile(path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx'));

console.log('UI updated for Items modal and global delete button.');
