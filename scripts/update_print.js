const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/components/PrintCotizacion.tsx');

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add hidePrices to Props
  content = content.replace(
    /clientes\?: Cliente\[\];\n\}/,
    'clientes?: Cliente[];\n  hidePrices?: boolean;\n}'
  );

  // 2. Add hidePrices to component signature and buildPrintHTML call
  content = content.replace(
    /export default function PrintCotizacion\(\{ cotizacion, empresa, onClose, language, clientes = \[\] \}: Props\) \{/,
    'export default function PrintCotizacion({ cotizacion, empresa, onClose, language, clientes = [], hidePrices = false }: Props) {'
  );
  content = content.replace(
    /el\.innerHTML = buildPrintHTML\(cotizacion, empresa, language, clientes\);/g,
    'el.innerHTML = buildPrintHTML(cotizacion, empresa, language, clientes, hidePrices);'
  );
  content = content.replace(
    /dangerouslySetInnerHTML=\{\{ __html: buildPrintHTML\(cotizacion, empresa, language, clientes\) \}\}/,
    'dangerouslySetInnerHTML={{ __html: buildPrintHTML(cotizacion, empresa, language, clientes, hidePrices) }}'
  );
  content = content.replace(
    /function buildPrintHTML\(cot: Cotizacion, empresa: EmpresaConfig, lang: string, clientes: Cliente\[\]\): string \{/,
    'function buildPrintHTML(cot: Cotizacion, empresa: EmpresaConfig, lang: string, clientes: Cliente[], hidePrices: boolean): string {'
  );

  // 3. Update the table headers
  const oldHeaders = `<th style="border-right: 1px solid #000; padding: 4px; width: 40%;">Description of Good</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 10%;">Model</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 8%;">Quantity</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 10%;">Unit Price USD$</th>
          <th style="padding: 4px; width: 12%;">Total USD$</th>`;
  const newHeaders = `<th style="border-right: 1px solid #000; padding: 4px; width: \${hidePrices ? '62%' : '40%'};">Description of Good</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 10%;">Model</th>
          <th style="border-right: 1px solid #000; padding: 4px; width: 8%;">Quantity</th>
          \${hidePrices ? '' : '<th style="border-right: 1px solid #000; padding: 4px; width: 10%;">Unit Price USD$</th>'}
          \${hidePrices ? '' : '<th style="padding: 4px; width: 12%;">Total USD$</th>'}`;
  content = content.replace(oldHeaders, newHeaders);

  // 4. Update the row mapping (item)
  const oldItemRow = `<td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;">\${i + 1}</td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;">\${item.sku}</td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; vertical-align: top;">
            <div style="font-weight: bold;">\${item.descripcion}</div>
            \${item.detalles ? \`<div style="font-size: 9px; margin-top: 4px; white-space: pre-wrap; font-weight: normal;">\${item.detalles}</div>\` : ''}
          </td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;">\${item.modelo || ""}</td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;">\${item.cantidad}</td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: right;">\${fmtMoney(item.precioUnitario)}</td>
          <td style="padding: 2px 4px; text-align: right;">\${fmtMoney(item.cantidad * item.precioUnitario)}</td>`;
  
  const newItemRow = `<td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;">\${i + 1}</td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;">\${item.pos || ""}</td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;">\${item.sku}</td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; vertical-align: top;">
            <div style="font-weight: bold;">\${item.descripcion}</div>
            \${item.detalles ? \`<div style="font-size: 9px; margin-top: 4px; white-space: pre-wrap; font-weight: normal;">\${item.detalles}</div>\` : ''}
          </td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;">\${item.modelo || ""}</td>
          <td style="border-right: 1px solid #000; padding: 2px 4px; text-align: center;">\${item.cantidad}</td>
          \${hidePrices ? '' : \`<td style="border-right: 1px solid #000; padding: 2px 4px; text-align: right;">\${fmtMoney(item.precioUnitario)}</td>\`}
          \${hidePrices ? '' : \`<td style="padding: 2px 4px; text-align: right;">\${fmtMoney(item.cantidad * item.precioUnitario)}</td>\`}
`;
  content = content.replace(oldItemRow, newItemRow);

  // 5. Update the row mapping (empty)
  const oldEmptyRow = `<td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="padding: 2px 4px;"></td>`;
  const newEmptyRow = `<td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          <td style="border-right: 1px solid #000; padding: 2px 4px;"></td>
          \${hidePrices ? '' : '<td style="border-right: 1px solid #000; padding: 2px 4px;"></td>'}
          \${hidePrices ? '' : '<td style="padding: 2px 4px;"></td>'}`;
  content = content.replace(oldEmptyRow, newEmptyRow);

  // 6. Update the Totals
  const oldTotals = `<!-- TOTALS SECTIONS inside table structure -->
        <tr style="border-top: 1px solid #000; height: 22px;">
          <td colspan="5" style="border-right: 1px solid #000;"></td>
          <td colspan="2" style="border-right: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right;">Subtotal DDP - Miami</td>
          <td style="padding: 2px 4px; text-align: right;">\${fmtMoney(cot.subtotal)}</td>
        </tr>
        <tr style="height: 22px;">
          <td colspan="5" style="border-right: 1px solid #000;"></td>
          <td colspan="2" style="border-right: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right;">Handling / Freight - Air</td>
          <td style="padding: 2px 4px; text-align: right;">\${fmtMoney(cot.flete || 0)}</td>
        </tr>
        <tr style="height: 22px;">
          <td colspan="5" style="border-right: 1px solid #000;"></td>
          <td colspan="2" style="border-right: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right;">Insurance</td>
          <td style="padding: 2px 4px; text-align: right;">\${fmtMoney(cot.otrosGastos || 0)}</td>
        </tr>
        <!-- Grand Total with double line above and below -->
        <tr style="border-top: 1px solid #000; height: 26px;">
          <td colspan="5" style="border-right: 1px solid #000;"></td>
          <td colspan="2" style="border-right: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right;">Total DDP USD$</td>
          <td style="padding: 2px 4px; text-align: right; font-weight: bold;">\${fmtMoney(cot.total)}</td>
        </tr>`;

  const newTotals = `\${hidePrices ? '' : \`<!-- TOTALS SECTIONS inside table structure -->
        <tr style="border-top: 1px solid #000; height: 22px;">
          <td colspan="5" style="border-right: 1px solid #000;"></td>
          <td colspan="2" style="border-right: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right;">Subtotal DDP - Miami</td>
          <td style="padding: 2px 4px; text-align: right;">\${fmtMoney(cot.subtotal)}</td>
        </tr>
        <tr style="height: 22px;">
          <td colspan="5" style="border-right: 1px solid #000;"></td>
          <td colspan="2" style="border-right: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right;">Handling / Freight - Air</td>
          <td style="padding: 2px 4px; text-align: right;">\${fmtMoney(cot.flete || 0)}</td>
        </tr>
        <tr style="height: 22px;">
          <td colspan="5" style="border-right: 1px solid #000;"></td>
          <td colspan="2" style="border-right: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right;">Insurance</td>
          <td style="padding: 2px 4px; text-align: right;">\${fmtMoney(cot.otrosGastos || 0)}</td>
        </tr>
        <!-- Grand Total with double line above and below -->
        <tr style="border-top: 1px solid #000; height: 26px;">
          <td colspan="5" style="border-right: 1px solid #000;"></td>
          <td colspan="2" style="border-right: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right;">Total DDP USD$</td>
          <td style="padding: 2px 4px; text-align: right; font-weight: bold;">\${fmtMoney(cot.total)}</td>
        </tr>\`}`;
  content = content.replace(oldTotals, newTotals);

  fs.writeFileSync(file, content);
}
console.log('Updated PrintCotizacion.tsx for pos and hidePrices.');
