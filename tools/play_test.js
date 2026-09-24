// Usage: bash build.sh && NODE_PATH=$(npm root -g) node tools/play_test.js output <slug> [<slug>...]
// Requires: npm install -g playwright (and a Chromium it can launch).
// Headless playthrough: for each scenario, follow a random link until a
// passage tagged "ending" (or named End*/Ending-*) is reached. Captures
// /api/track POSTs so we can confirm start + ending events fire.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const root = process.argv[2]; const slugs = process.argv.slice(3);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const tracked = [];
const srv = http.createServer((req, res) => {
  if (req.url.startsWith('/api/track')) { let b=''; req.on('data', d=>b+=d); req.on('end', ()=>{ try{tracked.push(JSON.parse(b));}catch(e){} res.writeHead(204); res.end(); }); return; }
  let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p) && fs.existsSync(p + '.html')) p += '.html';
  if (!fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
(async () => {
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const browser = await chromium.launch();
  let fail = 0;
  for (const slug of slugs) {
    for (let run = 0; run < 3; run++) {
      const ctx = await browser.newContext(); const page = await ctx.newPage();
      const errors = []; page.on('pageerror', e => errors.push(String(e).slice(0,120)));
      const before = tracked.length;
      await page.goto(`http://127.0.0.1:${port}/${slug}.html`, { waitUntil: 'load' }); await page.waitForFunction(() => window.SugarCube && SugarCube.State && SugarCube.State.passage, null, { timeout: 15000 }); await page.waitForTimeout(300);
      let steps = 0, ended = false, last = '';
      for (; steps < 80; steps++) {
        const info = await page.evaluate(() => {
          const p = SugarCube.State.passage; const ps = SugarCube.Story.get(p);
          const links = Array.from(document.querySelectorAll('#passages a.link-internal, #passages a.macro-link, #passages .link-internal')).filter(a => a.offsetParent !== null);
          return { name: p, tags: ps ? ps.tags : [], links: links.length };
        });
        last = info.name;
        if (info.tags.includes('ending') || /^End(ing)?[-_A-Z]/.test(info.name)) { ended = true; break; }
        if (!info.links) break;
        const idx = Math.floor(Math.random() * info.links);
        await page.evaluate(i => { const links = Array.from(document.querySelectorAll('#passages a.link-internal, #passages a.macro-link, #passages .link-internal')).filter(a => a.offsetParent !== null); links[i].click(); }, idx);
        await page.waitForTimeout(150);
      }
      await page.waitForTimeout(400);
      const ev = tracked.slice(before);
      const hasStart = ev.some(e => e.type === 'start' && e.scenario === slug);
      const hasEnd = ev.some(e => e.type === 'ending' && e.scenario === slug && e.ending === last);
      const hasVisit = ev.some(e => e.type === 'visit' && e.visitor);   // fresh context = new visitor
      const passages = ev.filter(e => e.type === 'passage' && e.scenario === slug).length;
      const hasVersion = ev.some(e => e.type === 'start' && /^[0-9a-f]{10}$/.test(e.version || ''));
      const ok = ended && hasStart && hasEnd && hasVisit && passages >= steps && hasVersion && errors.length === 0;
      if (!ok) fail++;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${slug} run${run} steps=${steps} last=${last} ended=${ended} start=${hasStart} endEvt=${hasEnd} visit=${hasVisit} passages=${passages} version=${hasVersion} errors=${errors.length}${errors.length ? ' ' + errors[0] : ''}`);
      await ctx.close();
    }
  }
  await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})();
