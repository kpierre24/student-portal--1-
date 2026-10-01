const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../dist');
const destDir = path.join(__dirname, '../build');

try {
  console.log(`Copying build artifacts from ${srcDir} to ${destDir}...`);
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('Build artifacts successfully synchronized to build/ directory!');
} catch (err) {
  console.error('Warning: Failed to synchronize build artifacts to build/ directory:', err.message);
}
