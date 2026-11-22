/* =========================================================
   serve.js – server local minimal, fără dependențe.
   Pornire:  node serve.js        (implicit portul 8080)
             node serve.js 3000   (alt port)
   Apoi deschide http://localhost:8080 în browser.
   ========================================================= */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Interzis'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Nu există: ' + p); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`\n  PixelQuest rulează!  Deschide:  http://localhost:${PORT}\n`);
  // afișăm doar adaptoarele reale (fără VMware, VirtualBox, WSL, Hyper-V sau adrese 169.254.x)
  const virtual = /vmware|virtualbox|vethernet|wsl|hyper-v|loopback|bluetooth/i;
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    if (virtual.test(name)) continue;
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.') || a.address.startsWith('192.168.56.')) continue;
      console.log(`  Din telefon (aceeași rețea Wi-Fi): http://${a.address}:${PORT}`);
    }
  }
  console.log('\n  Oprește serverul cu Ctrl+C.\n');
});
