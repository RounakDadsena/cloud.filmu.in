const ALLOWED_HOSTS = [
  'image.tmdb.org',
  'm.media-amazon.com',
  'cdn.myanimelist.net',
  'media.kitsu.app',
  'img.anili.st',
  'simkl.in',
  's4.anilist.co',
  'artworks.thetvdb.com',
  'static.tvmaze.com',
  'upload.wikimedia.org',
  'wsrv.nl',
];

const MAX_SIZE = 5 * 1024 * 1024; // 5MB max

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url');

  let decoded;
  try { decoded = decodeURIComponent(url); } catch(e) { return res.status(400).send('Bad url'); }

  if (!/^https:\/\//i.test(decoded)) return res.status(400).send('HTTPS only');

  // SSRF protection - block private/internal IPs
  let hostname;
  try { hostname = new URL(decoded).hostname; } catch(e) { return res.status(400).send('Invalid url'); }
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) {
    return res.status(403).send('Forbidden');
  }

  // If not in allowlist, still try but with stricter timeout
  const isAllowed = ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), isAllowed ? 8000 : 5000);

    const response = await fetch(decoded, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FilmUmovies/1.0)',
        'Accept': 'image/webp,image/jpeg,image/png,image/*;q=0.8',
        'Referer': `https://${hostname}/`,
      }
    });
    clearTimeout(timeout);

    if (!response.ok) return res.status(502).send('Upstream error');

    const ct = response.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return res.status(400).send('Not an image');

    // Size guard - don't buffer huge images
    const cl = parseInt(response.headers.get('content-length') || '0');
    if (cl > MAX_SIZE) return res.status(413).send('Too large');

    const buf = await response.arrayBuffer();
    if (buf.byteLength > MAX_SIZE) return res.status(413).send('Too large');

    res.setHeader('Content-Type', ct);
    // Cache 7 days on CDN edge, 1 day in browser
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200).send(Buffer.from(buf));
  } catch(e) {
    if (e.name === 'AbortError') return res.status(504).send('Timeout');
    res.status(500).send('Proxy error');
  }
}
