// Genera los PNG del carrusel (1080x1350, formato 4:5 de Instagram).
// Uso: node render.js   → output/slide-01.png ... slide-NN.png
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const dir = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(dir, 'brands.json'), 'utf8'));
const toDataUri = f => {
  const p = path.join(dir, 'logos', f || '');
  if (!f || !fs.existsSync(p)) return null;
  const ext = path.extname(p).slice(1).toLowerCase();
  const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  return `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
};
data.pairs.forEach(p => { p._fakeSrc = toDataUri(p.fakeLogo); p._realSrc = toDataUri(p.realLogo); });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  fs.mkdirSync(path.join(dir, 'output'), { recursive: true });
  const total = data.pairs.length + 1;
  for (let i = 0; i < total; i++) {
    await page.addInitScript(`window.__DATA__=${JSON.stringify(data)};window.__INDEX__=${i};`);
    await page.goto('file://' + path.join(dir, 'template.html'), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(dir, 'output', `slide-${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: out });
    console.log('✔', out);
  }
  await browser.close();
})();
