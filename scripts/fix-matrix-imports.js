#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript files that import from matrix-js-sdk
const files = glob.sync('**/*.{ts,tsx}', {
  ignore: ['node_modules/**', '.next/**', 'scripts/**'],
  cwd: process.cwd()
});

console.log(`Found ${files.length} TypeScript files to check...`);

let fixedFiles = 0;

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace direct matrix-js-sdk imports with imports from our wrapper
  // Pattern: import { ... } from "matrix-js-sdk"
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+["']matrix-js-sdk["'];?/g;
  const matches = content.match(importRegex);

  if (matches) {
    console.log(`Fixing imports in: ${file}`);
    
    // Replace all matrix-js-sdk imports with matrix-sdk-exports imports
    content = content.replace(importRegex, (match, imports) => {
      return `import { ${imports} } from "@/lib/matrix/matrix-sdk-exports";`;
    });

    // Replace direct type imports
    const typeImportRegex = /import\s+type\s+\{([^}]+)\}\s+from\s+["']matrix-js-sdk["'];?/g;
    content = content.replace(typeImportRegex, (match, imports) => {
      return `import type { ${imports} } from "@/lib/matrix/matrix-sdk-exports";`;
    });

    // Replace other matrix-js-sdk specific imports
    const specificImportRegex = /import\s+type\s+\{([^}]+)\}\s+from\s+["']matrix-js-sdk\/lib\/([^"']+)["'];?/g;
    content = content.replace(specificImportRegex, (match, imports, subpath) => {
      return `import type { ${imports} } from "@/lib/matrix/matrix-sdk-exports";`;
    });

    // Write the modified content back
    fs.writeFileSync(filePath, content);
    modified = true;
    fixedFiles++;
  }
});

console.log(`Fixed ${fixedFiles} files with matrix-js-sdk imports.`);