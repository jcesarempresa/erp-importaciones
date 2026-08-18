"use client";

import { X, Printer } from "lucide-react";

export interface ReporteColumna {
  label: string;
  align?: "left" | "right" | "center";
}

export interface PrintReporteProps {
  titulo: string;
  subtitulo?: string;
  columnas: ReporteColumna[];
  filas: (string | number)[][];
  empresa?: { nombre?: string; logoUrl?: string };
  onClose: () => void;
  language: string;
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
  const handlePrint = () => window.print();

  const fecha = new Date().toLocaleDateString(language === "es" ? "es-DO" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const logoHtml = empresa?.logoUrl
    ? `<img src="${empresa.logoUrl}" style="max-height:55px;object-fit:contain;" />`
    : "";

  const colsHtml = columnas
    .map(
      (c) =>
        `<th style="padding:7px 10px;text-align:${c.align ?? "left"};background:#1e3a8a;color:#fff;font-size:11px;font-weight:700;border:1px solid #2d4db0;">${c.label}</th>`
    )
    .join("");

  const rowsHtml = filas
    .map(
      (fila, i) =>
        `<tr style="background:${i % 2 === 0 ? "#fff" : "#f5f7fa"};">
          ${fila
            .map(
              (cell, ci) =>
                `<td style="padding:6px 10px;font-size:10.5px;text-align:${columnas[ci]?.align ?? "left"};border:1px solid #e2e8f0;color:#1a202c;">${cell ?? "-"}</td>`
            )
            .join("")}
        </tr>`
    )
    .join("");

  const printHtml = `
<div style="font-family:Arial,sans-serif;color:#000;background:white;padding:40px;box-sizing:border-box;width:100%;min-height:100%;">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;border-bottom:3px solid #1e3a8a;padding-bottom:14px;">
    <div>
      ${empresa?.nombre ? `<div style="font-size:17px;font-weight:900;color:#1e3a8a;letter-spacing:0.5px;">${empresa.nombre}</div>` : ""}
      <div style="font-size:22px;font-weight:700;color:#111;margin-top:6px;">${titulo}</div>
      ${subtitulo ? `<div style="font-size:12px;color:#555;margin-top:2px;">${subtitulo}</div>` : ""}
    </div>
    <div style="text-align:right;">
      ${logoHtml}
      <div style="font-size:11px;color:#555;margin-top:6px;">${language === "es" ? "Fecha de generación" : "Generated on"}: <strong>${fecha}</strong></div>
      <div style="font-size:10px;color:#888;margin-top:2px;">${language === "es" ? "Total de registros" : "Total records"}: <strong>${filas.length}</strong></div>
    </div>
  </div>

  <!-- Table -->
  <table style="width:100%;border-collapse:collapse;margin-top:10px;">
    <thead><tr>${colsHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <!-- Footer -->
  <div style="margin-top:30px;font-size:9px;color:#999;text-align:center;border-top:1px solid #e2e8f0;padding-top:10px;">
    ${empresa?.nombre ?? ""} &nbsp;·&nbsp; ${titulo} &nbsp;·&nbsp; ${fecha}
  </div>
</div>`;

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > *:not(#print-reporte-root) { display: none !important; }
          #print-reporte-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; }
        }
      `}</style>

      {/* Hidden print target — injected into body */}
      <div
        id="print-reporte-root"
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: printHtml }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-6 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl max-h-[92vh] overflow-y-auto">
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Printer className="w-4 h-4 text-indigo-400" />
              {titulo}
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <Printer className="w-4 h-4" />
                {language === "es" ? "Imprimir / Guardar PDF" : "Print / Save PDF"}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Document preview */}
          <div className="p-4 bg-slate-950/80 flex justify-center overflow-x-auto">
            <div
              className="bg-white text-black shadow-2xl"
              style={{ width: "816px", minHeight: "1056px" }}
              dangerouslySetInnerHTML={{ __html: printHtml }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
