"use client";

import { useEffect, useRef } from "react";
import { Proveedor } from "@/types";
import { EmpresaConfig } from "@/lib/api/importaciones";
import { X, Printer } from "lucide-react";

interface Props {
  factura: any;
  empresa: EmpresaConfig;
  proveedores: Proveedor[];
  onClose: () => void;
  language: string;
}

export default function PrintFacturaProveedor({ factura, empresa, proveedores, onClose, language }: Props) {
  const printRootRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    let el = document.getElementById("print-factura-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "print-factura-root";
      el.style.display = "none";
      document.body.appendChild(el);
    }
    printRootRef.current = el as HTMLDivElement;
    
    return () => {
      if (el) el.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    const el = document.getElementById("print-factura-root");
    if (!el) return;
    el.innerHTML = buildPrintHTML(factura, empresa, proveedores, language);
  }, [factura, empresa, proveedores, language]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Printer className="w-4 h-4 text-indigo-400" />
            {language === "es" ? "Vista Previa de Factura Proveedor" : "Supplier Invoice Preview"} — {factura.facturaId || factura.id}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {language === "es" ? "Imprimir / Guardar PDF" : "Print / Save PDF"}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 flex justify-center overflow-x-auto">
          <div 
            className="bg-white text-black shadow-2xl" 
            style={{ width: "816px", minHeight: "1056px" }}
            dangerouslySetInnerHTML={{ __html: buildPrintHTML(factura, empresa, proveedores, language) }}
          />
        </div>
      </div>
    </div>
  );
}

function buildPrintHTML(factura: any, empresa: EmpresaConfig, proveedores: Proveedor[], lang: string): string {
  const isEs = lang === "es";
  const prov = proveedores.find(p => p.id === factura.proveedorId);
  
  const estadoStr = factura.estado?.toUpperCase() || (isEs ? "PENDIENTE" : "PENDING");

  const logoHtml = empresa.logoUrl
    ? `<img src="${empresa.logoUrl}" style="max-height:60px; object-fit:contain;" />`
    : `<div style="width:60px;height:60px;border-radius:50%;border:4px solid #800020;display:flex;align-items:center;justify-content:center;color:#800020;font-weight:bold;font-size:24px;">UU</div>`;

  const observacionesHtml = factura.observaciones ? `
  <div style="margin-top: 15px; font-size: 10px; border: 1px solid #000; padding: 6px;">
    <strong>${isEs ? "Observaciones / Notas:" : "Observations / Notes:"}</strong><br/>
    <div style="white-space: pre-wrap; margin-top: 4px;">${factura.observaciones.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>
  ` : '';

  const ordenesVinculadasStr = Array.isArray(factura.ordenesVinculadas) && factura.ordenesVinculadas.length > 0 
    ? factura.ordenesVinculadas.join(", ") 
    : (isEs ? "Ninguno" : "None");

  const subtotal = (Number(factura.total) || 0) - (Number(factura.flete) || 0) - (Number(factura.impuestos) || 0);

  return `
<div style="font-family: Arial, sans-serif; color: #000; background: white; padding: 40px; box-sizing: border-box; width: 100%; min-height: 100%;">
  
  <!-- Header -->
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
      <div style="border: 2px solid #000; display: inline-block; padding: 4px 10px; font-weight: bold; font-size: 14px; margin-bottom: 8px;">
        ${isEs ? "FACTURA DE PROVEEDOR" : "SUPPLIER INVOICE"}
      </div>
      <div style="font-size: 11px;">
        ID Sistema: <span style="font-family: monospace; font-weight: bold;">${factura.facturaId || factura.id}</span>
      </div>
      <div style="font-size: 11px; margin-top: 2px;">
        Factura Prov. Nro: <span style="font-weight: bold;">${factura.numeroFactura || "S/N"}</span>
      </div>
      <div style="font-size: 11px; margin-top: 2px;">
        ${isEs ? "Fecha Emisión" : "Issue Date"}: ${new Date(factura.fechaEmision || factura.createdAt).toLocaleDateString()}
      </div>
      <div style="font-size: 11px; margin-top: 2px;">
        ${isEs ? "Estado" : "Status"}: <span style="font-weight: bold;">${estadoStr}</span>
      </div>
    </div>
  </div>
  
  <!-- Info Grid -->
  <div style="display: flex; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; font-size: 11px;">
    <div style="width: 50%; padding-right: 20px;">
      <div style="font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 6px;">${isEs ? "Datos del Proveedor" : "Supplier Details"}</div>
      <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">${prov?.nombre || "N/A"}</div>
      <div>RIF / TaxID: ${prov?.rif || "N/A"}</div>
      <div>Email: ${prov?.email || "N/A"}</div>
      <div>Tlf: ${prov?.telefono || "N/A"}</div>
      <div>${isEs ? "Dirección" : "Address"}: ${prov?.direccion || "N/A"}</div>
    </div>
    <div style="width: 50%;">
      <div style="font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 6px;">${isEs ? "Información de Consolidación" : "Consolidation Info"}</div>
      <div>${isEs ? "Órdenes de Cliente Vinculadas" : "Linked Customer Orders"}: <span style="font-family: monospace;">${ordenesVinculadasStr}</span></div>
      <div style="margin-top: 8px; font-size: 9px; font-style: italic; color: #444;">
        * ${isEs ? "Documento de recepción para conciliación contable de CxP." : "Receipt document for AP accounting reconciliation."}
      </div>
    </div>
  </div>
  
  <!-- Financials -->
  <div style="margin-bottom: 30px;">
    <div style="font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 8px;">${isEs ? "Resumen Financiero" : "Financial Summary"}</div>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 2px solid #000;">
      <tbody>
        <tr style="border-bottom: 1px solid #ccc;">
          <td style="padding: 8px; font-weight: bold;">Subtotal</td>
          <td style="padding: 8px; text-align: right; font-family: monospace;">$${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ccc;">
          <td style="padding: 8px; font-weight: bold;">${isEs ? "Flete / Envío" : "Freight / Shipping"}</td>
          <td style="padding: 8px; text-align: right; font-family: monospace;">$${(Number(factura.flete) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ccc;">
          <td style="padding: 8px; font-weight: bold;">${isEs ? "Impuestos" : "Taxes"}</td>
          <td style="padding: 8px; text-align: right; font-family: monospace;">$${(Number(factura.impuestos) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr style="background-color: #f0f0f0; border-top: 2px solid #000; font-weight: bold;">
          <td style="padding: 8px;">GRAN TOTAL FACTURADO (USD):</td>
          <td style="padding: 8px; text-align: right; font-family: monospace; font-size: 14px;">$${(Number(factura.total) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
        <tr style="background-color: #fff; font-weight: bold; border-top: 1px solid #ccc;">
          <td style="padding: 8px; color: #d97706;">SALDO PENDIENTE (USD):</td>
          <td style="padding: 8px; text-align: right; font-family: monospace; font-size: 14px; color: #d97706;">$${(Number(factura.saldoPendiente) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
        <tr style="background-color: #fff; font-weight: bold; border-top: 1px solid #ccc;">
          <td style="padding: 8px; color: #059669;">MONTO ABONADO (USD):</td>
          <td style="padding: 8px; text-align: right; font-family: monospace; font-size: 14px; color: #059669;">$${(Number(factura.montoAbonado) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
      </tfoot>
    </table>
  </div>
  
  ${observacionesHtml}
  
</div>
  `;
}
