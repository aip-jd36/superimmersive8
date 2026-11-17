// Retired legacy marketing pages (previous website designs): HTTP 410 Gone, no page content.
// Routed here by the exact per-directory rewrites in vercel.json. Source remains in Git history.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(410).send('410 Gone');
}
