const fs = require('fs');
const path = require('path');

// Helper to recursively find .tsx files
function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const srcDir = path.join(__dirname, '../frontend/src');
const files = getFiles(srcDir);

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let originalContent = content;

  // Regex to match:
  // Group 1: <div className="fixed inset-0 ..."> plus whitespace/newline
  // Group 2: <div or <form
  // Group 3: any props before className
  // Group 4: className="
  // Group 5: current classes
  // Group 6: "
  // Target only child elements immediately inside fixed inset-0 backdrops
  const modalRegex = /(<div[^>]*className="fixed inset-0[^"]*"[^>]*>[\s\n]*)(<div|<form)([^>]*className=")([^"]*)(")/g;

  content = content.replace(modalRegex, (match, g1, g2, g3, g4, g5) => {
    let classes = g4;
    // Check if it already has scroll classes to prevent duplicates
    if (!classes.includes('overflow-y-auto') && !classes.includes('max-h-')) {
      console.log(`Fixing modal scroll in ${path.basename(f)}: adding max-h-[90vh] overflow-y-auto`);
      classes = `${classes} max-h-[90vh] overflow-y-auto`.trim();
      return `${g1}${g2}${g3}${classes}${g5}`;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(f, content, 'utf8');
  }
});

console.log('Modal scroll fix completed successfully.');
