/**
 * Automated Production Android App Bundle (.aab) Generator
 * 
 * Workflow:
 * 1. Verify Java / Android Build Environment
 * 2. Build optimized web assets (npm run build)
 * 3. Synchronize Capacitor native Android bridge (npx cap sync android)
 * 4. Execute Gradle bundleRelease task
 * 5. Verify and report generated AAB artifact, file size, and testing instructions
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');
const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

console.log('================================================================');
console.log('  HTEIM School of Ministry — Production Android AAB Packaging');
console.log('================================================================\n');

function runStep(label, command, cwd = rootDir) {
  console.log(`\n▶ [${label}] Running: ${command}`);
  try {
    execSync(command, { cwd, stdio: 'inherit', env: process.env });
    console.log(`✔ [${label}] Completed successfully.`);
  } catch (err) {
    console.error(`\n✖ [${label}] FAILED with code: ${err.status}`);
    process.exit(err.status || 1);
  }
}

// 1. Verify Environment
try {
  const javaVer = execSync('java -version 2>&1').toString();
  console.log('Java Runtime Detected:');
  console.log(javaVer.split('\n')[0]);
} catch (e) {
  console.error('Warning: Java not detected in PATH. Please verify JDK 11+ is installed.');
}

// 2. Build Web Assets
runStep('Step 1: Web Assets Build', 'npm run build', rootDir);

// 3. Sync to Capacitor Android
runStep('Step 2: Capacitor Android Sync', 'npx cap sync android', rootDir);

// 4. Run Gradle bundleRelease
const gradlewPath = path.join(androidDir, gradlewCmd);
if (!fs.existsSync(gradlewPath)) {
  console.error(`Error: Gradle wrapper not found at ${gradlewPath}`);
  process.exit(1);
}

runStep('Step 3: Android Release Bundle', `${gradlewCmd} bundleRelease`, androidDir);

// 5. Inspect and verify output AAB
const outputDir = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release');
const candidateFiles = fs.existsSync(outputDir) ? fs.readdirSync(outputDir).filter(f => f.endsWith('.aab')) : [];

if (candidateFiles.length === 0) {
  console.warn('\n⚠ Note: Gradle completed, checking unsigned or release bundles...');
} else {
  candidateFiles.forEach(file => {
    const fullPath = path.join(outputDir, file);
    const stats = fs.statSync(fullPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');

    console.log('\n================================================================');
    console.log('  ✔ Production Android App Bundle (.aab) Successfully Generated');
    console.log('================================================================');
    console.log(`  File:      ${file}`);
    console.log(`  Location:  ${fullPath}`);
    console.log(`  Size:      ${sizeMb} MB (${stats.size} bytes)`);
    console.log(`  SHA-256:   ${hash}`);
    console.log('\n  Distribution & Physical Device Testing:');
    console.log('  1. Google Play Console: Upload directly to Internal Testing or Production track.');
    console.log('  2. Physical Device Testing with bundletool:');
    console.log(`     bundletool build-apks --bundle=${file} --output=app.apks --mode=universal`);
    console.log('     bundletool install-apks --apks=app.apks');
    console.log('================================================================\n');
  });
}
