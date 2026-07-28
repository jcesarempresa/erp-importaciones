"use client";

import { useEffect, useRef } from "react";
import { PedidoProveedor, Proveedor, Producto } from "@/types";
import { EmpresaConfig } from "@/lib/api/importaciones";
import { X, Printer } from "lucide-react";

interface Props {
  pedido: PedidoProveedor;
  empresa: EmpresaConfig;
  proveedores: Proveedor[];
  productos: Producto[];
  onClose: () => void;
  language: string;
}

export default function PrintPedidoProveedor({ pedido, empresa, proveedores, productos, onClose, language }: Props) {
  const printRootRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    let el = document.getElementById("print-pedido-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "print-pedido-root";
      el.style.display = "none";
      document.body.appendChild(el);
    }
    printRootRef.current = el as HTMLDivElement;
    
    return () => {
      if (el) el.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    const el = document.getElementById("print-pedido-root");
    if (!el) return;
    el.innerHTML = buildPrintHTML(pedido, empresa, proveedores, productos, language);
  }, [pedido, empresa, proveedores, productos, language]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Printer className="w-4 h-4 text-indigo-400" />
            {language === "es" ? "Vista Previa de Pedido a Fábrica" : "Factory Order Preview"} — {pedido.id}
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
            dangerouslySetInnerHTML={{ __html: buildPrintHTML(pedido, empresa, proveedores, productos, language) }}
          />
        </div>
      </div>
    </div>
  );
}

