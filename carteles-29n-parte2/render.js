// Genera los PNG del carrusel (1080x1350, 4:5 de Instagram).
// Uso: node render.js   → output/slide-01.png ... slide-NN.png
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const dir = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(dir, 'carteles.json'), 'utf8'));

// Incrusta cada cartel como data URI junto con su proporción (ancho/alto)
const imgs = {};
for (const f of fs.readdirSync(path.join(dir, 'carteles'))) {
  const p = path.join(dir, 'carteles', f);
  const buf = fs.readFileSync(p);
  // PNG: ancho y alto en la cabecera IHDR
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  imgs[f] = { src: `data:image/png;base64,${buf.toString('base64')}`, ratio: w / h };
}
data._imgs = imgs;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  fs.mkdirSync(path.join(dir, 'output'), { recursive: true });
  const total = data.items.length + 2;
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
