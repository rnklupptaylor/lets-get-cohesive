const fs = require('node:fs');
const path = require('node:path');
const { version } = require('../package.json');

const root = path.resolve(__dirname, '..');
const baseline = process.argv.includes('--baseline');
const sourcePath = path.join(root, 'src', 'index.html');
const outputDir = path.join(root, 'build', baseline ? 'baseline' : 'deploy');
const target = path.join(outputDir, 'index.html');
fs.mkdirSync(outputDir, { recursive: true });

if (baseline) {
  fs.copyFileSync(sourcePath, target);
} else {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const credit = '<p class="credit" id="credit" data-t="credit"></p>';
  if (source.split(credit).length !== 2) throw new Error('Expected a single credit footer');
  const footer = '<p class="credit" id="credit"><span data-t="credit"></span>' +
    '<br><span id="appVersion">v' + version + '</span></p>';
  fs.writeFileSync(target, source.replace(credit, () => footer));
}

console.log('Built ' + path.relative(root, target));
