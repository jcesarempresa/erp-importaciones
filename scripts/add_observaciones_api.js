const fs = require('fs');

const file = 'frontend/src/lib/api/importaciones.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. crearOrdenCliente
content = content.replace(
  /responsableNombre\?: string\n\): Promise<OrdenCliente> \{/g,
  'responsableNombre?: string,\n  observaciones?: string\n): Promise<OrdenCliente> {'
);
content = content.replace(
  /responsableId, responsableNombre,\n    createdAt: new Date\(\)\.toISOString\(\),\n  \};/g,
  'responsableId, responsableNombre,\n    observaciones,\n    createdAt: new Date().toISOString(),\n  };'
);

// 2. editarOrdenCliente
content = content.replace(
  /responsableNombre\?: string\n\): Promise<OrdenCliente> \{/g,
  'responsableNombre?: string,\n  observaciones?: string\n): Promise<OrdenCliente> {'
);
content = content.replace(
  /responsableId, responsableNombre,\n    updatedAt: new Date\(\)\.toISOString\(\),\n  \};/g,
  'responsableId, responsableNombre,\n    observaciones,\n    updatedAt: new Date().toISOString(),\n  };'
);

// 3. crearPedidoProveedor
content = content.replace(
  /responsableNombre\?: string\n\): Promise<PedidoProveedor> \{/g,
  'responsableNombre?: string,\n  observaciones?: string\n): Promise<PedidoProveedor> {'
);
content = content.replace(
  /responsableId, responsableNombre,\n    createdAt: new Date\(\)\.toISOString\(\),\n  \};/g,
  'responsableId, responsableNombre,\n    observaciones,\n    createdAt: new Date().toISOString(),\n  };'
);

// 4. editarPedidoProveedor
content = content.replace(
  /responsableNombre\?: string\n\): Promise<PedidoProveedor> \{/g,
  'responsableNombre?: string,\n  observaciones?: string\n): Promise<PedidoProveedor> {'
);
content = content.replace(
  /responsableId, responsableNombre,\n    updatedAt: new Date\(\)\.toISOString\(\),\n  \};/g,
  'responsableId, responsableNombre,\n    observaciones,\n    updatedAt: new Date().toISOString(),\n  };'
);

fs.writeFileSync(file, content);
console.log('Done importaciones.ts');
