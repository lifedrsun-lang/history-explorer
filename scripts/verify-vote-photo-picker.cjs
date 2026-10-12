// Browser check of the same picker handler used by the teacher page.
// Uses an isolated DOM fixture; it does not log in or modify a live vote.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');
const puppeteer = require('puppeteer-core');
const chromiumModule = require('@sparticuz/chromium');
const chromium = chromiumModule.default || chromiumModule;

async function main() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'vote-picker-'));
  const fixture = path.join(folder, 'photo.png');
  fs.writeFileSync(fixture, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX5kAAAAASUVORK5CYII=', 'base64'));
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/votePhotoPicker.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
  const results = [];
  try {
    for (const mobile of [false, true]) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: mobile ? 390 : 1280, height: mobile ? 844 : 720, isMobile: mobile, hasTouch: mobile });
        await page.setContent('<style>button{padding:20px;margin:12px}</style><fieldset id="fields"><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" hidden><button id="register" type="button">사진 등록</button></fieldset>');
        await page.addScriptTag({ content: 'const exports = {};\n' + source + '\nwindow.selected = 0; window.pickerCalls = 0; const input = document.querySelector("#photo"); const button = document.querySelector("#register"); button.onclick = () => {window.pickerCalls++; exports.openVotePhotoPicker(input, button.disabled);}; input.onchange = () => {if(input.files[0]) window.selected++; input.value="";};' });
        for (let round = 1; round <= 2; round++) {
          const chooser = page.waitForFileChooser({ timeout: 5000 });
          if (mobile) await page.tap('#register'); else await page.click('#register');
          await (await chooser).accept([fixture]);
          await page.waitForFunction(value => window.selected === value, {}, round);
        }
        await page.evaluate(() => { document.querySelector('#fields').disabled = true; document.querySelector('#register').disabled = true; document.querySelector('#register').textContent = '진행 중 · 사진 잠김'; });
        if (mobile) await page.tap('#register'); else await page.click('#register');
        assert.equal(await page.evaluate(() => window.pickerCalls), 2);
        assert.equal(await page.$eval('#photo', input => input.matches(':disabled')), true);
        // Also guard against an enabled custom trigger inside a disabled fieldset.
        assert.equal(await page.evaluate(() => { let calls=0; const input=document.querySelector('#photo'); input.click=()=>{calls++;}; exports.openVotePhotoPicker(input,false); return calls; }), 0);
        assert.equal(await page.$eval('#register', button => button.textContent), '진행 중 · 사진 잠김');
        results.push({ mode: mobile ? 'touch-emulation' : 'desktop', fileChooserOpened: true, sameFileReselection: true, disabledPickerBlocked: true });
      } finally { await page.close(); }
    }
    console.log('Vote photo picker browser verification:', JSON.stringify(results));
  } finally { await browser.close(); fs.rmSync(folder, { recursive: true, force: true }); }
}
main().catch(error => { console.error('Vote photo picker verification failed:', error.message); process.exitCode = 1; });
