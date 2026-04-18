import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix the mess
content = content.replace(/py-4 sm:py-4 sm:py-6/g, 'py-3 sm:py-6');
content = content.replace(/py-4 sm:py-6/g, 'py-3 sm:py-6');
content = content.replace(/py-4 sm:py-7/g, 'py-3 sm:py-6');
content = content.replace(/text-xl/g, 'text-lg sm:text-xl'); // Let's also adjust text-xl inside forms if needed, wait, better not double-replace.

// Just fix tailwind mistakes
content = content.replace(/text-lg sm:text-xl/g, 'text-lg'); // Revert my manual global text-xl replace? Let's check text replacements.

// The text-2xl sm:text-3xl replaces
// Just re-read the file correctly to fix double classes:
content = content.replace(/py-3 sm:py-3 sm:py-6/g, 'py-3 sm:py-6');
content = content.replace(/text-base sm:text-base sm:text-lg/g, 'text-base sm:text-lg');

fs.writeFileSync('src/App.tsx', content);

console.log('Fixed overlapping classes!');
