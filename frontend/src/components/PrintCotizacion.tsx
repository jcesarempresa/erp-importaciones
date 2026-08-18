"use client";

import { useEffect, useRef, useState } from "react";
import { Cotizacion, Cliente } from "@/types";
import { EmpresaConfig } from "@/lib/api/importaciones";
import { X, Printer } from "lucide-react";

interface Props {
  cotizacion: Cotizacion;
  empresa: EmpresaConfig;
  onClose: () => void;
  language: string;
  clientes?: Cliente[];
}

export default function PrintCotizacion({ cotizacion, empresa, onClose, language, clientes = [] }: Props) {
  const [overrideBanco, setOverrideBanco] = useState<string>(cotizacion.bancoSeleccionado || "");
  const printRootRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // Mount the print root at body level so @media print can target it
  useEffect(() => {
    let el = document.getElementById("print-cotizacion-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "print-cotizacion-root";
      el.style.display = "none";
      document.body.appendChild(el);
    }
    printRootRef.current = el as HTMLDivElement;
    
    return () => {
      // Don't remove here to prevent flickering if remounted quickly, just clear it
      if (el) el.innerHTML = "";
    };
  }, []);

  // Sync print content into the body-level div
  useEffect(() => {
    const el = document.getElementById("print-cotizacion-root");
    if (!el) return;
    el.innerHTML = buildPrintHTML(cotizacion, empresa, language, clientes, overrideBanco);
  }, [cotizacion, empresa, language, clientes, overrideBanco]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Printer className="w-4 h-4 text-indigo-400" />
            {language === "es" ? "Vista Previa del Presupuesto" : "Budget Preview"} — {cotizacion.id}
          </h2>
          <div className="flex items-center gap-4">
            {/* Bank Account Selector in Toolbar */}
            {(empresa.bancoNombre3 || empresa.bancoNombre4) && (
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
                  {empresa.bancoNombre3 && <option className="bg-slate-900 text-white" value="cuenta3">{empresa.bancoNombre3}</option>}
                  {empresa.bancoNombre4 && <option className="bg-slate-900 text-white" value="cuenta4">{empresa.bancoNombre4}</option>}
                </select>
              </div>
            )}

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

        {/* Preview area (mirrors print content using iframe approach for strict CSS isolation) */}
        <div className="p-4 bg-slate-950/80 flex justify-center overflow-x-auto">
          <div 
            className="bg-white text-black shadow-2xl" 
            style={{ width: "816px", minHeight: "1056px" }} // Letter size 8.5x11 at 96dpi
            dangerouslySetInnerHTML={{ __html: buildPrintHTML(cotizacion, empresa, language, clientes, overrideBanco) }}
          />
        </div>
      </div>
    </div>
  );
}

