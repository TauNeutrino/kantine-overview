// Kantine Dish-Images Worker — serverseitiger Google-Bildersuche-Scrape.
// Liefert sauberes JSON mit Thumbnail-URLs, damit das Bookmarklet keine
// öffentlichen CORS-Proxys mehr braucht.
//
// GET https://<worker>.workers.dev/?q=Wiener%20Schnitzel&hl=de
// -> { "query": "...", "count": 5, "images": [{ "url": "https://encrypted-tbn0.gstatic.com/..." }] }

const GOOGLE_SCRAPE_URL = 'https://www.google.com/search?q={q}&tbm=isch&hl={hl}&gl=at&ijn=0';
const THUMB_REGEX = /https:\/\/encrypted-tbn\d*\.gstatic\.com\/images\?q=tbn:[A-Za-z0-9_\-]+[^"'\s\\<>]*/g;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}

export default {
    async fetch(request) {
        const url = new URL(request.url);
        const query = url.searchParams.get('q');
        const hl = url.searchParams.get('hl') === 'en' ? 'en' : 'de';

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS'
                }
            });
        }
        if (request.method !== 'GET' || !query || query.trim().length < 3) {
            return jsonResponse({ error: 'missing or too-short q parameter' }, 400);
        }

        const scrapeUrl = GOOGLE_SCRAPE_URL
            .replace('{q}', encodeURIComponent(query.trim()))
            .replace('{hl}', hl);

        let html = '';
        try {
            const response = await fetch(scrapeUrl, {
                headers: {
                    'User-Agent': BROWSER_UA,
                    'Accept-Language': `${hl}-AT,${hl};q=0.9`,
                    'Accept': 'text/html,application/xhtml+xml'
                }
            });
            html = await response.text();
        } catch (e) {
            return jsonResponse({ error: `google scrape failed: ${e.message}`, images: [] }, 502);
        }

        const seen = new Set();
        const images = [];
        for (const match of html.match(THUMB_REGEX) || []) {
            const decoded = match.replace(/&amp;/g, '&');
            if (seen.has(decoded)) continue;
            seen.add(decoded);
            images.push({ url: decoded, license: '', creator: '' });
            if (images.length >= 5) break;
        }

        return jsonResponse({ query: query.trim(), hl, count: images.length, images });
    }
}
