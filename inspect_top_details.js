const fs = require('fs');
const data = JSON.parse(fs.readFileSync('figma_lead_details.json', 'utf8'));
const root = data.nodes['1:3141'].document;

function findTopSection(n) {
  if (n.name === 'Header' || n.name === 'Screen content' || n.name === 'Hero' || n.name === 'Top') {
    return n;
  }
  if (n.children) {
    for (const c of n.children) {
      const res = findTopSection(c);
      if (res) return res;
    }
  }
  return null;
}

const top = root.children[1] || root.children[0];
console.log(JSON.stringify(top, null, 2).slice(0, 4000));
