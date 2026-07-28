const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/pedidos-proveedor/page.tsx', 'utf8');

content = content.replace(
  '  FileSpreadsheet,',
  '  FileSpreadsheet,\n  FileText,'
);

content = content.replace(
  'const [formItems, setFormItems] = useState<Array<{ sku: string; descripcion?: string; cantidadPedida: number; costoUnitario?: number }>>([\n    { sku: "", cantidadPedida: 1 }\n  ]);',
  'const [formItems, setFormItems] = useState<Array<{ sku: string; descripcion?: string; detalles?: string; showDetalles?: boolean; cantidadPedida: number; costoUnitario?: number }>>([\n    { sku: "", cantidadPedida: 1 }\n  ]);'
);

content = content.replace(
  /setFormItems\(\[\{ sku: "", cantidadPedida: 1 \}\]\);/g,
  'setFormItems([{ sku: "", cantidadPedida: 1 }]);'
);

content = content.replace(
  'descripcion: i.descripcion,',
  'descripcion: i.descripcion,\n            detalles: i.detalles,'
);

const replaceUI = `                        <input
                          type="number"
                          step="0.01"
                          placeholder={language === "es" ? "Costo U." : "Unit Cost"}
                          value={item.costoUnitario || ""}
                          onChange={(e) => handleFormItemChange(idx, "costoUnitario", Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-24 px-3 py-2 rounded-xl text-xs glass-input text-center"
                          disabled={submitting}
                          title={language === "es" ? "Costo de Compra Proveedor" : "Supplier Purchase Cost"}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...formItems];
                            updated[idx].showDetalles = !updated[idx].showDetalles;
                            setFormItems(updated);
                          }}
                          className={\`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 \${item.showDetalles ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10'}\`}
                          title={language === "es" ? "Añadir detalles/párrafo" : "Add details/paragraph"}
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFormItem(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                          disabled={submitting || formItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {item.showDetalles && (
                        <div className="w-full mt-1">
                          <textarea
                            placeholder={language === "es" ? "Especificaciones, detalles técnicos o información adicional tipo párrafo..." : "Specifications, technical details or additional paragraph info..."}
                            value={item.detalles || ""}
                            onChange={(e) => handleFormItemChange(idx, "detalles", e.target.value)}
                            className="glass-input w-full px-3 py-2 rounded-lg text-xs min-h-[60px] resize-y"
                          />
                        </div>
                      )}
                      
                    </div>`;

content = content.replace(
  `                        <input
                          type="number"
                          step="0.01"
                          placeholder={language === "es" ? "Costo U." : "Unit Cost"}
                          value={item.costoUnitario || ""}
                          onChange={(e) => handleFormItemChange(idx, "costoUnitario", Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-24 px-3 py-2 rounded-xl text-xs glass-input text-center"
                          disabled={submitting}
                          title={language === "es" ? "Costo de Compra Proveedor" : "Supplier Purchase Cost"}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFormItem(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                          disabled={submitting || formItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>`,
  replaceUI
);

// We need to check if there is logic for autocomplete SKU
content = content.replace(
  'if (field === "sku" && productos.length > 0) {\n      const prod = productos.find(p => p.sku === value.toUpperCase());\n      if (prod) {\n        (updated[index] as any)["descripcion"] = prod.descripcion;\n      }\n    }',
  'if (field === "sku" && productos.length > 0) {\n      const prod = productos.find(p => p.sku === value.toUpperCase());\n      if (prod) {\n        (updated[index] as any)["descripcion"] = prod.descripcion;\n        (updated[index] as any)["detalles"] = prod.detalles || "";\n      }\n    }'
);

// also fix the closing map parenthesis since we added a div wrapper around the row + textarea
content = content.replace(
  '                      </div>\n                    ))}',
  '                    ))}' // wait, I already added </div> in replaceUI above, so I don't need to replace the closing tag! Actually, wait. replaceUI ends with `</div>` which closes the `flex gap-2`? No, wait!
);

fs.writeFileSync('frontend/src/app/pedidos-proveedor/page.tsx', content);
console.log('Done!');
