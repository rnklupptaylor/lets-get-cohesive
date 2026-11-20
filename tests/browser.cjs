const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { version } = require('../package.json');

const address = pathToFileURL(path.resolve(__dirname, '../build/deploy/index.html')).href;
const options = process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {};

async function main() {
  const browser = await chromium.launch(options);
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const desktopErrors = [];
    const page = await desktop.newPage();
    page.on('pageerror', error => desktopErrors.push(error.message));
    await page.goto(address);
    assert.equal(await page.locator('#welcomeGrid button').count(), 9);
    await page.locator('#welcome-default').click();
    assert.equal(await page.locator('#welcomeDialog').isVisible(), false);
    const canvas = page.locator('.floor-wrap');
    const canvasBefore = await canvas.boundingBox();
    await page.locator('#mTabs [data-tab="key"]').click();
    assert.equal(await page.locator('#appVersion').textContent(), 'v' + version);
    assert.equal(await page.locator('#appVersion').isVisible(), true);
    assert.deepEqual(await canvas.boundingBox(), canvasBefore);
    await page.locator('#mTabs [data-tab="coh"]').click();
    await page.locator('#liquidAdvancedTitle').click();
    await page.locator('#liquidCustomize').click();
    assert.equal(await page.locator('#liquidSelect').inputValue(), 'custom');
    assert.equal(await page.locator('#coh').isVisible(), true);
    assert.equal(await page.locator('#pol').isVisible(), true);
    await page.locator('#pol').fill('45');
    assert.match(await page.locator('#polVal').textContent(), /0\.45/);
    assert.deepEqual(desktopErrors, []);
    await desktop.close();
    console.log('Desktop start, version footer, fixed canvas and custom controls passed');

    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      acceptDownloads: true,
    });
    const mobileErrors = [];
    const phone = await mobile.newPage();
    phone.on('pageerror', error => mobileErrors.push(error.message));
    await phone.goto(address);
    await phone.locator('#welcomeDe').click();
    await phone.locator('#welcome-water-oil').click();
    await phone.locator('#mTabs [data-tab="data"]').click();
    assert.equal(await phone.locator('#dropCanvas').isVisible(), true);
    assert.match(await phone.locator('#dropSelectionNote').textContent(), /Gleiche A\/B/);
    await phone.locator('#mTabs [data-tab="coh"]').click();
    await phone.locator('#liquidMixB').selectOption('liqWater');
    await phone.locator('#mTabs [data-tab="data"]').click();
    assert.equal(await phone.locator('#dropCanvas').isVisible(), false);
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await phone.locator('#mTabs [data-tab="record"]').click();
    await phone.locator('#recDuration').fill('1');
    await phone.locator('#recNew').click();
    await phone.locator('#recStart').click();
    await phone.waitForFunction(() => document.querySelector('#recPoint').options.length >= 2, null, { timeout: 20000 });
    await phone.locator('#recStart').click();
    assert.equal(await phone.locator('#recCSV').isEnabled(), true);
    assert.equal(await phone.locator('#recPNG').isEnabled(), true);
    assert.ok(await phone.locator('#recPlot').evaluate(canvas => canvas.toDataURL('image/png').length > 2000));
    assert.deepEqual(mobileErrors, []);
    await mobile.close();
    console.log('Mobile German UI, droplet chart, same-liquid case and live recorder passed');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
