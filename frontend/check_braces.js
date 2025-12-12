const fs = require('fs');
const content = fs.readFileSync('src/pages/ProfilePage.jsx', 'utf8');
const lines = content.split('\n');
let braceCount = 0;
let parenCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const prevBraceCount = braceCount;
  for (const char of line) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
  }
  // Show lines where brace count goes up and stays up
  if (braceCount > prevBraceCount && i >= 1 && i <= 380) {
    console.log(`Line ${i+1}: {=${braceCount}, (=${parenCount} | ${line.substring(0, 70)}`);
  }
  // Show lines near the error
  if (i >= 445 && i <= 452) {
    console.log(`Line ${i+1}: {=${braceCount}, (=${parenCount} | ${line.substring(0, 70)}`);
  }
}

console.log(`\nFinal: braces=${braceCount}, parens=${parenCount}`);
