const fs = require('fs');

const files = [
  { path: 'frontend/src/components/PrintCotizacion.tsx', obj: 'cot' },
  { path: 'frontend/src/components/PrintOrdenCliente.tsx', obj: 'ord' },
  { path: 'frontend/src/components/PrintPedidoProveedor.tsx', obj: 'ped' }
];

for (const fileObj of files) {
  const file = fileObj.path;
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');

  // Add the HTML string generation
  const htmlGenerator = `
  const observacionesHtml = ${fileObj.obj}.observaciones ? \`
  <div style="margin-top: 15px; font-size: 10px; border: 1px solid #000; padding: 6px;">
    <strong>Observaciones Generales / Notas Importantes:</strong><br/>
    <div style="white-space: pre-wrap; margin-top: 4px;">\${${fileObj.obj}.observaciones.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>
  \` : '';
`;

  // Insert before the return string
  content = content.replace(
    /return `/g,
    htmlGenerator + '  return `'
  );

  // Insert into the HTML template just before FOOTER
  content = content.replace(
    /<!-- FOOTER -->/g,
    '${observacionesHtml}\n  <!-- FOOTER -->'
  );

  fs.writeFileSync(file, content);
}
console.log('Done PDF mods');
