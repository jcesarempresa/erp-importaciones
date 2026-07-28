const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/ordenes-cliente/page.tsx', 'utf8');

content = content.replace(
  '  FileSpreadsheet,',
  '  FileSpreadsheet,\n  FileText,'
);

content = content.replace(
  'const [formItems, setFormItems] = useState<Array<{ sku: string; descripcion: string; cantidadPedida: number; precioUnitario: number; proveedores: Array<{proveedorId: string; proveedorNombre: string; cantidad: number}> }>>([\n    { sku: "", descripcion: "", cantidadPedida: 1, precioUnitario: 0, proveedores: [] }\n  ]);',
  'const [formItems, setFormItems] = useState<Array<{ sku: string; descripcion: string; detalles?: string; showDetalles?: boolean; cantidadPedida: number; precioUnitario: number; proveedores: Array<{proveedorId: string; proveedorNombre: string; cantidad: number}> }>>([\n    { sku: "", descripcion: "", detalles: "", cantidadPedida: 1, precioUnitario: 0, proveedores: [] }\n  ]);'
);

content = content.replace(
  'setFormItems([...formItems, { sku: "", descripcion: "", cantidadPedida: 1, precioUnitario: 0, proveedores: [] }]);',
  'setFormItems([...formItems, { sku: "", descripcion: "", detalles: "", cantidadPedida: 1, precioUnitario: 0, proveedores: [] }]);'
);

content = content.replace(
  /setFormItems\(\[\{ sku: "", descripcion: "", cantidadPedida: 1, precioUnitario: 0, proveedores: \[\] \}\]\);/g,
  'setFormItems([{ sku: "", descripcion: "", detalles: "", cantidadPedida: 1, precioUnitario: 0, proveedores: [] }]);'
);

content = content.replace(
  'descripcion: i.descripcion || "",\n            cantidadPedida: i.cantidadPedida,',
  'descripcion: i.descripcion || "",\n            detalles: i.detalles || "",\n            cantidadPedida: i.cantidadPedida,'
);

content = content.replace(
  'descripcion: i.descripcion || "",\n                              cantidadPedida: i.cantidad,',
  'descripcion: i.descripcion || "",\n                              detalles: i.detalles || "",\n                              cantidadPedida: i.cantidad,'
);

const replaceUI = `                            <div className="w-24 text-right pr-2 text-xs font-mono text-slate-300 font-bold bg-slate-900/50 py-2 rounded-xl">
                              \${((item.cantidadPedida || 0) * (item.precioUnitario || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...formItems];
                                updated[idx].showDetalles = !updated[idx].showDetalles;
                                setFormItems(updated);
                              }}
                              className={\`p-2 rounded-xl transition-colors cursor-pointer shrink-0 \${item.showDetalles ? 'text-indigo-400 bg-indigo-500/20 border border-indigo-500/20' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 border border-transparent'}\`}
                              title={language === "es" ? "Añadir detalles/párrafo" : "Add details/paragraph"}
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFormItem(idx)}
                              className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-colors shrink-0"
                              disabled={submitting || formItems.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {item.showDetalles && (
                          <div className="w-full">
                            <textarea
                              placeholder={language === "es" ? "Especificaciones o información adicional..." : "Specifications or additional info..."}
                              value={item.detalles || ""}
                              onChange={(e) => handleFormItemChange(idx, "detalles", e.target.value)}
                              className="glass-input w-full px-3 py-2 rounded-lg text-xs min-h-[60px] resize-y"
                            />
                          </div>
                        )}

                        {/* Proveedores asignados a este ítem */}`;

content = content.replace(
  `                            <div className="w-24 text-right pr-2 text-xs font-mono text-slate-300 font-bold bg-slate-900/50 py-2 rounded-xl">
                              \${((item.cantidadPedida || 0) * (item.precioUnitario || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFormItem(idx)}
                              className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-colors shrink-0"
                              disabled={submitting || formItems.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Proveedores asignados a este ítem */}`,
  replaceUI
);

// We need to check if there is logic for autocomplete SKU
content = content.replace(
  'if (field === "sku" && productos.length > 0) {\n      const prod = productos.find(p => p.sku === value.toUpperCase());\n      if (prod) {\n        (updated[index] as any)["descripcion"] = prod.descripcion;\n      }\n    }',
  'if (field === "sku" && productos.length > 0) {\n      const prod = productos.find(p => p.sku === value.toUpperCase());\n      if (prod) {\n        (updated[index] as any)["descripcion"] = prod.descripcion;\n        (updated[index] as any)["detalles"] = prod.detalles || "";\n      }\n    }'
);


fs.writeFileSync('frontend/src/app/ordenes-cliente/page.tsx', content);
console.log('Done!');
