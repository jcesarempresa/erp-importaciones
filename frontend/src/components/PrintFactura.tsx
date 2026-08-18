"use client";

import { useState, useEffect, useRef } from "react";
import { Factura, Cliente } from "@/types";
import { EmpresaConfig } from "@/lib/api/importaciones";
import { X, Printer } from "lucide-react";

interface Props {
  factura: Factura;
  empresa: EmpresaConfig;
  clientes?: Cliente[];
  onClose: () => void;
  language: string;
}

export default function PrintFactura({ factura, empresa, clientes, onClose, language }: Props) {
  const [overrideBanco, setOverrideBanco] = useState<string>(factura.bancoSeleccionado || "");
  const printRootRef = useRef<HTMLDivElement>(null);
  const [formato, setFormato] = useState<"BS_LIBRE" | "BS" | "USD">("BS_LIBRE");

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    // Cuando cambia el formato, si la cuenta seleccionada no es compatible, la reseteamos
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

  useEffect(() => {
    let el = document.getElementById("print-factura-cliente-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "print-factura-cliente-root";
      el.style.display = "none";
      document.body.appendChild(el);
    }
    printRootRef.current = el as HTMLDivElement;
    
    return () => {
      if (el) el.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    const el = document.getElementById("print-factura-cliente-root");
    if (!el) return;
    el.innerHTML = buildPrintHTML(factura, empresa, language, formato, clientes, overrideBanco);
  }, [factura, empresa, language, formato, clientes, overrideBanco]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Printer className="w-4 h-4 text-indigo-400" />
              {language === "es" ? "Vista Previa de Factura" : "Invoice Preview"} — {factura.id}
            </h2>
            
            {/* Toggle Formato Bs / USD */}
            <div className="flex items-center bg-slate-955 p-1 rounded-xl border border-slate-800 ml-2">
              <button
                type="button"
                onClick={() => setFormato("BS_LIBRE")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  formato === "BS_LIBRE" 
                    ? "bg-indigo-600 text-white shadow-md" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {language === "es" ? "Papel Pre-impreso (Sin Encabezado - Bs)" : "Pre-printed Form (No Header - Bs)"}
              </button>
              <button
                type="button"
                onClick={() => setFormato("BS")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  formato === "BS" 
                    ? "bg-indigo-600 text-white shadow-md" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {language === "es" ? "Factura Completa (Bs SENIAT)" : "Full Fiscal Invoice (Bs SENIAT)"}
              </button>
              <button
                type="button"
                onClick={() => setFormato("USD")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  formato === "USD" 
                    ? "bg-indigo-600 text-white shadow-md" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {language === "es" ? "Factura Comercial ($ USD)" : "Commercial Invoice ($ USD)"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Bank Account Selector */}
            {(empresa.bancoNombre1 || empresa.bancoNombre2 || empresa.bancoNombre3 || empresa.bancoNombre4) && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {language === "es" ? "Cuenta:" : "Account:"}
                </span>
                <select
                  value={overrideBanco}
                  onChange={(e) => setOverrideBanco(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-350 text-xs px-2.5 py-1.5 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
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

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <Printer className="w-4 h-4" />
              {language === "es" ? "Imprimir / Guardar PDF" : "Print / Save PDF"}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-955/80 flex justify-center overflow-x-auto">
          <div 
            className="bg-white text-black shadow-2xl" 
            style={{ width: "816px", minHeight: "1056px" }}
            dangerouslySetInnerHTML={{ __html: buildPrintHTML(factura, empresa, language, formato, clientes, overrideBanco) }}
          />
        </div>
      </div>
    </div>
  );
}

function buildPrintHTML(factura: Factura, empresa: EmpresaConfig, lang: string, formato: "BS_LIBRE" | "BS" | "USD", clientes?: Cliente[], overrideBanco?: string): string {
  const isEs = lang === "es";
  const isBs = formato === "BS" || formato === "BS_LIBRE";
  const isLibre = formato === "BS_LIBRE";
  const tasa = Number(factura.tasaCambio) || 1;
  
  const estadoStr = factura.estado?.toUpperCase() || (isEs ? "PENDIENTE" : "PENDING");

  const cliente = clientes?.find(c => c.id === factura.clienteId || c.nombre === factura.clienteNombre);

  const logoHtml = empresa.logoUrl
    ? `<img src="${empresa.logoUrl}" style="max-height:60px; object-fit:contain;" />`
    : `<div style="width:60px;height:60px;border-radius:50%;border:4px solid #800020;display:flex;align-items:center;justify-content:center;color:#800020;font-weight:bold;font-size:24px;">UU</div>`;

  const notasVinculadasStr = Array.isArray(factura.notasEntregaIds) && factura.notasEntregaIds.length > 0 
    ? factura.notasEntregaIds.join(", ") 
    : (isEs ? "Ninguno" : "None");

  const subtotalUSD = Number(factura.subtotal) || 0;
  const fleteUSD = Number(factura.flete) || 0;
  const otrosGastosUSD = Number(factura.otrosGastos) || 0;
  const impuestosUSD = Number(factura.impuestos) || 0;
  const totalFacturaUSD = Number(factura.totalFactura) || 0;

  // Valores adaptados a la moneda del formato
  const subtotal = isBs ? subtotalUSD * tasa : subtotalUSD;
  const flete = isBs ? fleteUSD * tasa : fleteUSD;
  const otrosGastos = isBs ? otrosGastosUSD * tasa : otrosGastosUSD;
  const impuestos = isBs ? impuestosUSD * tasa : impuestosUSD;
  const totalFactura = isBs ? (factura.totalBs || totalFacturaUSD * tasa) : totalFacturaUSD;

  const currSymbol = isBs ? "Bs. " : "$";
  const currLabel = isBs ? " (Bs.)" : " (USD)";

  const observacionesHtml = factura.observaciones ? `
  <div style="margin-top: 15px; font-size: 10px; border: 1px solid #000; padding: 6px; page-break-inside: avoid;">
    <strong>Observaciones Generales / Condiciones:</strong><br/>
    <div style="white-space: pre-wrap; margin-top: 4px; line-height: 1.3;">${factura.observaciones.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>
  ` : '';

  let bancoHtml = "";
  let activeBanco = overrideBanco || factura.bancoSeleccionado || "";
  if (formato === "USD") {
    if (activeBanco !== "cuenta3" && activeBanco !== "cuenta4") {
      activeBanco = "";
    }
  } else {
    if (activeBanco !== "cuenta1" && activeBanco !== "cuenta2") {
      activeBanco = "";
    }
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

  const itemsTableHtml = Array.isArray(factura.items) && factura.items.length > 0 ? `
  <div style="margin-bottom: 25px;">
    <div style="font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 8px;">${isEs ? "Detalle de Productos / Ítems" : "Product / Item Details"} ${currLabel}</div>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #000;">
      <thead>
        <tr style="background-color: #f0f0f0; border-bottom: 2px solid #000; font-weight: bold;">
          <th style="padding: 6px; text-align: center; width: 35px;">#</th>
          <th style="padding: 6px; text-align: left; width: 90px;">SKU</th>
          <th style="padding: 6px; text-align: left;">DESCRIPCIÓN</th>
          <th style="padding: 6px; text-align: center; width: 60px;">CANT</th>
          <th style="padding: 6px; text-align: right; width: 110px;">PRECIO U. (${isBs ? "Bs" : "$"})</th>
          <th style="padding: 6px; text-align: right; width: 120px;">SUBTOTAL (${isBs ? "Bs" : "$"})</th>
        </tr>
      </thead>
      <tbody>
        ${factura.items.map((item, idx) => {
          const pUnit = isBs ? (item.precioUnitario || 0) * tasa : (item.precioUnitario || 0);
          const itemSub = isBs ? (item.cantidad || 0) * (item.precioUnitario || 0) * tasa : (item.cantidad || 0) * (item.precioUnitario || 0);
          return `
          <tr style="border-bottom: 1px solid #ddd; page-break-inside: avoid;">
            <td style="padding: 6px; text-align: center; font-family: monospace;">${idx + 1}</td>
            <td style="padding: 6px; font-family: monospace; font-weight: bold;">${item.sku}</td>
            <td style="padding: 6px;">${item.descripcion || "N/A"}</td>
            <td style="padding: 6px; text-align: center; font-family: monospace;">${item.cantidad}</td>
            <td style="padding: 6px; text-align: right; font-family: monospace;">${currSymbol}${pUnit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td style="padding: 6px; text-align: right; font-family: monospace; font-weight: bold;">${currSymbol}${itemSub.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          </tr>
        `;
        }).join("")}
      </tbody>
    </table>
  </div>
  ` : "";

  // HTML del Cliente detallado (compacto)
  const clienteDetalleHtml = `
    <div style="font-weight: bold; font-size: 12px; margin-bottom: 2px;">${factura.clienteNombre || "N/A"} ${cliente?.rif ? `<span style="font-size: 10px; font-weight: normal; margin-left: 6px;">| <strong>RIF/CI:</strong> ${cliente.rif}</span>` : ""}</div>
    ${cliente?.direccion ? `<div style="font-size: 10px; line-height: 1.2;"><strong>Dirección Fiscal:</strong> ${cliente.direccion}</div>` : ""}
    <div style="font-size: 10px; line-height: 1.2; margin-top: 1px;">
      ${cliente?.telefono ? `<span><strong>Teléfono:</strong> ${cliente.telefono}</span>` : ""}
      ${cliente?.email ? `<span style="margin-left: 8px;"><strong>Email:</strong> ${cliente.email}</span>` : ""}
    </div>
    ${cliente?.direccionDespacho && cliente.direccionDespacho !== cliente?.direccion ? `<div style="font-size: 10px; line-height: 1.2; margin-top: 1px;"><strong>Dirección Despacho:</strong> ${cliente.direccionDespacho}</div>` : ""}
  `;

  if (isLibre) {
    return `
<div style="font-family: Arial, sans-serif; color: #000; background: white; padding: 25px 35px; box-sizing: border-box; width: 100%; min-height: 980px; height: auto; display: flex; flex-direction: column; justify-content: space-between;">
  
  <!-- Parte Superior / Central -->
  <div style="flex: 1; display: flex; flex-direction: column;">
    <!-- Espacio Libre Superior (Para encabezado impreso de la imprenta) -->
    <div style="height: 75px;"></div>

    <!-- Info Grid Unificada (Cliente + Cuadro de Factura) -->
    <div style="display: flex; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; font-size: 10px; page-break-inside: avoid;">
      <div style="width: 58%; padding-right: 15px;">
        <div style="font-weight: bold; font-size: 9px; text-transform: uppercase; margin-bottom: 4px; color: #333;">FACTURADO A / DATOS DEL CLIENTE</div>
        ${clienteDetalleHtml}
      </div>
      
      <div style="width: 42%; text-align: right; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="border: 2px solid #000; display: inline-block; padding: 4px 10px; font-weight: bold; font-size: 12px; margin-bottom: 4px; background: #fef3c7; text-transform: uppercase;">
            ${isEs ? "FACTURA FISCAL" : "FISCAL INVOICE"}
          </div>
          <div style="font-size: 10px;">
            Nro / ID Factura: <span style="font-family: monospace; font-weight: bold;">${factura.id}</span>
          </div>
          <div style="font-size: 10px; margin-top: 1px;">
            ${isEs ? "Fecha Emisión" : "Issue Date"}: <strong>${new Date(factura.fecha || factura.createdAt!).toLocaleDateString()}</strong>
          </div>
          <div style="font-size: 10px; margin-top: 1px;">
            ${isEs ? "Estado" : "Status"}: <strong>${estadoStr}</strong>
          </div>
        </div>
        <div style="font-size: 9px; margin-top: 6px;">
          <strong>Despachos Vinculados:</strong> <span style="font-family: monospace;">${notasVinculadasStr}</span>
        </div>
      </div>
    </div>

    <!-- Tabla de Ítems en el Centro -->
    <div style="flex: 1;">
      ${itemsTableHtml}
    </div>
  </div>

  <!-- Parte Inferior: Resumen Financiero y Firma Anclados al Pie -->
  <div style="margin-top: 20px; page-break-inside: avoid;">
    <!-- Financials -->
    <div style="margin-bottom: 20px;">
      <div style="font-weight: bold; font-size: 9px; text-transform: uppercase; margin-bottom: 6px;">${isEs ? "Resumen Financiero Consolidado" : "Consolidated Financial Summary"} ${currLabel}</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 2px solid #000;">
        <tbody>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 5px 8px; font-weight: bold;">Subtotal Consolidado de Mercancía</td>
            <td style="padding: 5px 8px; text-align: right; font-family: monospace;">${currSymbol}${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 5px 8px; font-weight: bold;">${isEs ? "Flete Adicional" : "Additional Freight"}</td>
            <td style="padding: 5px 8px; text-align: right; font-family: monospace;">${currSymbol}${flete.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 5px 8px; font-weight: bold;">${isEs ? "Otros Gastos" : "Other Expenses"}</td>
            <td style="padding: 5px 8px; text-align: right; font-family: monospace;">${currSymbol}${otrosGastos.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 5px 8px; font-weight: bold;">${isEs ? "Impuestos (IVA 16%)" : "Taxes (IVA 16%)"}</td>
            <td style="padding: 5px 8px; text-align: right; font-family: monospace;">${currSymbol}${impuestos.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background-color: #e0f2fe; border-top: 2px solid #000; font-weight: bold;">
            <td style="padding: 6px 8px; font-size: 11px;">TOTAL FACTURA FISCAL (Bs.):</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-size: 13px; color: #0369a1;">${currSymbol}${totalFactura.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    ${observacionesHtml}
    ${bancoHtml}
    
    <!-- Firma -->
    <div style="text-align: center; font-size: 10px; padding-top: 10px;">
      <div style="display: inline-block; width: 35%; border-top: 1px solid #000; padding-top: 4px; font-weight: bold;">
        ${empresa.nombre}
        <div style="font-size: 8px; font-weight: normal; margin-top: 1px;">${isEs ? "Firma y Sello Autorizado" : "Authorized Signature"}</div>
      </div>
    </div>
  </div>

</div>
    `;
  }

  const headerHtml = `
  <!-- Header Completo con Logo -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px;">
    <div style="font-size: 11px; line-height: 1.4; width: 40%;">
      <div style="font-size: 16px; font-weight: 900; margin-bottom: 4px; letter-spacing: 1px;">${empresa.nombre || "UNIDAD DE EQUIPOS ESPECIALES, LLC"}</div>
      <div>R.I.F/TaxID: ${empresa.rif || "N/A"}</div>
      <div>${empresa.direccion || "N/A"}</div>
      <div>${empresa.email ? empresa.email + " | " : ""}${empresa.telefono || ""}</div>
    </div>
    
    <div style="width: 20%; display: flex; justify-content: center;">
      ${logoHtml}
    </div>
    
    <div style="width: 40%; text-align: right;">
      <div style="border: 2px solid #000; display: inline-block; padding: 4px 10px; font-weight: bold; font-size: 14px; margin-bottom: 8px; background: ${isBs ? '#fef3c7' : '#ffffff'}; text-transform: uppercase;">
        ${isBs ? (isEs ? "FACTURA FISCAL (SENIAT)" : "SENIAT FISCAL INVOICE") : (isEs ? "FACTURA COMERCIAL" : "COMMERCIAL INVOICE")}
      </div>
      <div style="font-size: 11px;">
        ID Sistema: <span style="font-family: monospace; font-weight: bold;">${factura.id}</span>
      </div>
      <div style="font-size: 11px; margin-top: 2px;">
        ${isEs ? "Fecha Emisión" : "Issue Date"}: ${new Date(factura.fecha || factura.createdAt!).toLocaleDateString()}
      </div>
      <div style="font-size: 11px; margin-top: 2px;">
        ${isEs ? "Estado" : "Status"}: <span style="font-weight: bold;">${estadoStr}</span>
      </div>
    </div>
  </div>
  `;

  return `
<div style="font-family: Arial, sans-serif; color: #000; background: white; padding: 40px; box-sizing: border-box; width: 100%; min-height: 100%;">
  
  ${headerHtml}
  
  <!-- Info Grid -->
  <div style="display: flex; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; font-size: 11px;">
    <div style="width: 50%; padding-right: 20px;">
      <div style="font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 6px;">${isEs ? "Facturado A / Cliente" : "Billed To / Customer"}</div>
      ${clienteDetalleHtml}
    </div>
    <div style="width: 50%;">
      <div style="font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 6px;">${isEs ? "Notas de Entrega (Despachos)" : "Delivery Notes (Shipments)"}</div>
      <div>${isEs ? "Despachos Vinculados" : "Linked Shipments"}: <span style="font-family: monospace;">${notasVinculadasStr}</span></div>
      <div style="margin-top: 8px; font-size: 9px; font-style: italic; color: #444;">
        * ${isEs ? "La mercancía de estos despachos ha sido consolidada." : "The merchandise from these shipments has been consolidated."}
      </div>
    </div>
  </div>
  
  ${itemsTableHtml}

  <!-- Financials -->
  <div style="margin-bottom: 30px;">
    <div style="font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 8px;">${isEs ? "Resumen Financiero Consolidado" : "Consolidated Financial Summary"} ${currLabel}</div>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 2px solid #000;">
      <tbody>
        <tr style="border-bottom: 1px solid #ccc;">
          <td style="padding: 8px; font-weight: bold;">Subtotal Consolidado de Mercancía</td>
          <td style="padding: 8px; text-align: right; font-family: monospace;">${currSymbol}${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ccc;">
          <td style="padding: 8px; font-weight: bold;">${isEs ? "Flete Adicional" : "Additional Freight"}</td>
          <td style="padding: 8px; text-align: right; font-family: monospace;">${currSymbol}${flete.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ccc;">
          <td style="padding: 8px; font-weight: bold;">${isEs ? "Otros Gastos" : "Other Expenses"}</td>
          <td style="padding: 8px; text-align: right; font-family: monospace;">${currSymbol}${otrosGastos.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ccc;">
          <td style="padding: 8px; font-weight: bold;">${isEs ? "Impuestos (IVA 16%)" : "Taxes (IVA 16%)"}</td>
          <td style="padding: 8px; text-align: right; font-family: monospace;">${currSymbol}${impuestos.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr style="background-color: ${isBs ? '#e0f2fe' : '#f0f0f0'}; border-top: 2px solid #000; font-weight: bold;">
          <td style="padding: 8px; font-size: 12px;">${isBs ? "TOTAL FACTURA FISCAL (Bs.):" : "TOTAL FACTURA (USD):"}</td>
          <td style="padding: 8px; text-align: right; font-family: monospace; font-size: 14px; color: ${isBs ? '#0369a1' : '#000000'};">${currSymbol}${totalFactura.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
        ${isBs ? `` : `
        <tr style="background-color: #fff; font-weight: bold; border-top: 2px solid #000;">
          <td style="padding: 8px; color: #1e3a8a;">TASA DE CAMBIO (Bs/USD):</td>
          <td style="padding: 8px; text-align: right; font-family: monospace; font-size: 12px; color: #1e3a8a;">Bs. ${tasa.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
        <tr style="background-color: #e0f2fe; font-weight: bold; border-top: 1px solid #ccc;">
          <td style="padding: 8px; color: #0369a1;">TOTAL FACTURA EQUIVALENTE EN Bs:</td>
          <td style="padding: 8px; text-align: right; font-family: monospace; font-size: 14px; color: #0369a1;">Bs. ${(totalFacturaUSD * tasa).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
        `}
      </tfoot>
    </table>
  </div>

  ${observacionesHtml}
  ${bancoHtml}
  
  <div style="margin-top: 50px; text-align: center; font-size: 11px;">
    <div style="display: inline-block; width: 40%; border-top: 1px solid #000; padding-top: 6px; font-weight: bold;">
      ${empresa.nombre}
      <div style="font-size: 9px; font-weight: normal; margin-top: 2px;">${isEs ? "Firma y Sello Autorizado" : "Authorized Signature"}</div>
    </div>
  </div>
  
</div>
  `;
}
