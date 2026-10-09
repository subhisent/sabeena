const fs = require('fs');
const data = JSON.parse(fs.readFileSync('figma_lead_details.json', 'utf8'));
const root = data.nodes['1:3141'].document;

function findNode(n, id) {
  if (n.id === id) return n;
  if (n.children) {
    for (const c of n.children) {
      const res = findNode(c, id);
      if (res) return res;
    }
  }
  return null;
}

const content = findNode(root, '51:1237');
if (content && content.children) {
  content.children.forEach(c => {
    console.log(`\n=== SECTION: ${c.name} (${c.type}, id: ${c.id}) ===`);
    if (c.children) {
      c.children.forEach(cc => {
        console.log(`  - ${cc.name} (${cc.type}, id: ${cc.id})`);
        if (cc.characters) console.log(`      text: ${JSON.stringify(cc.characters)}`);
        if (cc.children) {
          cc.children.forEach(ccc => {
            console.log(`      * ${ccc.name} (${ccc.type})`);
            if (ccc.characters) console.log(`        text: ${JSON.stringify(ccc.characters)}`);
          });
        }
      });
    }
  });
}
