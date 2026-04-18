import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Modals p-8 -> p-5 sm:p-8
content = content.replace(/className="p-8 /g, 'className="p-5 sm:p-8 ');

// py-6 inputs and buttons -> py-4 sm:py-6
content = content.replace(/className="text-lg py-6"/g, 'className="text-base sm:text-lg py-4 sm:py-6"');
content = content.replace(/className="text-lg py-6 /g, 'className="text-base sm:text-lg py-4 sm:py-6 ');
content = content.replace(/py-6"/g, 'py-4 sm:py-6"');
content = content.replace(/py-6 /g, 'py-4 sm:py-6 ');

// py-7 inputs and buttons -> py-4 sm:py-7
content = content.replace(/py-7"/g, 'py-4 sm:py-7"');
content = content.replace(/py-7 /g, 'py-4 sm:py-7 ');

// Also make some titles more responsive
content = content.replace(/text-3xl/g, 'text-2xl sm:text-3xl');
content = content.replace(/text-2xl/g, 'text-xl sm:text-2xl');
content = content.replace(/sm:sm:text-/g, 'sm:text-'); // fix accidental double replace
content = content.replace(/sm:text-xl sm:text-2xl/g, 'sm:text-2xl');
content = content.replace(/sm:text-2xl sm:text-3xl/g, 'sm:text-3xl');

// Check Add Activity date select padding 
content = content.replace(/text-lg py-4 sm:py-6 rounded-2xl border-2/g, 'text-base sm:text-lg py-4 sm:py-6 rounded-2xl border-2');

fs.writeFileSync('src/App.tsx', content);

console.log('Done padding replacements!');