// Build raw HTML string for exact PDF replication
function buildPrintHTML(cot: Cotizacion, empresa: EmpresaConfig, lang: string, clientes: Cliente[], overrideBanco?: string): string {
  const isEs = lang === "es";
  const fmtMoney = (n: number) => n.toLocaleString("es-VE", { minimumFractionDigits: 2 });
  
  // Try to find full client info for fallback addresses
  const cliente = clientes.find(c => c.id === cot.clienteId);
  const fallbackBillTo = cliente?.direccion || "RIF/TELEF:";
  const fallbackShipTo = (cliente as any)?.direccionDespacho || cliente?.direccion || "RIF/TELEF:";
  
  // Create rows to fill space if few items
  const minRows = 0;
  const rows = [];
  for (let i = 0; i < Math.max(cot.items.length, minRows); i++) {
    const item = cot.items[i];
    if (item) {
      rows.push(`
        <tr style="height: 24px;">
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;">${i + 1}</td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;">${item.sku}</td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; vertical-align: top;">
            <div style="font-weight: bold;">${item.descripcion}</div>
            ${item.detalles ? `<div style="font-size: 9px; margin-top: 4px; white-space: pre-wrap; font-weight: normal;">${item.detalles}</div>` : ''}
          </td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;">${item.modelo || ""}</td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;">${item.cantidad}</td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: right;">${fmtMoney(item.precioUnitario)}</td>
          <td style="padding: 2px 4px; text-align: right;">${fmtMoney(item.cantidad * item.precioUnitario)}</td>
        </tr>
      `);
    } else {
      rows.push(`
        <tr style="height: 24px;">
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="padding: 2px 4px;"></td>
        </tr>
      `);
    }
  }

  const logoHtml = empresa.logoUrl
    ? `<img src="${empresa.logoUrl}" style="max-height:60px; object-fit:contain;" />`
    : `<div style="width:60px;height:60px;border-radius:50%;border:4px solid #800020;display:flex;align-items:center;justify-content:center;color:#800020;font-weight:bold;font-size:24px;">UU</div>`;

  
  const observacionesHtml = cot.observaciones ? `
  <div style="margin-top: 15px; font-size: 10px; border: 1px solid #000; padding: 6px; page-break-inside: avoid;">
    <strong>Observaciones Generales / Notas Importantes:</strong><br/>
    <div style="white-space: pre-wrap; margin-top: 4px;">${cot.observaciones.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>
  ` : '';

  let bancoHtml = "";
  let activeBanco = overrideBanco || cot.bancoSeleccionado || "";
  if (activeBanco !== "cuenta3" && activeBanco !== "cuenta4") {
    activeBanco = "";
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
  return `
<div style="font-family: Arial, sans-serif; color: #000; background: white; padding: 40px; box-sizing: border-box; width: 100%; min-height: 100%;">
  
  <!-- HEADER -->
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
      <h1 style="font-size: 26px; font-weight: bold; margin: 0; padding: 0; color: #000;">Sales Quote</h1>
    </div>
  </div>
  
  <!-- Thick black divider -->
  <div style="height: 4px; background-color: #000; width: 100%; margin-bottom: 10px;"></div>
  
  <!-- BILL TO / SHIP TO -->
  <div style="border: 1px solid #000; display: flex; margin-bottom: 15px; font-size: 10px;">
    <!-- Bill To -->
    <div style="width: 50%; padding: 4px 8px; border-right: 1px solid #000;">
      <div style="font-weight: bold; margin-bottom: 4px;">Bill To:</div>
      <div style="font-weight: bold;">${cot.clienteNombre}</div>
      <div>${cot.billToDireccion || fallbackBillTo}</div>
    </div>
    <!-- Ship To -->
    <div style="width: 50%; padding: 4px 8px;">
      <div style="font-weight: bold; margin-bottom: 4px;">Ship To:</div>
      <div style="font-weight: bold;">${cot.clienteNombre}</div>
      <div>${cot.shipToDireccion || fallbackShipTo}</div>
    </div>
  </div>
  
  <!-- METADATA GRID -->
  <div style="border: 3px double #000; margin-bottom: 15px; font-size: 10px;">
    <table style="width: 100%; border-collapse: collapse; text-align: center;">
      <tr style="border-bottom: 3px double #000;">
        <td style="width: 25%; border-right: 1px solid #000; padding: 4px;">
          <div style="font-weight: bold;">Customer No.</div>
          <div style="height: 14px;">${cot.customerNo || ""}</div>
        </td>
        <td style="width: 25%; border-right: 1px solid #000; padding: 4px;">
          <div style="font-weight: bold;">Request for Quote</div>
          <div style="height: 14px;">${cot.peticionOferta || ""}</div>
        </td>
        <td style="width: 25%; border-right: 1px solid #000; padding: 4px;">
          <div style="font-weight: bold;">Sales Quote</div>
          <div style="height: 14px;">${cot.id}</div>
        </td>
        <td style="width: 25%; padding: 4px;">
          <div style="font-weight: bold;">Sales Quote Date</div>
          <div style="height: 14px;">${new Date(cot.fecha).toLocaleDateString("en-US")}</div>
        </td>
      </tr>
      <tr style="border-bottom: 1px solid #000;">
        <td style="border-right: 1px solid #000; padding: 4px;">
          <div style="font-weight: bold;">Payment Terms</div>
          <div>Credit</div>
        </td>
        <td style="border-right: 1px solid #000; padding: 4px;">
          <div style="font-weight: bold;">Offer Valid</div>
          <div>${cot.offerValid || "15 Days"}</div>
        </td>
        <td style="border-right: 1px solid #000; padding: 4px;">
          <div style="font-weight: bold;">Freight</div>
          <div>${cot.freightTerm || "AIR"}</div>
        </td>
        <td style="padding: 4px;">
          <div style="font-weight: bold;">Proforma Date Due</div>
          <div style="height: 14px;">${cot.proformaDateDue || ""}</div>
        </td>
      </tr>
      <tr>
        <td style="border-right: 1px solid #000; padding: 4px;">
          <div style="font-weight: bold;">Delivery Terms</div>
          <div style="height: 14px;">${cot.deliveryTerms || ""}</div>
        </td>
        <td style="border-right: 1px solid #000; padding: 4px;">
          <div style="font-weight: bold;">Origin Country</div>
          <div>${cot.originCountry || "United States of America"}</div>
        </td>
        <td style="border-right: 1px solid #000; padding: 4px;">
          <div style="font-weight: bold;">Shipped From</div>
          <div>${cot.shippedFrom || "Miami"}</div>
        </td>
        <td style="padding: 4px;">
          <div style="font-weight: bold;">Port of Destination</div>
          <div style="height: 14px;">${cot.portOfDestination || ""}</div>
        </td>
      </tr>
    </table>
  </div>
  
  <!-- ITEMS TABLE -->
  <div style="border-left: 3px double #000; border-right: 3px double #000; border-top: 3px double #000; border-bottom: 3px double #000; font-size: 10px;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 3px double #000; font-weight: bold;">
          <th style="border-right: 1px solid #000; padding: 4px; width: 4%;">Item</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 4%;">Pos</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 12%;">Ref</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 40%;">Description of Good</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 10%;">Model</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 8%;">Quantity</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 10%;">Unit Price USD$</th>
          <th style="padding: 4px; width: 12%;">Total USD$</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join("")}
        <!-- TOTALS SECTIONS inside table structure -->
        <tr style="border-top: 1px solid #000; height: 22px;">
          <td colspan="5" style="border-right: 1px solid #000;"></td>
          <td colspan="2" style="border-right: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right;">Subtotal DDP - Miami</td>
          <td style="padding: 2px 4px; text-align: right;">${fmtMoney(cot.subtotal)}</td>
        </tr>
        <tr style="height: 22px;">
          <td colspan="5" style="border-right: 1px solid #000;"></td>
          <td colspan="2" style="border-right: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right;">Handling / Freight - Air</td>
          <td style="padding: 2px 4px; text-align: right;">${fmtMoney(cot.flete || 0)}</td>
        </tr>
        <tr style="height: 22px;">
          <td colspan="5" style="border-right: 1px solid #000;"></td>
          <td colspan="2" style="border-right: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right;">Insurance</td>
          <td style="padding: 2px 4px; text-align: right;">${fmtMoney(cot.otrosGastos || 0)}</td>
        </tr>
        <!-- Grand Total with double line above and below -->
        <tr style="border-top: 1px solid #000; height: 26px;">
          <td colspan="5" style="border-right: 1px solid #000;"></td>
          <td colspan="2" style="border-right: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right;">Total DDP USD$</td>
          <td style="padding: 2px 4px; text-align: right; font-weight: bold;">${fmtMoney(cot.total)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  
  ${observacionesHtml}
  ${bancoHtml}
  <!-- FOOTER -->
  <div style="margin-top: 5px; font-size: 9px;">
    <div style="text-align: right; margin-bottom: 2px; font-weight: bold;">
      ${empresa.nombre || "UNIDAD DE EQUIPOS ESPECIALES, LLC"} (Pag. 1 / 1)
    </div>
    <div style="border-top: 1px solid #000; padding-top: 4px; display: flex; justify-content: space-between;">
      <div style="font-weight: bold;">
        Please itemize all proforma invoice numbers & application credits on remittance advice.
      </div>
      <div style="font-weight: bold;">
        Certified true and correct
      </div>
    </div>
  </div>

</div>
`;
}
