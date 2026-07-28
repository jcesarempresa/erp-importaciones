"use client";

import { useEffect, useRef } from "react";
import { RecepcionImportacion } from "@/types";
import { EmpresaConfig } from "@/lib/api/importaciones";
import { X, Printer, PackageCheck } from "lucide-react";

interface Props {
  recepcion: RecepcionImportacion;
  empresa: EmpresaConfig;
  onClose: () => void;
  language: string;
}

export default function PrintRecepcion({ recepcion, empresa, onClose, language }: Props) {
  const printRootRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    let el = document.getElementById("print-recepcion-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "print-recepcion-root";
      el.style.display = "none";
      document.body.appendChild(el);
    }
    printRootRef.current = el as HTMLDivElement;
    
    return () => {
      if (el) el.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    const el = document.getElementById("print-recepcion-root");
    if (!el) return;
    el.innerHTML = buildPrintHTML(recepcion, empresa, language);
  }, [recepcion, empresa, language]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-indigo-400" />
            {language === "es" ? "Comprobante de Recepción de Contenedor" : "Container Reception Voucher"} — {recepcion.contenedorId}
          </h2>

          <div className="flex items-center gap-3">
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
            dangerouslySetInnerHTML={{ __html: buildPrintHTML(recepcion, empresa, language) }}
          />
        </div>
      </div>
    </div>
  );
}

