import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Change modal z-index from 40 to 50
content = content.replace(/className="fixed inset-0 z-40 bg-black\/60 backdrop-blur-sm/g, 'className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm');

fs.writeFileSync('src/App.tsx', content);

console.log('Fixed dialog z-indexes!');
