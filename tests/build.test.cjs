const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { version } = require('../package.json');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/index.html'));

function build(...args) {
  const result = spawnSync(process.execPath, ['tools/build.cjs', ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
}

test('Baseline build preserves all source bytes', () => {
  build('--baseline');
  assert.deepEqual(fs.readFileSync(path.join(root, 'build/baseline/index.html')), source);
});

test('Deployment adds the package version to the credits and preserves the app source', () => {
  build();
  const output = fs.readFileSync(path.join(root, 'build/deploy/index.html'), 'utf8');
  const footer = '<p class="credit" id="credit"><span data-t="credit"></span>' +
    '<br><span id="appVersion">v' + version + '</span></p>';
  assert.equal(output.split(footer).length, 2);
  assert.deepEqual(Buffer.from(output.replace(footer, '<p class="credit" id="credit" data-t="credit"></p>')), source);
  for (const [, script] of output.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (script.trim()) new vm.Script(script);
  }
});

test('Cloudflare serves the deployable build and enables branch previews', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8'));
  assert.equal(config.name, 'lets-get-cohesive');
  assert.equal(config.assets.directory, './build/deploy');
  assert.equal(config.preview_urls, true);
  assert.deepEqual(config.previews, {});
});