function buildPrintHTML(recepcion: RecepcionImportacion, empresa: EmpresaConfig, lang: string): string {
  const isEs = lang === "es";

  const logoHtml = empresa.logoUrl
    ? `<img src="${empresa.logoUrl}" style="max-height:60px; object-fit:contain;" />`
    : `<div style="width:60px;height:60px;border-radius:50%;border:4px solid #800020;display:flex;align-items:center;justify-content:center;color:#800020;font-weight:bold;font-size:24px;">UU</div>`;

  const totalUnidades = recepcion.itemsRecibidos.reduce((s, i) => s + (i.cantidadRecibida || 0), 0);

  return `
<div style="font-family: Arial, sans-serif; color: #000; background: white; padding: 35px; box-sizing: border-box; width: 100%; min-height: 1056px; display: flex; flex-direction: column; justify-content: space-between;">
  
  <div>
    <!-- Encabezado de la Empresa -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px;">
      <div style="font-size: 11px; line-height: 1.4; width: 45%;">
        <div style="font-size: 16px; font-weight: 900; margin-bottom: 4px; letter-spacing: 1px;">${empresa.nombre || "UNIDAD DE EQUIPOS ESPECIALES, LLC"}</div>
        <div>R.I.F/TaxID: ${empresa.rif || "N/A"}</div>
        <div>${empresa.direccion || "N/A"}</div>
        <div>${empresa.email ? empresa.email + " | " : ""}${empresa.telefono || ""}</div>
      </div>
      
      <div style="width: 15%; display: flex; justify-content: center;">
        ${logoHtml}
      </div>
      
      <div style="width: 40%; text-align: right;">
        <div style="border: 2px solid #000; display: inline-block; padding: 6px 12px; font-weight: bold; font-size: 13px; margin-bottom: 8px; background: #e0f2fe; text-transform: uppercase;">
          ${isEs ? "ACTA DE RECEPCIÓN DE CONTENEDOR" : "CONTAINER RECEPTION VOUCHER"}
        </div>
        <div style="font-size: 11px;">
          Contenedor / Guía: <span style="font-family: monospace; font-weight: bold;">${recepcion.contenedorId}</span>
        </div>
        <div style="font-size: 11px; margin-top: 2px;">
          Fecha Recepción: <strong>${new Date(recepcion.fecha || recepcion.createdAt!).toLocaleDateString()}</strong>
        </div>
        <div style="font-size: 11px; margin-top: 2px;">
          Pedido Proveedor: <span style="font-family: monospace; font-weight: bold;">${recepcion.pedidoProveedorId}</span>
        </div>
      </div>
    </div>

    <!-- Tabla 1: Mercancía e Ítems Recibidos -->
    <div style="margin-bottom: 25px;">
      <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; color: #1e3a8a; border-bottom: 1px solid #1e3a8a; padding-bottom: 3px;">
        1. Resumen de Mercancía Recibida en Contenedor
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #000;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 2px solid #000; font-weight: bold;">
            <th style="padding: 6px 8px; text-align: center; width: 40px;">#</th>
            <th style="padding: 6px 8px; text-align: left;">SKU / CÓDIGO PRODUCTO</th>
            <th style="padding: 6px 8px; text-align: right; width: 150px;">CANTIDAD RECIBIDA</th>
          </tr>
        </thead>
        <tbody>
          ${recepcion.itemsRecibidos.map((item, idx) => `
            <tr style="border-bottom: 1px solid #ddd; page-break-inside: avoid;">
              <td style="padding: 6px 8px; text-align: center; font-family: monospace;">${idx + 1}</td>
              <td style="padding: 6px 8px; font-family: monospace; font-weight: bold;">${item.sku}</td>
              <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; color: #047857;">+${item.cantidadRecibida} unids</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #000;">
            <td style="padding: 6px 8px;" colspan="2">TOTAL UNIDADES RECIBIDAS EN CONTENEDOR:</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-size: 13px; color: #047857;">${totalUnidades} unids</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Tabla 2: Desglose de Asignación / Distribución FIFO de Inventario -->
    <div style="margin-bottom: 25px;">
      <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; color: #6b21a8; border-bottom: 1px solid #6b21a8; padding-bottom: 3px;">
        2. Distribución de Inventario Conciliado (Asignación FIFO)
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #000;">
        <thead>
          <tr style="background-color: #faf5ff; border-bottom: 2px solid #000; font-weight: bold; color: #581c87;">
            <th style="padding: 6px 8px; text-align: center; width: 35px;">#</th>
            <th style="padding: 6px 8px; text-align: left;">DESTINO / CLIENTE</th>
            <th style="padding: 6px 8px; text-align: left; width: 120px;">ORDEN ASOCIADA</th>
            <th style="padding: 6px 8px; text-align: left; width: 130px;">SKU</th>
            <th style="padding: 6px 8px; text-align: right; width: 110px;">CANT. ASIGNADA</th>
          </tr>
        </thead>
        <tbody>
          ${recepcion.distribucion.map((dist, idx) => `
            <tr style="border-bottom: 1px solid #ddd; page-break-inside: avoid;">
              <td style="padding: 5px 8px; text-align: center; font-family: monospace;">${idx + 1}</td>
              <td style="padding: 5px 8px; font-weight: bold;">${dist.clienteNombre || "Inventario General"}</td>
              <td style="padding: 5px 8px; font-family: monospace;">${dist.ordenClienteId || "ALMACEN"}</td>
              <td style="padding: 5px 8px; font-family: monospace; font-weight: bold;">${dist.sku}</td>
              <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-weight: bold; color: #6b21a8;">+${dist.cantidadAsignada}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Pie de Firma y Certificación -->
  <div style="margin-top: 40px; page-break-inside: avoid;">
    <div style="display: flex; justify-content: space-around; text-align: center; font-size: 10px;">
      <div style="width: 40%; border-top: 1px solid #000; padding-top: 6px; font-weight: bold;">
        Responsable de Recepción (Almacén)
        <div style="font-size: 8px; font-weight: normal; margin-top: 2px;">Firma y Sello de Conforme</div>
      </div>
      <div style="width: 40%; border-top: 1px solid #000; padding-top: 6px; font-weight: bold;">
        Gerencia de Importaciones y Operaciones
        <div style="font-size: 8px; font-weight: normal; margin-top: 2px;">Firma y Verificación</div>
      </div>
    </div>
  </div>

</div>
  `;
}
