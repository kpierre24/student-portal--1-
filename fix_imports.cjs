const fs = require('fs');
let code = fs.readFileSync('src/app/AppRouter.tsx', 'utf8');
const lines = code.split('\n');

// We want to extract lines 101 to 113, and 149 to 159.
// And move them just before line 172.

const block1 = lines.slice(100, 113); // 101 to 113
const block2 = lines.slice(148, 159); // 149 to 159

const allExtracted = [...block1, ...block2];

// Blank them out in the original lines
for (let i = 100; i < 113; i++) lines[i] = undefined;
for (let i = 148; i < 159; i++) lines[i] = undefined;

const newLines = [];
for (let i = 0; i < lines.length; i++) {
  if (i === 171) { // line 172 (0-indexed 171)
    newLines.push(...allExtracted);
  }
  if (lines[i] !== undefined) {
    newLines.push(lines[i]);
  }
}

fs.writeFileSync('src/app/AppRouter.tsx', newLines.join('\n'));
console.log('Fixed imports!');
