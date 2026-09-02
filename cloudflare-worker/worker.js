// Kantine Dish-Images Worker — serverseitige Bing-Bildersuche.
// Googles Bilder-Tab liefert an Server-IPs nur noch eine JS-Shell (keine
// Bild-URLs im HTML), Bings HTML ist dagegen stabil scrapebar: jede
// Ergebnis-Kachel trägt ein m="{...}"-Attribut mit der Original-Bild-URL
// (murl, HTML-entity-kodiert).
//
// GET https://<worker>.workers.dev/?q=Wiener%20Schnitzel&hl=de
// -> { "query": "...", "hl": "de", "engine": "bing", "count": 5,
//      "images": [{ "url": "https://..." }] }

const BING_IMAGES_URL = 'https://www.bing.com/images/search?q={q}&form=HDRSC2&first=1&setlang={hl}&cc=AT';
const MURL_REGEX = /murl&quot;:&quot;([^&]+)&quot;/g;
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

function decodeHtmlEntities(text) {
    return text
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
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

        const bingUrl = BING_IMAGES_URL
            .replace('{q}', encodeURIComponent(query.trim()))
            .replace('{hl}', hl);

        let html = '';
        try {
            const response = await fetch(bingUrl, {
                headers: {
                    'User-Agent': BROWSER_UA,
                    'Accept-Language': `${hl}-AT,${hl};q=0.9`,
                    'Accept': 'text/html,application/xhtml+xml'
                }
            });
            html = await response.text();
        } catch (e) {
            return jsonResponse({ error: `bing scrape failed: ${e.message}`, images: [] }, 502);
        }

        const seen = new Set();
        const images = [];
        for (const match of html.matchAll(MURL_REGEX)) {
            const decoded = decodeHtmlEntities(match[1]);
            if (!/^https:\/\//.test(decoded) || seen.has(decoded)) continue;
            seen.add(decoded);
            images.push({ url: decoded, license: '', creator: '' });
            if (images.length >= 5) break;
        }

        return jsonResponse({ query: query.trim(), hl, engine: 'bing', count: images.length, images });
    }
}
