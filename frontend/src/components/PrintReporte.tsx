"use client";

import { useEffect } from "react";
import { X, Printer } from "lucide-react";
import { EmpresaConfig } from "@/lib/api/importaciones";

export interface ReporteColumna {
  label: string;
  align?: "left" | "right" | "center";
}

export interface PrintReporteProps {
  titulo: string;
  subtitulo?: string;
  columnas: ReporteColumna[];
  filas: (string | number)[][];
  empresa?: EmpresaConfig;
  onClose: () => void;
  language: string;
}

function formatDateCell(val: string | number): string | number {
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("es-DO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
    } catch {
      // fallback
    }
  }
  return val;
}

function buildHTML(
  titulo: string,
  subtitulo: string | undefined,
  columnas: ReporteColumna[],
  filas: (string | number)[][],
  empresa: EmpresaConfig | undefined,
  language: string
): string {
  const isEs = language === "es";

  const fechaHora = new Date().toLocaleDateString(isEs ? "es-DO" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const empNombre = empresa?.nombre || "UNIDAD DE EQUIPOS ESPECIALES, LLC";
  const empRif = empresa?.rif ? `RIF / Tax ID: ${empresa.rif}` : "";
  const empDir = empresa?.direccion || "";
  const empTel = empresa?.telefono ? `Tel: ${empresa.telefono}` : "";
  const empEmail = empresa?.email ? `Email: ${empresa.email}` : "";

  const logoHtml = empresa?.logoUrl
    ? `<img src="${empresa.logoUrl}" style="max-height:65px; max-width:140px; object-fit:contain;" />`
    : `<div style="width:60px;height:60px;border-radius:50%;border:3px solid #1e3a8a;display:flex;align-items:center;justify-content:center;color:#1e3a8a;font-weight:900;font-size:22px;">ERP</div>`;

  const colsHtml = columnas
    .map(
      (c) =>
        `<th style="padding:8px 10px; text-align:${c.align ?? "left"}; background:#1e3a8a; color:#ffffff; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #1e3a8a;">${c.label}</th>`
    )
    .join("");

  const rowsHtml = filas
    .map(
      (fila, i) =>
        `<tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"}; page-break-inside:avoid;">
          ${fila
            .map((cell, ci) => {
              const formatted = formatDateCell(cell ?? "-");
              const isMoneyOrNum = typeof cell === "number" || (typeof cell === "string" && cell.startsWith("$"));
              const align = columnas[ci]?.align ?? (isMoneyOrNum ? "right" : "left");
              return `<td style="padding:7px 10px; font-size:10px; text-align:${align}; border:1px solid #e2e8f0; color:#1e293b; font-family:${isMoneyOrNum ? "monospace, monospace" : "inherit"}; font-weight:${isMoneyOrNum ? "600" : "normal"};">${formatted}</td>`;
            })
            .join("")}
        </tr>`
    )
    .join("");

  return `
<div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: #ffffff; padding: 36px 40px; box-sizing: border-box; width: 100%; min-height: 100%; display: flex; flex-direction: column; justify-content: space-between;">

  <div>
    <!-- Corporate Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 3px solid #1e3a8a;">
      
      <!-- Company Information (Left) -->
      <div style="width: 42%; font-size: 10.5px; line-height: 1.45; color: #334155;">
        <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-bottom: 4px; letter-spacing: 0.5px; text-transform: uppercase;">
          ${empNombre}
        </div>
        ${empRif ? `<div style="font-weight: 600; color: #1e3a8a; margin-bottom: 2px;">${empRif}</div>` : ""}
        ${empDir ? `<div>${empDir}</div>` : ""}
        <div>
          ${empTel}${empTel && empEmail ? " | " : ""}${empEmail}
        </div>
      </div>

      <!-- Company Logo (Center) -->
      <div style="width: 18%; display: flex; justify-content: center; align-items: center;">
        ${logoHtml}
      </div>

      <!-- Report Metadata Block (Right) -->
      <div style="width: 40%; text-align: right;">
        <div style="border: 1.5px solid #1e3a8a; background: #f0f7ff; display: inline-block; padding: 4px 10px; font-weight: 800; font-size: 11px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; border-radius: 4px;">
          ${isEs ? "INFORME / REPORTE OFICIAL" : "OFFICIAL REPORT"}
        </div>
        <div style="font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.2; margin-bottom: 2px;">
          ${titulo}
        </div>
        ${subtitulo ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">${subtitulo}</div>` : ""}
        <div style="font-size: 10px; color: #475569; margin-top: 4px;">
          <strong>${isEs ? "Fecha de emisión" : "Issued"}:</strong> ${fechaHora}
        </div>
        <div style="font-size: 10px; color: #475569;">
          <strong>${isEs ? "Registros" : "Records"}:</strong> <span style="font-weight: 700; color: #1e3a8a;">${filas.length}</span>
        </div>
      </div>
    </div>

    <!-- Scope / Context Bar -->
    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 12px; margin-bottom: 16px; font-size: 9.5px; color: #475569;">
      <div>
        <strong>${isEs ? "Módulo" : "Module"}:</strong> ${isEs ? "Reportes y Análisis Empresarial" : "Reports & Enterprise Analytics"}
      </div>
      <div>
        <strong>${isEs ? "Estado" : "Status"}:</strong> ${isEs ? "Generado desde Sistema ERP" : "Generated from ERP System"}
      </div>
      <div>
        <strong>${isEs ? "Moneda" : "Currency"}:</strong> USD ($)
      </div>
    </div>

    <!-- Data Table -->
    <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px;">
      <thead>
        <tr>${colsHtml}</tr>
      </thead>
      <tbody>
        ${rowsHtml.length > 0 ? rowsHtml : `<tr><td colspan="${columnas.length}" style="text-align:center; padding:20px; color:#94a3b8; font-style:italic;">${isEs ? "No hay registros disponibles" : "No records available"}</td></tr>`}
      </tbody>
    </table>
  </div>

  <!-- Footer / Authorization -->
  <div style="margin-top: 36px; padding-top: 14px; border-top: 1.5px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #64748b; page-break-inside: avoid;">
    <div style="width: 60%; line-height: 1.4;">
      <div style="font-weight: 700; color: #334155; text-transform: uppercase;">${empNombre}</div>
      <div>${isEs ? "Documento de reporte generado electrónicamente. Válido para fines administrativos y de control interno." : "Electronically generated report document. Valid for administrative and internal control purposes."}</div>
    </div>
    <div style="width: 35%; text-align: center;">
      <div style="border-top: 1px solid #0f172a; padding-top: 4px; font-weight: 700; color: #0f172a; font-size: 9.5px;">
        ${isEs ? "FIRMA / CONFORMIDAD" : "SIGNATURE / APPROVAL"}
      </div>
    </div>
  </div>

</div>`;
}

export default function PrintReporte({
  titulo,
  subtitulo,
  columnas,
  filas,
  empresa,
  onClose,
  language,
}: PrintReporteProps) {
  const html = buildHTML(titulo, subtitulo, columnas, filas, empresa, language);

  // Mount print root at body level — same pattern as PrintFactura, PrintOrdenCliente, etc.
  useEffect(() => {
    let el = document.getElementById("print-reporte-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "print-reporte-root";
      el.style.display = "none";
      document.body.appendChild(el);
    }
    el.innerHTML = html;
    return () => {
      const node = document.getElementById("print-reporte-root");
      if (node) node.innerHTML = "";
    };
  }, [html]);

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">{titulo}</h2>
              <p className="text-xs text-slate-400">
                {language === "es"
                  ? "Vista previa de impresión oficial"
                  : "Official print preview"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <Printer className="w-4 h-4" />
              {language === "es" ? "Imprimir / Guardar PDF" : "Print / Save PDF"}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document preview */}
        <div className="p-6 bg-slate-950/80 flex justify-center overflow-x-auto">
          <div
            className="bg-white text-black shadow-2xl rounded-sm"
            style={{ width: "850px", minHeight: "1100px" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
