const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/pedidos-entrantes/page.tsx', 'utf8');

content = content.replace(
  '  FileSpreadsheet, \n  Plus,',
  '  FileSpreadsheet, \n  FileText,\n  Plus,'
);

content = content.replace(
  'const [formItems, setFormItems] = useState<Array<{ sku: string; descripcion: string; modelo: string; cantidad: number; precioUnitario: number }>>([\n    { sku: "", descripcion: "", modelo: "", cantidad: 1, precioUnitario: 0 }\n  ]);',
  'const [formItems, setFormItems] = useState<Array<{ sku: string; descripcion: string; detalles: string; modelo: string; cantidad: number; precioUnitario: number; showDetalles?: boolean }>>([\n    { sku: "", descripcion: "", detalles: "", modelo: "", cantidad: 1, precioUnitario: 0 }\n  ]);'
);

content = content.replace(
  'setFormItems([...formItems, { sku: "", descripcion: "", modelo: "", cantidad: 1, precioUnitario: 0 }]);',
  'setFormItems([...formItems, { sku: "", descripcion: "", detalles: "", modelo: "", cantidad: 1, precioUnitario: 0 }]);'
);

content = content.replace(
  'validItems.map(i => ({ sku: i.sku, descripcion: i.descripcion || "", modelo: i.modelo || "", cantidad: i.cantidad, precioUnitario: i.precioUnitario }))',
  'validItems.map(i => ({ sku: i.sku, descripcion: i.descripcion || "", detalles: i.detalles || "", modelo: i.modelo || "", cantidad: i.cantidad, precioUnitario: i.precioUnitario }))'
);

content = content.replace(
  /setFormItems\(\[\{ sku: "", descripcion: "", modelo: "", cantidad: 1, precioUnitario: 0 \}\]\);/g,
  'setFormItems([{ sku: "", descripcion: "", detalles: "", modelo: "", cantidad: 1, precioUnitario: 0 }]);'
);

content = content.replace(
  'descripcion: item.descripcion || "",\n                                  modelo: item.modelo || "",',
  'descripcion: item.descripcion || "",\n                                  detalles: item.detalles || "",\n                                  modelo: item.modelo || "",'
);

// We need to inject the button in the UI
const replaceUI = `                        <div className="w-24 text-right px-2 font-mono text-sm text-slate-300 bg-slate-900/50 py-2 rounded-lg">
                          \${((item.cantidad || 0) * (item.precioUnitario || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...formItems];
                            updated[index].showDetalles = !updated[index].showDetalles;
                            setFormItems(updated);
                          }}
                          className={\`p-2 rounded-lg transition-colors cursor-pointer shrink-0 \${item.showDetalles ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10'}\`}
                          title={language === "es" ? "Añadir detalles/párrafo" : "Add details/paragraph"}
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFormItem(index)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {item.showDetalles && (
                        <div className="mt-2 w-full">
                          <textarea
                            placeholder={language === "es" ? "Especificaciones, detalles técnicos o información adicional tipo párrafo..." : "Specifications, technical details or additional paragraph info..."}
                            value={item.detalles || ""}
                            onChange={(e) => handleFormItemChange(index, "detalles", e.target.value)}
                            className="glass-input w-full px-3 py-2 rounded-lg text-xs min-h-[60px] resize-y"
                          />
                        </div>
                      )}
                      </div>`;

content = content.replace(
  `                        <div className="w-24 text-right px-2 font-mono text-sm text-slate-300 bg-slate-900/50 py-2 rounded-lg">
                          \${((item.cantidad || 0) * (item.precioUnitario || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFormItem(index)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>`,
  replaceUI
);

// Second replace is for the closing map
content = content.replace(
  '                      </div>\n                    ))}',
  '                    ))}' // wait, I already added </div> in replaceUI
);

fs.writeFileSync('frontend/src/app/pedidos-entrantes/page.tsx', content);
console.log('Done!');
