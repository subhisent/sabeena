const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./figma_lead_details.json', 'utf8'));
const doc = data.nodes['1:3141'].document;

function printNode(n, indent = 0) {
  let extra = '';
  if (n.characters) extra += ` - "${n.characters}"`;
  if (n.fills && n.fills.length) {
    const f = n.fills[0];
    if (f.type === 'SOLID' && f.color) {
      extra += ` [fill: rgb(${Math.round(f.color.r*255)},${Math.round(f.color.g*255)},${Math.round(f.color.b*255)})]`;
    } else if (f.type.includes('GRADIENT')) {
      extra += ` [fill: ${f.type}]`;
    }
  }
  console.log(' '.repeat(indent) + `${n.name} (${n.type})${extra}`);
  if (n.children) {
    n.children.forEach(c => printNode(c, indent + 2));
  }
}

printNode(doc);
