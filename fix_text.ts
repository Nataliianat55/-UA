import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix text classes
content = content.replace(/text-lg sm:text-3xl/g, 'text-2xl sm:text-3xl');
content = content.replace(/text-lg sm:text-2xl/g, 'text-xl sm:text-2xl');

fs.writeFileSync('src/App.tsx', content);

console.log('Fixed text headings!');
