const fs = require('fs');
const data = JSON.parse(fs.readFileSync('figma_lead_details.json', 'utf8'));
const root = data.nodes['1:3141'].document;

function printNodeTree(n, depth = 0) {
  const indent = '  '.repeat(depth);
  const parts = [n.type, n.name];
  if (n.characters) parts.push(`"${n.characters.replace(/\n/g, ' ')}"`);
  if (n.layoutMode) parts.push(`layout:${n.layoutMode}`);
  if (n.paddingLeft !== undefined) parts.push(`p:[${n.paddingTop},${n.paddingRight},${n.paddingBottom},${n.paddingLeft}]`);
  if (n.itemSpacing !== undefined) parts.push(`gap:${n.itemSpacing}`);
  if (n.cornerRadius !== undefined) parts.push(`radius:${n.cornerRadius}`);
  if (n.fills && n.fills.length) {
    for (const f of n.fills) {
      if (f.type === 'SOLID' && f.color) {
        const hex = '#' + [f.color.r, f.color.g, f.color.b].map(x => Math.round(x*255).toString(16).padStart(2, '0')).join('').toUpperCase();
        parts.push(`fill:${hex}`);
      } else if (f.type === 'GRADIENT_LINEAR') {
        parts.push(`fill:GRADIENT_LINEAR(${JSON.stringify(f.gradientStops)})`);
      }
    }
  }
  if (n.strokes && n.strokes.length) {
    for (const s of n.strokes) {
      if (s.type === 'SOLID' && s.color) {
        const hex = '#' + [s.color.r, s.color.g, s.color.b].map(x => Math.round(x*255).toString(16).padStart(2, '0')).join('').toUpperCase();
        parts.push(`stroke:${hex}`);
      }
    }
  }
  if (n.absoluteBoundingBox) {
    parts.push(`size:${Math.round(n.absoluteBoundingBox.width)}x${Math.round(n.absoluteBoundingBox.height)}`);
  }
  console.log(indent + parts.join(' | '));
  if (n.children) {
    n.children.forEach(c => printNodeTree(c, depth + 1));
  }
}

printNodeTree(root);