function buildPrintHTML(pedido: PedidoProveedor, empresa: EmpresaConfig, proveedores: Proveedor[], productos: Producto[], lang: string): string {
  const isEs = lang === "es";
  
  const prov = proveedores.find(p => p.id === pedido.proveedorId);
  
  let itemsHtml = "";
  let granTotal = 0;
  for (let i = 0; i < pedido.items.length; i++) {
    const item = pedido.items[i];
    
    const prodRef = productos.find(p => p.sku === item.sku);
    const resolvedDesc = prodRef?.descripcion || item.descripcion || "N/A";
    
    const costoUnit = item.costoUnitario || 0;
    const lineTotal = item.cantidadPedida * costoUnit;
    granTotal += lineTotal;
    
    itemsHtml += `
      <tr style="height: 28px; border-bottom: 1px solid #ccc;">
        <td style="border-right: 1px solid #000; padding: 6px; font-weight: bold; font-family: monospace;">${item.sku}</td>
        <td style="border-right: 1px solid #000; padding: 6px; vertical-align: top;">
          <div style="font-weight: bold;">${resolvedDesc}</div>
          ${item.detalles ? `<div style="font-size: 9px; margin-top: 4px; white-space: pre-wrap; font-weight: normal; color: #333;">${item.detalles}</div>` : ''}
        </td>
        <td style="border-right: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">${item.cantidadPedida}</td>
        <td style="border-right: 1px solid #000; padding: 6px; text-align: right; font-family: monospace;">$${costoUnit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="padding: 6px; text-align: right; font-family: monospace; font-weight: bold;">$${lineTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
    `;
  }

  const estadoStr = pedido.estado === "pendiente" ? (isEs ? "PENDIENTE" : "PENDING") :
                    pedido.estado === "formalizado" ? (isEs ? "FORMALIZADO" : "FORMALIZED") :
                    pedido.estado === "parcial" ? (isEs ? "PARCIAL" : "PARTIAL") :
                    pedido.estado === "recibido" ? (isEs ? "RECIBIDO" : "RECEIVED") :
                    (isEs ? "ANULADO" : "VOIDED");

  const logoHtml = empresa.logoUrl
    ? `<img src="${empresa.logoUrl}" style="max-height:60px; object-fit:contain;" />`
    : `<div style="width:60px;height:60px;border-radius:50%;border:4px solid #800020;display:flex;align-items:center;justify-content:center;color:#800020;font-weight:bold;font-size:24px;">UU</div>`;

  
  const observacionesHtml = pedido.observaciones ? `
  <div style="margin-top: 15px; font-size: 10px; border: 1px solid #000; padding: 6px;">
    <strong>Observaciones Generales / Notas Importantes:</strong><br/>
    <div style="white-space: pre-wrap; margin-top: 4px;">${pedido.observaciones.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>
  ` : '';
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
        ${isEs ? "ORDEN DE COMPRA" : "PURCHASE ORDER"}: ${pedido.id}
      </div>
      <div style="font-size: 11px;">
        ${isEs ? "Fecha Emisión" : "Issue Date"}: ${new Date(pedido.fecha).toLocaleDateString()}
      </div>
      <div style="font-size: 11px; margin-top: 2px;">
        ${isEs ? "Estado" : "Status"}: <span style="font-weight: bold;">${estadoStr}</span>
      </div>
    </div>
  </div>
  
  <!-- Info Grid -->
  <div style="display: flex; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; font-size: 11px;">
    <div style="width: 50%; padding-right: 20px;">
      <div style="font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 6px;">${isEs ? "Proveedor / Fábrica" : "Supplier / Factory"}</div>
      <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">${pedido.proveedorNombre}</div>
      <div>RIF / TaxID: ${prov?.rif || "N/A"}</div>
      <div>Email: ${prov?.email || "N/A"}</div>
      <div>Tlf: ${prov?.telefono || "N/A"}</div>
      <div>${isEs ? "Dirección" : "Address"}: ${prov?.direccion || "N/A"}</div>
    </div>
    <div style="width: 50%;">
      <div style="font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 6px;">${isEs ? "Responsable Autorizado" : "Authorized Supervisor"}</div>
      <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">${pedido.responsableNombre || (isEs ? "No Asignado" : "Not Assigned")}</div>
      <div>${isEs ? "Moneda de Transacción: USD ($)" : "Transaction Currency: USD ($)"}</div>
      <div style="margin-top: 8px; font-size: 9px; font-style: italic; color: #444;">
        * ${isEs ? "Este documento consolida de manera formal la demanda de importación." : "This document formally consolidates the import demand."}
      </div>
    </div>
  </div>
  
  <!-- Items Table -->
  <div style="margin-bottom: 30px;">
    <div style="font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 8px;">${isEs ? "Detalle de Mercancía Solicitada" : "Requested Merchandise Details"}</div>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 2px solid #000;">
      <thead>
        <tr style="background-color: #f0f0f0; border-bottom: 2px solid #000;">
          <th style="padding: 8px; border-right: 1px solid #000; text-align: left; width: 15%;">${isEs ? "Código" : "Code"}</th>
          <th style="padding: 8px; border-right: 1px solid #000; text-align: left; width: 45%;">${isEs ? "Descripción" : "Description"}</th>
          <th style="padding: 8px; border-right: 1px solid #000; text-align: center; width: 10%;">${isEs ? "Cant." : "Qty."}</th>
          <th style="padding: 8px; border-right: 1px solid #000; text-align: right; width: 15%;">${isEs ? "Precio Unit." : "Unit Price"}</th>
          <th style="padding: 8px; text-align: right; width: 15%;">${isEs ? "Total" : "Total"}</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr style="background-color: #f0f0f0; border-top: 2px solid #000; font-weight: bold;">
          <td colspan="4" style="padding: 8px; text-align: right; border-right: 1px solid #000;">GRAN TOTAL (USD):</td>
          <td style="padding: 8px; text-align: right; font-family: monospace;">$${granTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
      </tfoot>
    </table>
  </div>
  
  <!-- Signatures -->
  <div style="display: flex; justify-content: space-around; margin-top: 60px; font-size: 11px; text-align: center;">
    <div style="width: 35%;">
      <div style="border-top: 1px solid #000; padding-top: 6px;">
        <div style="font-weight: bold;">${pedido.responsableNombre || (isEs ? "Responsable Carga" : "Cargo Supervisor")}</div>
        <div style="font-size: 9px; margin-top: 2px;">${isEs ? "Autorizado Por" : "Authorized By"}</div>
      </div>
    </div>
    <div style="width: 35%;">
      <div style="border-top: 1px solid #000; padding-top: 6px;">
        <div style="font-weight: bold;">${pedido.proveedorNombre}</div>
        <div style="font-size: 9px; margin-top: 2px;">${isEs ? "Recibido y Aceptado por Fábrica" : "Received and Accepted by Factory"}</div>
      </div>
    </div>
  </div>

</div>
  `;
}
