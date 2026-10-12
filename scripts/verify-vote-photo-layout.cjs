// Render the built student page with isolated vote API fixtures. No live votes are changed.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const puppeteer = require('puppeteer-core');
const chromiumModule = require('@sparticuz/chromium');
const chromium = chromiumModule.default || chromiumModule;

async function main() {
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3338'], {
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: '3338' },
  });
  let output = '';
  server.stdout.on('data', data => { output += data; });
  server.stderr.on('data', data => { output += data; });
  let browser;
  try {
    for (let i = 0; i < 60; i++) {
      if (server.exitCode !== null) throw new Error('Next start failed: ' + output.slice(-1500));
      try { if ((await fetch('http://localhost:3338/vote/2')).ok) break; } catch {}
      if (i === 59) throw new Error('Next start timed out');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
    const results = [];
    for (const [width, height] of [[1917, 910], [1366, 768], [1280, 720], [1024, 768], [390, 844]]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#cbd5e1"/><circle cx="400" cy="225" r="160" fill="#3b82f6"/></svg>');
      const vote = { slot: 2, title: 'AI일까? 실제일까?', question: '사진을 보고 실제인지 인공지능을 활용한 사진일 지 예상해 봅시다.', option1: '1번 인공지능', option2: '2번 실제영상', items: [1,2,3,4].map(id => ({ id: String(id), imageUrl: image })), counts: [12,13], countsByItem: { '1': [12,13], '2': [20,5], '3': [0,25], '4': [8,17] }, active: true, generation: 'layout-fixture', revision: 1 };
      let selected = null;
      await page.setViewport({ width, height, isMobile: width < 500, hasTouch: width < 500 });
      await page.evaluateOnNewDocument(() => { window.EventSource = class { constructor() { setTimeout(() => this.onopen?.(), 0); } addEventListener() {} close() {} }; });
      await page.setRequestInterception(true);
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname === '/api/vote') return void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ vote }) });
        if (url.pathname === '/api/vote/session') return void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'isolated-fixture', choices: {} }) });
        if (url.pathname === '/api/vote/choice') {
          selected = JSON.parse(request.postData());
          return void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ vote, choices: { [selected.itemId]: selected.choice } }) });
        }
        if (url.pathname.startsWith('/api/vote/')) return void request.abort();
        return void request.continue();
      });
      await page.goto('http://localhost:3338/vote/2', { waitUntil: 'networkidle0' });
      await page.waitForSelector('[aria-label="문항별 실시간 투표 결과"] button:not([disabled])');
      const metrics = await page.evaluate(() => {
        const grid = document.querySelector('[aria-label="문항별 실시간 투표 결과"]');
        const box = element => { const r = element.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, bottom:r.bottom, right:r.right }; };
        return { viewport: { width:innerWidth,height:innerHeight }, document: { width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight }, cards:[...grid.querySelectorAll('section')].map(box), photos:[...grid.querySelectorAll('img')].map(box), buttons:[...grid.querySelectorAll('button')].map(box), imagesLoaded:[...grid.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0), columns:getComputedStyle(grid).gridTemplateColumns };
      });
      assert.equal(metrics.cards.length, 4);
      assert.equal(metrics.buttons.length, 8);
      const labels = await page.$$eval('[aria-label="문항별 실시간 투표 결과"] button', buttons => buttons.map(button => button.textContent.trim()));
      assert.deepEqual(labels, Array.from({ length: 4 }, () => ['1번 인공지능', '2번 실제영상']).flat());
      assert.equal(await page.$$eval('[aria-label="문항별 실시간 투표 결과"] button', buttons => buttons.every(button => button.parentElement.lastElementChild === button)), true);
      assert.equal(metrics.imagesLoaded, true);
      assert.ok(metrics.document.height <= metrics.viewport.height + 1, JSON.stringify(metrics));
      assert.ok(metrics.document.width <= metrics.viewport.width + 1, JSON.stringify(metrics));
      for (const box of [...metrics.cards, ...metrics.photos, ...metrics.buttons]) {
        assert.ok(box.y >= 0 && box.x >= 0 && box.bottom <= metrics.viewport.height + 1 && box.right <= metrics.viewport.width + 1, JSON.stringify(metrics));
      }
      assert.ok(metrics.photos.every(box => box.height >= 55));
      assert.ok(metrics.buttons.every(box => box.height >= 44));
      assert.ok(Math.abs(metrics.cards[0].y - metrics.cards[1].y) < 1);
      assert.ok(Math.abs(metrics.cards[2].y - metrics.cards[3].y) < 1);
      const selector = '[aria-label="문항별 실시간 투표 결과"] section:nth-child(4) button:nth-of-type(1)';
      if (width < 500) await page.tap(selector); else await page.click(selector);
      await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('aria-pressed') === 'true', {}, selector);
      assert.equal(selected.itemId, '4');
      assert.equal(selected.choice, 1);
      assert.deepEqual(errors, []);
      results.push({ width, height, fourCardsVisible: true, twoRows: true, noPageScroll: true, photoHeight: Math.round(metrics.photos[0].height), labelsInsideButtons: true, choiceWorks: true });
      await page.close();
    }
    console.log('Vote photo layout verification:', JSON.stringify(results));
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
}
main().catch(error => { console.error('Vote photo layout verification failed:', error.stack); process.exitCode = 1; });
