/* 捕获 web 构建运行时错误 */
const path = require('path');
const { pathToFileURL } = require('url');

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (e) {
    try {
      ({ chromium } = require('playwright-core'));
    } catch (e2) {
      console.log('NO_PLAYWRIGHT');
      process.exit(2);
    }
  }
  const url = pathToFileURL(path.resolve(__dirname, '../build/web-mobile/index.html')).href;
  console.log('open', url);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (msg) => logs.push(msg.type() + ': ' + msg.text()));
  page.on('pageerror', (err) => logs.push('PAGEERROR: ' + err.message + '\n' + err.stack));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => logs.push('GOTO: ' + e.message));
  await page.waitForTimeout(4000);
  console.log('--- logs ---');
  for (const l of logs) console.log(l);
  await page.screenshot({ path: path.resolve(__dirname, '../output-run.png'), fullPage: true }).catch(() => {});
  await browser.close();
}

main().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
