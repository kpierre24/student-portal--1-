const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../dist');
const destDir = path.join(__dirname, '../build');
const dataSrc = path.join(__dirname, '../data');
const dataDist = path.join(__dirname, '../dist/data');

try {
  console.log(`Copying build artifacts from ${srcDir} to ${destDir}...`);
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.cpSync(srcDir, destDir, { recursive: true });

  // Ensure authoritative state data is bundled into deployment builds
  if (fs.existsSync(dataSrc)) {
    if (!fs.existsSync(dataDist)) {
      fs.mkdirSync(dataDist, { recursive: true });
    }
    fs.cpSync(dataSrc, dataDist, { recursive: true });
    fs.cpSync(dataSrc, path.join(destDir, 'data'), { recursive: true });
    console.log('Authoritative state data synchronized to build and dist distributions.');
  }

  console.log('Build artifacts successfully synchronized to build/ directory!');
} catch (err) {
  console.error('Warning: Failed to synchronize build artifacts to build/ directory:', err.message);
}
