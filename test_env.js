const fs = require('fs');

if (fs.existsSync('.env')) {
  const raw = fs.readFileSync('.env', 'utf8');
  console.log('Raw lines:');
  raw.split('\n').forEach((l, i) => {
    console.log(i + 1, JSON.stringify(l));
  });
}
