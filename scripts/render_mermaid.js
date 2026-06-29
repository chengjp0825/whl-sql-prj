/**
 * 渲染 scripts/diagrams/*.mmd → *.png
 * 使用 @mermaid-js/mermaid-cli (mmdc) via npx (跨平台兼容)
 */
import { execSync } from 'child_process';
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIAGRAMS_DIR = join(__dirname, 'diagrams');

// Ensure diagrams directory exists
if (!existsSync(DIAGRAMS_DIR)) {
  mkdirSync(DIAGRAMS_DIR, { recursive: true });
}

const mmdFiles = readdirSync(DIAGRAMS_DIR).filter(f => f.endsWith('.mmd'));

if (mmdFiles.length === 0) {
  console.log('No .mmd files found in scripts/diagrams/');
  process.exit(0);
}

console.log(`Found ${mmdFiles.length} Mermaid diagram(s):`);

let success = 0;
let failed = 0;

for (const file of mmdFiles) {
  const input = join(DIAGRAMS_DIR, file);
  const output = join(DIAGRAMS_DIR, file.replace('.mmd', '.png'));
  console.log(`  Rendering: ${file} → ${file.replace('.mmd', '.png')}`);

  try {
    const cmd = `npx --no-install mmdc -i "${input}" -o "${output}" -w 800 --backgroundColor white`;
    execSync(cmd, {
      stdio: 'pipe',
      timeout: 60000,
      cwd: __dirname,
    });
    console.log(`    OK`);
    success++;
  } catch (err) {
    console.error(`    FAILED: ${err.message}`);
    if (err.stderr) console.error(`    stderr: ${err.stderr.toString()}`);
    failed++;
  }
}

console.log(`\nDone: ${success} succeeded, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
