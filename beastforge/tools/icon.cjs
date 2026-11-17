// Erzeugt icon-512.png und icon-192.png aus dem echten 3D-Modell: node beastforge/tools/icon.cjs (Server auf 8055)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); await p.goto('http://localhost:8055/index.html'); await p.waitForFunction(() => window.BF);
  const urls = await p.evaluate(async () => {
    const THREE = await import('three'); const { buildModel } = await import('./js/render/models.js');
    const S = 512, c = document.createElement('canvas'); const R = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true });
    R.setSize(S, S, false); R.outputColorSpace = THREE.SRGBColorSpace;
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x6a4a9a, 1.7)); const d = new THREE.DirectionalLight(0xfff0e0, 2.4); d.position.set(-2, 3, 3); sc.add(d); const r2 = new THREE.DirectionalLight(0xffb070, 1.6); r2.position.set(2, 1, -2); sc.add(r2);
    const m = buildModel('kitsune', { stage: 3 }); m.root.rotation.y = 0.75; m.tick(1.3, 0, {}); sc.add(m.root);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20); cam.position.set(0, 1.0, 3.0); cam.lookAt(0, 0.62, 0);
    R.setClearColor(0, 0); R.render(sc, cam);
    const o = document.createElement('canvas'); o.width = o.height = S; const g = o.getContext('2d');
    const bg = g.createRadialGradient(S / 2, S * 0.42, 20, S / 2, S / 2, S * 0.75); bg.addColorStop(0, '#ff9a4a'); bg.addColorStop(0.45, '#8a3aa8'); bg.addColorStop(1, '#1a1030'); g.fillStyle = bg; g.fillRect(0, 0, S, S);
    g.globalAlpha = 0.25; g.fillStyle = '#fff2c8'; g.beginPath(); g.arc(S / 2, S * 0.5, S * 0.36, 0, 7); g.fill(); g.globalAlpha = 1;
    g.drawImage(c, 0, 0);
    const s1 = o.toDataURL('image/png'); const q = document.createElement('canvas'); q.width = q.height = 192; q.getContext('2d').drawImage(o, 0, 0, 192, 192);
    return [s1, q.toDataURL('image/png')];
  });
  fs.writeFileSync(path.join(__dirname, '../icon-512.png'), Buffer.from(urls[0].split(',')[1], 'base64'));
  fs.writeFileSync(path.join(__dirname, '../icon-192.png'), Buffer.from(urls[1].split(',')[1], 'base64'));
  await b.close(); console.log('Icons geschrieben');
})();
