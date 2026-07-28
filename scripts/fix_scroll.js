const fs = require('fs');
const path = require('path');

const uiFiles = [
  path.join(__dirname, 'frontend/src/app/pedidos-entrantes/page.tsx'),
  path.join(__dirname, 'frontend/src/app/cotizaciones/page.tsx')
];

for (const file of uiFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Add max-h-[95vh] overflow-y-auto to the modal panel
    content = content.replace(
      /className="glass-panel w-full max-w-5xl rounded-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 border border-slate-800\/80 shadow-2xl"/g,
      'className="glass-panel w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 border border-slate-800/80 shadow-2xl"'
    );

    // Some modals might be max-w-6xl
    content = content.replace(
      /className="glass-panel w-full max-w-6xl rounded-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 border border-slate-800\/80 shadow-2xl"/g,
      'className="glass-panel w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 border border-slate-800/80 shadow-2xl"'
    );

    fs.writeFileSync(file, content);
  }
}
console.log('Fixed modal scroll.');
