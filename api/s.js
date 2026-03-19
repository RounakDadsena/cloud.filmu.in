// Link shortener - no DB needed
// Encodes: title|provider|year|type|posterUrl|redirectto
// into base64url, packed as /s?d=BASE64
// App sends to /s?d=... , we decode and render share page

function b64decode(str) {
  // base64url to base64
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64').toString('utf8');
}

export default function handler(req, res) {
  const { d } = req.query;
  if (!d) return res.status(400).send('Missing data');

  let parts;
  try {
    const decoded = b64decode(d);
    parts = decoded.split('|');
  } catch(e) {
    return res.status(400).send('Invalid data');
  }

  const [title='', provider='', year='', type='', poster='', redirectto=''] = parts;

  // Build proxy poster URL
  const proxyPoster = poster
    ? `https://cloud.filmu.in/api/img?url=${encodeURIComponent(poster)}`
    : '';

  const e = s => String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const sTitle    = e(title);
  const sProvider = e(provider);
  const sYear     = e(year);
  const sType     = e(type);
  const sPoster   = e(proxyPoster);
  const desc      = [provider ? `via ${provider}` : '', type, year].filter(Boolean).join(' · ');
  const ogDesc    = e(desc ? `${desc} — Watch on FilmUmovies` : 'Watch on FilmUmovies');
  const pageUrl   = e(`https://cloud.filmu.in/s?d=${d}`);

  const html = `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sTitle} — FilmUmovies</title>

  <meta property="og:type"              content="video.movie">
  <meta property="og:site_name"         content="FilmUmovies">
  <meta property="og:title"             content="${sTitle}">
  <meta property="og:description"       content="${ogDesc}">
  <meta property="og:url"               content="${pageUrl}">
  ${sPoster ? `
  <meta property="og:image"             content="${sPoster}">
  <meta property="og:image:secure_url"  content="${sPoster}">
  <meta property="og:image:type"        content="image/jpeg">
  <meta property="og:image:width"       content="500">
  <meta property="og:image:height"      content="750">
  <meta property="og:image:alt"         content="${sTitle}">` : ''}

  <meta name="twitter:card"             content="${sPoster ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title"            content="${sTitle}">
  <meta name="twitter:description"      content="${ogDesc}">
  ${sPoster ? `<meta name="twitter:image" content="${sPoster}">
  <meta name="twitter:image:alt"        content="${sTitle}">` : ''}

  <meta name="description"              content="${ogDesc}">

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',system-ui,sans-serif;background:#080808;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .bg{position:fixed;top:-200px;left:50%;transform:translateX(-50%);width:600px;height:400px;background:radial-gradient(ellipse,rgba(220,30,30,0.12) 0%,transparent 70%);pointer-events:none}
    .wrap{position:relative;z-index:1;padding:32px 20px 36px;max-width:400px;width:95%;display:flex;flex-direction:column;align-items:center;gap:20px}
    .logo{font-size:26px;font-weight:700;letter-spacing:-0.8px}
    .logo span{color:#e01e1e}
    .card{background:#111;border:1px solid #1a1a1a;border-radius:16px;padding:16px;display:flex;gap:14px;width:100%;align-items:flex-start}
    .poster{width:80px;height:120px;border-radius:10px;object-fit:cover;background:#1a1a1a;flex-shrink:0}
    .poster-ph{width:80px;height:120px;border-radius:10px;background:#111;border:1px solid #1e1e1e;flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .poster-ph svg{width:26px;height:26px;opacity:0.2;stroke:#fff;fill:none;stroke-width:1.5}
    .meta{display:flex;flex-direction:column;gap:7px;flex:1;min-width:0;padding-top:2px}
    .mtitle{font-size:16px;font-weight:600;line-height:1.35;color:#fff}
    .badges{display:flex;gap:5px;flex-wrap:wrap}
    .badge{font-size:10px;padding:3px 8px;border-radius:6px;font-weight:500}
    .bp{background:#e01e1e22;color:#ff6b6b}
    .bm{background:#ffffff08;color:#555}
    .ring-wrap{position:relative;width:72px;height:72px}
    .ring-wrap svg{position:absolute;top:0;left:0;width:100%;height:100%;transform:rotate(-90deg)}
    .ring-bg{fill:none;stroke:#1a1a1a;stroke-width:3}
    .ring-fill{fill:none;stroke:#e01e1e;stroke-width:3;stroke-linecap:round;stroke-dasharray:201;stroke-dashoffset:0;transition:stroke-dashoffset 1s linear}
    .ring-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff}
    .status{font-size:13px;color:#444;text-align:center}
    .btn-open{display:block;width:100%;padding:13px;background:#e01e1e;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;text-align:center;transition:background .2s}
    .btn-open:hover{background:#c01818}
    .btn-dl{display:none;width:100%;padding:11px;background:#111;color:#555;border:1px solid #1e1e1e;border-radius:12px;font-size:12px;font-weight:500;text-decoration:none;text-align:center}
    .divider{font-size:10px;color:#1e1e1e;display:none}
  </style>
</head>
<body>
  <div class="bg"></div>
  <div class="wrap">
    <div class="logo">Film<span>U</span>movies</div>
    <div class="card">
      ${poster ? `<img class="poster" src="${e(poster)}" alt="${sTitle}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
      <div class="poster-ph"${poster ? ' style="display:none"' : ''}>
        <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="3"/><path d="M8 15l3-3 3 3M11 12V8"/></svg>
      </div>
      <div class="meta">
        <div class="mtitle">${sTitle}</div>
        <div class="badges">
          ${sProvider ? `<span class="badge bp">${sProvider}</span>` : ''}
          ${sType     ? `<span class="badge bm">${sType}</span>`     : ''}
          ${sYear     ? `<span class="badge bm">${sYear}</span>`     : ''}
        </div>
      </div>
    </div>
    <div class="ring-wrap">
      <svg viewBox="0 0 72 72">
        <circle class="ring-bg"   cx="36" cy="36" r="32"/>
        <circle class="ring-fill" id="ring" cx="36" cy="36" r="32"/>
      </svg>
      <div class="ring-num" id="num">7</div>
    </div>
    <div class="status" id="status">Opening in FilmUmovies...</div>
    <a class="btn-open" id="btn-open" href="#">Open FilmUmovies</a>
    <div class="divider" id="divider">App not installed?</div>
    <a class="btn-dl" id="btn-dl" href="https://download.filmu.in/movies">Download FilmUmovies</a>
  </div>
  <script>
    var TOTAL=7,count=TOTAL,circ=201;
    var ring=document.getElementById('ring');
    var numEl=document.getElementById('num');
    var statusEl=document.getElementById('status');
    var timer;
    function setRing(n){ring.style.strokeDashoffset=circ*(1-n/TOTAL);numEl.innerText=n;}
    function onExpired(){
      statusEl.innerText="Couldn't open FilmUmovies.";
      document.getElementById('btn-dl').style.display='block';
      document.getElementById('divider').style.display='block';
      setTimeout(function(){window.location.href='https://download.filmu.in/movies';},1500);
    }
    function tick(){count--;setRing(count);if(count<=0){clearInterval(timer);onExpired();}}
    function tryOpen(){
      var raw="${redirectto.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}";
      if(!raw){statusEl.innerText='Missing link.';return;}
      var decoded;
      try{decoded=decodeURIComponent(raw);}catch(e){statusEl.innerText='Invalid link.';return;}
      document.getElementById('btn-open').href=decoded;
      window.location.href=decoded;
      setRing(TOTAL);
      timer=setInterval(tick,1000);
    }
    window.onload=tryOpen;
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).send(html);
}
