"use client";

import { useEffect, useRef } from "react";
import { OrdenCliente, Cliente } from "@/types";
import { EmpresaConfig } from "@/lib/api/importaciones";
import { X, Printer } from "lucide-react";

interface Props {
  orden: OrdenCliente;
  empresa: EmpresaConfig;
  onClose: () => void;
  language: string;
  clientes?: Cliente[];
}

export default function PrintOrdenCliente({ orden, empresa, onClose, language, clientes = [] }: Props) {
  const printRootRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    let el = document.getElementById("print-orden-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "print-orden-root";
      el.style.display = "none";
      document.body.appendChild(el);
    }
    printRootRef.current = el as HTMLDivElement;
    
    return () => {
      if (el) el.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    const el = document.getElementById("print-orden-root");
    if (!el) return;
    el.innerHTML = buildPrintHTML(orden, empresa, language, clientes);
  }, [orden, empresa, language, clientes]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Printer className="w-4 h-4 text-indigo-400" />
            {language === "es" ? "Vista Previa de Orden de Cliente" : "Customer Order Preview"} — {orden.id}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
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
            dangerouslySetInnerHTML={{ __html: buildPrintHTML(orden, empresa, language, clientes) }}
          />
        </div>
      </div>
    </div>
  );
}

function buildPrintHTML(orden: OrdenCliente, empresa: EmpresaConfig, lang: string, clientes: Cliente[]): string {
  const isEs = lang === "es";
  const fmtMoney = (n: number) => n.toLocaleString("es-VE", { minimumFractionDigits: 2 });
  
  const cliente = clientes.find(c => c.id === orden.clienteId);
  const fallbackAddress = cliente?.direccion || "N/A";
  
  let itemsHtml = "";
  for (let i = 0; i < orden.items.length; i++) {
    const item = orden.items[i];
    itemsHtml += `
      <tr style="height: 24px; border-bottom: 1px solid #ccc;">
        <td style="border-right: 1px solid #000; padding: 4px 6px; text-align: center;">${i + 1}</td>
        <td style="border-right: 1px solid #000; padding: 4px 6px; text-align: center;">${item.sku}</td>
        <td style="border-right: 1px solid #000; padding: 4px 6px; vertical-align: top;">
          <div style="font-weight: bold;">${item.descripcion}</div>
          ${item.detalles ? `<div style="font-size: 9px; margin-top: 4px; white-space: pre-wrap; font-weight: normal; color: #333;">${item.detalles}</div>` : ''}
        </td>
        <td style="border-right: 1px solid #000; padding: 4px 6px; text-align: center;">${item.cantidadPedida}</td>
        <td style="border-right: 1px solid #000; padding: 4px 6px; text-align: right;">$${fmtMoney(item.precioUnitario)}</td>
        <td style="padding: 4px 6px; text-align: right; font-weight: bold;">$${fmtMoney(item.cantidadPedida * item.precioUnitario)}</td>
      </tr>
    `;
    
    if (item.proveedores && item.proveedores.length > 0) {
      itemsHtml += `
      <tr style="border-bottom: 1px solid #000;">
        <td style="border-right: 1px solid #000;"></td>
        <td colspan="5" style="padding: 4px 6px; padding-left: 20px; font-size: 10px; color: #444; background: #f9f9f9;">
          <div style="font-weight: bold; margin-bottom: 2px;">Assigned Suppliers:</div>
      `;
      item.proveedores.forEach(p => {
        itemsHtml += `
          <div style="display: flex; gap: 10px; margin-bottom: 1px;">
            <span>&#x21B3; ${p.proveedorNombre}</span>
            <span>(Qty: ${p.cantidad})</span>
          </div>
        `;
      });
      itemsHtml += `
        </td>
      </tr>
      `;
    }
  }

  const logoHtml = empresa.logoUrl
    ? `<img src="${empresa.logoUrl}" style="max-height:60px; object-fit:contain;" />`
    : `<div style="width:60px;height:60px;border-radius:50%;border:4px solid #800020;display:flex;align-items:center;justify-content:center;color:#800020;font-weight:bold;font-size:24px;">UU</div>`;

  
  const observacionesHtml = orden.observaciones ? `
  <div style="margin-top: 15px; font-size: 10px; border: 1px solid #000; padding: 6px;">
    <strong>Observaciones Generales / Notas Importantes:</strong><br/>
    <div style="white-space: pre-wrap; margin-top: 4px;">${orden.observaciones.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>
  ` : '';
  return `
<div style="font-family: Arial, sans-serif; color: #000; background: white; padding: 40px; box-sizing: border-box; width: 100%; min-height: 100%;">
  
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
    <div style="font-size: 11px; line-height: 1.4; font-weight: bold; width: 45%;">
      <div style="font-size: 14px; margin-bottom: 4px;">${empresa.nombre || "UNIDAD DE EQUIPOS ESPECIALES, LLC"}</div>
      ${empresa.rif ? `<div>RIF: ${empresa.rif}</div>` : ""}
      <div>${empresa.direccion || ""}</div>
      ${empresa.telefono ? `<div>PH: ${empresa.telefono}</div>` : ""}
      ${empresa.email ? `<div>${empresa.email}</div>` : ""}
    </div>
    
    <div style="width: 20%; display: flex; justify-content: center;">
      ${logoHtml}
    </div>
    
    <div style="width: 40%; text-align: right;">
      <h1 style="font-size: 26px; font-weight: bold; margin: 0; padding: 0; color: #000;">Customer Order</h1>
      <div style="font-size: 12px; font-weight: bold; margin-top: 4px; color: #555;">Order Tracking Document</div>
    </div>
  </div>
  
  <div style="height: 4px; background-color: #000; width: 100%; margin-bottom: 10px;"></div>
  
  <div style="border: 1px solid #000; display: flex; margin-bottom: 15px; font-size: 10px;">
    <div style="width: 50%; padding: 4px 8px; border-right: 1px solid #000;">
      <div style="font-weight: bold; margin-bottom: 4px;">Customer Info:</div>
      <div style="font-weight: bold;">${orden.clienteNombre}</div>
      <div>${fallbackAddress}</div>
    </div>
    <div style="width: 50%; padding: 4px 8px;">
      <div style="font-weight: bold; margin-bottom: 4px;">Cargo Supervisor:</div>
      <div style="font-weight: bold;">${orden.responsableNombre || "N/A"}</div>
    </div>
  </div>
  
  <div style="border: 3px double #000; margin-bottom: 15px; font-size: 10px;">
    <table style="width: 100%; border-collapse: collapse; text-align: center;">
      <tr>
        <td style="width: 25%; border-right: 1px solid #000; padding: 4px;">
          <div style="font-weight: bold;">Order No.</div>
          <div style="height: 14px;">${orden.id}</div>
        </td>
        <td style="width: 25%; border-right: 1px solid #000; padding: 4px;">
          <div style="font-weight: bold;">Order Date</div>
          <div style="height: 14px;">${new Date(orden.fecha).toLocaleDateString("en-US")}</div>
        </td>
        <td style="width: 25%; border-right: 1px solid #000; padding: 4px;">
          <div style="font-weight: bold;">Status</div>
          <div style="height: 14px;">${orden.estado.toUpperCase()}</div>
        </td>
        <td style="width: 25%; padding: 4px;">
          <div style="font-weight: bold;">Source Quote</div>
          <div style="height: 14px;">${orden.cotizacionId || "Direct Order"}</div>
        </td>
      </tr>
    </table>
  </div>
  
  <div style="border-left: 3px double #000; border-right: 3px double #000; border-top: 3px double #000; border-bottom: 3px double #000; font-size: 10px;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 3px double #000; font-weight: bold; background: #eee;">
          <th style="border-right: 1px solid #000; padding: 4px; width: 5%;">Item</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 15%;">Código</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 40%;">Description</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 10%;">Total Qty</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 15%;">Unit Price</th>
          <th style="padding: 4px; width: 15%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr style="border-top: 3px double #000; height: 26px;">
          <td colspan="4" style="border-right: 1px solid #000;"></td>
          <td style="border-right: 1px solid #000; padding: 4px 6px; font-weight: bold; text-align: right; font-size: 12px;">Grand Total</td>
          <td style="padding: 4px 6px; text-align: right; font-weight: bold; font-size: 12px;">$${fmtMoney(orden.montoTotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <div style="margin-top: 15px; font-size: 9px; border-top: 1px solid #000; padding-top: 5px;">
    <div style="font-weight: bold; text-align: center;">
      This document is generated by the internal system. Supplier assignments are strictly for internal logistics.
    </div>
  </div>

</div>
  `;
}
