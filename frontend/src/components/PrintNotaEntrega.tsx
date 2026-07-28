"use client";

import { useEffect, useRef, useState } from "react";
import { NotaEntrega, Cliente, OrdenCliente } from "@/types";
import { EmpresaConfig } from "@/lib/api/importaciones";
import { X, Printer, Loader2 } from "lucide-react";

interface Props {
  despacho: NotaEntrega;
  empresa: EmpresaConfig;
  onClose: () => void;
  language: string;
}

export default function PrintNotaEntrega({ despacho, empresa, onClose, language }: Props) {
  const [overrideBanco, setOverrideBanco] = useState<string>("");
  const [formato, setFormato] = useState<"BS_LIBRE" | "BS" | "USD">("BS_LIBRE");
  const [mostrarPrecios, setMostrarPrecios] = useState<boolean>(false);
  const [tasaCambio, setTasaCambio] = useState<string>("36.50");
  
  const [orden, setOrden] = useState<OrdenCliente | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [rates, setRates] = useState<{ oficial: number; paralelo: number } | null>(null);
  
  const printRootRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // Cargar tasas oficiales y paralelas
  useEffect(() => {
    async function getRates() {
      try {
        const res = await fetch("https://ve.dolarapi.com/v1/dolares");
        if (res.ok) {
          const data = await res.json();
          const oficial = data.find((d: any) => d.fuente === "oficial")?.promedio || 0;
          const paralelo = data.find((d: any) => d.fuente === "paralelo")?.promedio || 0;
          if (oficial > 0 && paralelo > 0) {
            setRates({ oficial, paralelo });
            setTasaCambio(paralelo.toFixed(2));
          }
        }
      } catch (err) {
        console.error("Error loading rates in PrintNotaEntrega:", err);
      }
    }
    getRates();
  }, []);

  // Cargar orden y clientes para resolver descripciones, precios unitarios y dirección
  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      try {
        const { obtenerOrdenesCliente, obtenerClientes } = await import("@/lib/api/importaciones");
        const [ordenes, clientesData] = await Promise.all([
          obtenerOrdenesCliente(),
          obtenerClientes()
        ]);
        const found = ordenes.find(o => o.id === despacho.ordenClienteId);
        if (found) {
          setOrden(found);
        }
        setClientes(clientesData);
      } catch (err) {
        console.error("Error loading details for PrintNotaEntrega:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [despacho.ordenClienteId]);

  // Resetear banco seleccionado si cambia el formato a uno no compatible
  useEffect(() => {
    if (formato === "USD") {
      if (overrideBanco === "cuenta1" || overrideBanco === "cuenta2") {
        setOverrideBanco("");
      }
    } else {
      if (overrideBanco === "cuenta3" || overrideBanco === "cuenta4") {
        setOverrideBanco("");
      }
    }
  }, [formato, overrideBanco]);

  // Renderizar la vista preliminar en el elemento raíz de impresión global
  useEffect(() => {
    let el = document.getElementById("print-nota-entrega-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "print-nota-entrega-root";
      el.style.display = "none";
      document.body.appendChild(el);
    }
    printRootRef.current = el as HTMLDivElement;
    
    return () => {
      if (el) el.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    const el = document.getElementById("print-nota-entrega-root");
    if (!el) return;
    const rateVal = parseFloat(tasaCambio) || 36.50;
    el.innerHTML = buildPrintHTML(despacho, empresa, language, formato, mostrarPrecios, rateVal, overrideBanco, orden, clientes);
  }, [despacho, empresa, language, formato, mostrarPrecios, tasaCambio, overrideBanco, orden, clientes]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-5 border-b border-slate-800 gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Printer className="w-4 h-4 text-indigo-400" />
              {language === "es" ? "Nota de Entrega" : "Delivery Note"} — {despacho.id}
            </h2>

            {/* Toggle Formato Bs / USD */}
            <div className="flex items-center bg-slate-955 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setFormato("BS_LIBRE")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  formato === "BS_LIBRE" 
                    ? "bg-indigo-600 text-white shadow-md" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {language === "es" ? "Pre-impreso (Bs)" : "Pre-printed (Bs)"}
              </button>
              <button
                type="button"
                onClick={() => setFormato("BS")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  formato === "BS" 
                    ? "bg-indigo-600 text-white shadow-md" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {language === "es" ? "Completo (Bs)" : "Full (Bs)"}
              </button>
              <button
                type="button"
                onClick={() => setFormato("USD")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  formato === "USD" 
                    ? "bg-indigo-600 text-white shadow-md" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {language === "es" ? "Comercial ($ USD)" : "Commercial ($ USD)"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Toggle Mostrar Precios */}
            <label className="flex items-center gap-2 text-xs text-slate-300 font-semibold cursor-pointer">
              <input 
                type="checkbox"
                checked={mostrarPrecios}
                onChange={(e) => setMostrarPrecios(e.target.checked)}
                className="rounded border-slate-700 bg-slate-850 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              {language === "es" ? "Mostrar Precios" : "Show Prices"}
            </label>

            {/* Input Tasa de Cambio (Sólo si muestra precios en Bs) */}
            {mostrarPrecios && (formato === "BS" || formato === "BS_LIBRE") && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tasa:</span>
                  <input 
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={tasaCambio}
                    onChange={(e) => setTasaCambio(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-2.5 py-1.5 rounded-xl w-20 focus:outline-none focus:border-indigo-500 font-mono text-center"
                  />
                </div>
                {rates && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setTasaCambio(rates.oficial.toFixed(2))}
                      className="bg-slate-950 border border-slate-800 text-[9px] text-slate-400 hover:text-white px-2 py-1.5 rounded-xl transition-colors cursor-pointer"
                      title="Usar Tasa BCV Oficial"
                    >
                      BCV: <strong>{rates.oficial.toFixed(2)}</strong>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTasaCambio(rates.paralelo.toFixed(2))}
                      className="bg-slate-955 border border-slate-800 text-[9px] text-slate-400 hover:text-white px-2 py-1.5 rounded-xl transition-colors cursor-pointer"
                      title="Usar Tasa Binance / Paralelo"
                    >
                      Binance: <strong>{rates.paralelo.toFixed(2)}</strong>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bank Selector */}
            {(empresa.bancoNombre1 || empresa.bancoNombre2 || empresa.bancoNombre3 || empresa.bancoNombre4) && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {language === "es" ? "Cuenta:" : "Account:"}
                </span>
                <select
                  value={overrideBanco}
                  onChange={(e) => setOverrideBanco(e.target.value)}
                  className="bg-slate-955 border border-slate-800 text-slate-350 text-xs px-2.5 py-1.5 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option className="bg-slate-900 text-white" value="">{language === "es" ? "-- No Mostrar --" : "-- Do Not Show --"}</option>
                  {(formato === "BS" || formato === "BS_LIBRE") && (
                    <>
                      {empresa.bancoNombre1 && <option className="bg-slate-900 text-white" value="cuenta1">{empresa.bancoNombre1}</option>}
                      {empresa.bancoNombre2 && <option className="bg-slate-900 text-white" value="cuenta2">{empresa.bancoNombre2}</option>}
                    </>
                  )}
                  {formato === "USD" && (
                    <>
                      {empresa.bancoNombre3 && <option className="bg-slate-900 text-white" value="cuenta3">{empresa.bancoNombre3}</option>}
                      {empresa.bancoNombre4 && <option className="bg-slate-900 text-white" value="cuenta4">{empresa.bancoNombre4}</option>}
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
                disabled={loading}
              >
                <Printer className="w-4 h-4" />
                {language === "es" ? "Imprimir" : "Print"}
              </button>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="p-5 bg-slate-955/80 flex justify-center overflow-x-auto min-h-[500px] items-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-slate-400 py-10">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs font-medium">{language === "es" ? "Cargando detalles de orden..." : "Loading order details..."}</p>
            </div>
          ) : (
            <div 
              className="bg-white text-black shadow-2xl relative my-2" 
              style={{ width: "816px", minHeight: "1056px" }} // Letter size
              dangerouslySetInnerHTML={{ 
                __html: buildPrintHTML(despacho, empresa, language, formato, mostrarPrecios, parseFloat(tasaCambio) || 36.50, overrideBanco, orden, clientes) 
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Generador de HTML para replicación exacta en PDF
function buildPrintHTML(
  des: NotaEntrega,
  empresa: EmpresaConfig,
  lang: string,
  formato: "BS_LIBRE" | "BS" | "USD",
  mostrarPrecios: boolean,
  tasa: number,
  overrideBanco: string,
  orden: OrdenCliente | null,
  clientes: Cliente[]
): string {
  const isEs = lang === "es";
  const isLibre = formato === "BS_LIBRE";
  const isBs = formato === "BS" || formato === "BS_LIBRE";
  const currSymbol = isBs ? "Bs. " : "$";
  const currLabel = isBs ? " (Bs.)" : " (USD)";

  const cliente = clientes.find(c => c.id === des.clienteId);

  // Estado legible
  let estadoStr = isEs ? "PENDIENTE" : "PENDING";
  if (des.estado === "facturado") {
    estadoStr = isEs ? "FACTURADO" : "INVOICED";
  } else if (des.estado === "anulado") {
    estadoStr = isEs ? "ANULADO" : "VOIDED";
  }

  // HTML de las filas de ítems
  let subtotalUSD = 0;
  let itemsHtml = "";

  if (Array.isArray(des.items)) {
    des.items.forEach((item, idx) => {
      const ordenItem = orden?.items?.find(oi => oi.sku === item.sku);
      const desc = ordenItem?.descripcion || item.descripcion || item.sku;
      const priceUnitUSD = ordenItem?.precioUnitario || item.precioUnitario || 0;
      const subtotalItemUSD = item.cantidadDespachada * priceUnitUSD;
      subtotalUSD += subtotalItemUSD;

      const pUnit = isBs ? priceUnitUSD * tasa : priceUnitUSD;
      const pSub = isBs ? subtotalItemUSD * tasa : subtotalItemUSD;

      itemsHtml += `
        <tr style="border-bottom: 1px solid #ddd; page-break-inside: avoid; height: 26px;">
          <td style="padding: 6px; text-align: center; font-family: monospace;">${idx + 1}</td>
          <td style="padding: 6px; font-family: monospace; font-weight: bold; border-left: 1px solid #000; border-right: 1px solid #000;">${item.sku}</td>
          <td style="padding: 6px; border-right: 1px solid #000;">${desc}</td>
          <td style="padding: 6px; text-align: center; font-family: monospace; font-weight: bold; border-right: 1px solid #000;">${item.cantidadDespachada}</td>
          ${mostrarPrecios ? `
            <td style="padding: 6px; text-align: right; font-family: monospace; border-right: 1px solid #000;">${currSymbol}${pUnit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td style="padding: 6px; text-align: right; font-family: monospace; font-weight: bold;">${currSymbol}${pSub.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          ` : ""}
        </tr>
      `;
    });
  }

  const subtotal = isBs ? subtotalUSD * tasa : subtotalUSD;
  const total = subtotal; // Nota de entrega no tiene impuestos ni flete por sí misma, representa el costo bruto de lo entregado

  const itemsTableHtml = `
    <div style="margin-bottom: 25px;">
      <div style="font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 8px;">
        ${isEs ? "Detalle de Productos / Mercancía Despachada" : "Delivered Products / Merchandise Details"}
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 2px solid #000;">
        <thead>
          <tr style="background-color: #f0f0f0; border-bottom: 2px solid #000; font-weight: bold; height: 26px;">
            <th style="padding: 6px; text-align: center; width: 35px;">#</th>
            <th style="padding: 6px; text-align: left; width: 100px; border-left: 1px solid #000; border-right: 1px solid #000;">SKU</th>
            <th style="padding: 6px; text-align: left; border-right: 1px solid #000;">${isEs ? "DESCRIPCIÓN" : "DESCRIPTION"}</th>
            <th style="padding: 6px; text-align: center; width: 65px; border-right: 1px solid #000;">${isEs ? "CANT" : "QTY"}</th>
            ${mostrarPrecios ? `
              <th style="padding: 6px; text-align: right; width: 110px; border-right: 1px solid #000;">${isEs ? "PRECIO U." : "UNIT PRICE"}</th>
              <th style="padding: 6px; text-align: right; width: 120px;">SUBTOTAL</th>
            ` : ""}
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>
  `;

  // HTML de datos del cliente
  const clienteDetalleHtml = `
    <div style="font-weight: bold; font-size: 12px; margin-bottom: 2px;">${des.clienteNombre || "N/A"} ${cliente?.rif ? `<span style="font-size: 10px; font-weight: normal; margin-left: 6px;">| <strong>RIF/CI:</strong> ${cliente.rif}</span>` : ""}</div>
    ${cliente?.direccion ? `<div style="font-size: 10px; line-height: 1.2;"><strong>Dirección Fiscal:</strong> ${cliente.direccion}</div>` : ""}
    <div style="font-size: 10px; line-height: 1.2; margin-top: 1px;">
      ${cliente?.telefono ? `<span><strong>Teléfono:</strong> ${cliente.telefono}</span>` : ""}
      ${cliente?.email ? `<span style="margin-left: 8px;"><strong>Email:</strong> ${cliente.email}</span>` : ""}
    </div>
    ${cliente?.direccionDespacho && cliente.direccionDespacho !== cliente?.direccion ? `<div style="font-size: 10px; line-height: 1.2; margin-top: 1px;"><strong>Dirección Despacho:</strong> ${cliente.direccionDespacho}</div>` : ""}
  `;

  // Banco HTML
  let bancoHtml = "";
  let activeBanco = overrideBanco || "";
  if (formato === "USD") {
    if (activeBanco !== "cuenta3" && activeBanco !== "cuenta4") activeBanco = "";
  } else {
    if (activeBanco !== "cuenta1" && activeBanco !== "cuenta2") activeBanco = "";
  }

  if (activeBanco === "cuenta1" && empresa.bancoNombre1) {
    bancoHtml = `
    <div style="margin-top: 10px; font-size: 10px; border: 1px solid #000; padding: 6px; background-color: #f8fafc; page-break-inside: avoid;">
      <strong>Instrucciones de Pago / Transferencia (${empresa.bancoNombre1}):</strong><br/>
      <div style="white-space: pre-wrap; font-family: monospace; font-size: 9px; margin-top: 4px; line-height: 1.3;">${(empresa.bancoDetalle1 || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </div>
    `;
  } else if (activeBanco === "cuenta2" && empresa.bancoNombre2) {
    bancoHtml = `
    <div style="margin-top: 10px; font-size: 10px; border: 1px solid #000; padding: 6px; background-color: #f8fafc; page-break-inside: avoid;">
      <strong>Instrucciones de Pago / Transferencia (${empresa.bancoNombre2}):</strong><br/>
      <div style="white-space: pre-wrap; font-family: monospace; font-size: 9px; margin-top: 4px; line-height: 1.3;">${(empresa.bancoDetalle2 || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </div>
    `;
  } else if (activeBanco === "cuenta3" && empresa.bancoNombre3) {
    bancoHtml = `
    <div style="margin-top: 10px; font-size: 10px; border: 1px solid #000; padding: 6px; background-color: #f8fafc; page-break-inside: avoid;">
      <strong>Instrucciones de Pago / Transferencia Internacional (${empresa.bancoNombre3}):</strong><br/>
      <div style="white-space: pre-wrap; font-family: monospace; font-size: 9px; margin-top: 4px; line-height: 1.3;">${(empresa.bancoDetalle3 || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </div>
    `;
  } else if (activeBanco === "cuenta4" && empresa.bancoNombre4) {
    bancoHtml = `
    <div style="margin-top: 10px; font-size: 10px; border: 1px solid #000; padding: 6px; background-color: #f8fafc; page-break-inside: avoid;">
      <strong>Instrucciones de Pago / Transferencia Internacional (${empresa.bancoNombre4}):</strong><br/>
      <div style="white-space: pre-wrap; font-family: monospace; font-size: 9px; margin-top: 4px; line-height: 1.3;">${(empresa.bancoDetalle4 || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </div>
    `;
  }

  // Renderizar layout pre-impreso o completo
  if (isLibre) {
    return `
<div style="font-family: Arial, sans-serif; color: #000; background: white; padding: 25px 35px; box-sizing: border-box; width: 100%; min-height: 980px; height: auto; display: flex; flex-direction: column; justify-content: space-between;">
  
  <div style="flex: 1; display: flex; flex-direction: column;">
    <div style="height: 75px;"></div>

    <div style="display: flex; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; font-size: 10px; page-break-inside: avoid;">
      <div style="width: 58%; padding-right: 15px;">
        <div style="font-weight: bold; font-size: 9px; text-transform: uppercase; margin-bottom: 4px; color: #333;">ENTREGAR A / DATOS DEL CLIENTE</div>
        ${clienteDetalleHtml}
      </div>
      
      <div style="width: 42%; text-align: right; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="border: 2px solid #000; display: inline-block; padding: 4px 10px; font-weight: bold; font-size: 12px; margin-bottom: 4px; background: #e0f2fe; text-transform: uppercase;">
            ${isEs ? "NOTA DE ENTREGA" : "DELIVERY NOTE"}
          </div>
          <div style="font-size: 10px;">
            Nro / ID Despacho: <span style="font-family: monospace; font-weight: bold;">${des.id}</span>
          </div>
          <div style="font-size: 10px; margin-top: 1px;">
            ${isEs ? "Fecha Emisión" : "Issue Date"}: <strong>${new Date(des.fecha || des.createdAt!).toLocaleDateString()}</strong>
          </div>
          <div style="font-size: 10px; margin-top: 1px;">
            Orden Relacionada: <strong>${des.ordenClienteId}</strong>
          </div>
        </div>
      </div>
    </div>

    <div style="flex: 1;">
      ${itemsTableHtml}
    </div>
  </div>

  <div style="margin-top: 20px; page-break-inside: avoid;">
    ${mostrarPrecios ? `
      <div style="margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 2px solid #000;">
          <tfoot>
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td style="padding: 6px 8px; font-size: 11px;">VALOR TOTAL DE LA MERCANCÍA (${isBs ? "Bs." : "USD"}):</td>
              <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-size: 13px; color: #0369a1;">${currSymbol}${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    ` : ""}

    ${bancoHtml}
    
    <div style="display: flex; justify-content: space-around; margin-top: 50px; font-size: 10px; text-align: center;">
      <div style="width: 40%; border-top: 1px solid #000; padding-top: 4px; font-weight: bold;">
        ${empresa.nombre}<br/>
        <span style="font-size: 8px; font-weight: normal;">${isEs ? "Despachado Por" : "Dispatched By"}</span>
      </div>
      <div style="width: 40%; border-top: 1px solid #000; padding-top: 4px; font-weight: bold;">
        ${des.clienteNombre}<br/>
        <span style="font-size: 8px; font-weight: normal;">${isEs ? "Recibido Conforme Por" : "Received Confirm By"}</span>
      </div>
    </div>
  </div>

</div>
    `;
  }

  // Formato Completo (Con Encabezado)
  const logoHtml = empresa.logoUrl
    ? `<img src="${empresa.logoUrl}" style="max-height:60px; object-fit:contain;" />`
    : `<div style="width:60px;height:60px;border-radius:50%;border:4px solid #800020;display:flex;align-items:center;justify-content:center;color:#800020;font-weight:bold;font-size:24px;">UU</div>`;

  return `
<div style="font-family: Arial, sans-serif; color: #000; background: white; padding: 35px; box-sizing: border-box; width: 100%; min-height: 1000px; height: auto; display: flex; flex-direction: column; justify-content: space-between;">
  
  <div style="flex: 1; display: flex; flex-direction: column;">
    
    <!-- Header de Empresa -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; page-break-inside: avoid;">
      <div style="font-size: 11px; line-height: 1.4; width: 40%;">
        <div style="font-size: 15px; font-weight: bold; margin-bottom: 4px; color: #000;">${empresa.nombre}</div>
        <div><strong>RIF:</strong> ${empresa.rif || "N/A"}</div>
        <div>${empresa.direccion || "N/A"}</div>
        <div>${empresa.email ? empresa.email + " | " : ""}${empresa.telefono || ""}</div>
      </div>
      
      <div style="width: 20%; display: flex; justify-content: center;">
        ${logoHtml}
      </div>
      
      <div style="width: 40%; text-align: right;">
        <div style="border: 2px solid #000; display: inline-block; padding: 4px 10px; font-weight: bold; font-size: 13px; margin-bottom: 6px; background-color: #f3f4f6;">
          ${isEs ? "NOTA DE ENTREGA" : "DELIVERY NOTE"}
        </div>
        <div style="font-size: 11px;">
          Nro / ID: <span style="font-family: monospace; font-weight: bold;">${des.id}</span>
        </div>
        <div style="font-size: 11px; margin-top: 1px;">
          ${isEs ? "Fecha Emisión" : "Issue Date"}: <strong>${new Date(des.fecha || des.createdAt!).toLocaleDateString()}</strong>
        </div>
        <div style="font-size: 11px; margin-top: 1px;">
          Orden Relacionada: <strong>${des.ordenClienteId}</strong>
        </div>
      </div>
    </div>

    <!-- Info del Cliente -->
    <div style="border: 1px solid #000; padding: 10px; margin-bottom: 20px; font-size: 11px; border-radius: 6px; page-break-inside: avoid;">
      <div style="font-weight: bold; font-size: 9px; text-transform: uppercase; margin-bottom: 4px; color: #555;">${isEs ? "DATOS DEL CLIENTE / ENVÍO" : "CUSTOMER / SHIPPING DETAILS"}</div>
      ${clienteDetalleHtml}
    </div>

    <!-- Tabla -->
    <div style="flex: 1;">
      ${itemsTableHtml}
    </div>
  </div>

  <div style="margin-top: 20px; page-break-inside: avoid;">
    ${mostrarPrecios ? `
      <div style="margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 2px solid #000;">
          <tfoot>
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td style="padding: 6px 8px; font-size: 11px;">VALOR TOTAL DE LA MERCANCÍA (${isBs ? "Bs." : "USD"}):</td>
              <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-size: 13px; color: #0369a1;">${currSymbol}${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    ` : ""}

    ${bancoHtml}
    
    <div style="display: flex; justify-content: space-around; margin-top: 50px; font-size: 10px; text-align: center;">
      <div style="width: 40%; border-top: 1px solid #000; padding-top: 4px; font-weight: bold;">
        ${empresa.nombre}<br/>
        <span style="font-size: 8px; font-weight: normal;">${isEs ? "Despachado Por" : "Dispatched By"}</span>
      </div>
      <div style="width: 40%; border-top: 1px solid #000; padding-top: 4px; font-weight: bold;">
        ${des.clienteNombre}<br/>
        <span style="font-size: 8px; font-weight: normal;">${isEs ? "Recibido Conforme Por" : "Received Confirm By"}</span>
      </div>
    </div>
  </div>

</div>
  `;
}
