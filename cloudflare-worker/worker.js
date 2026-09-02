// Kantine Dish-Images Worker — serverseitiger Chefkoch-Rezeptfoto-Scrape.
// Rezeptseiten liefern exakte Gerichts-Treffer (echte Rezeptfotos statt
// Suchmaschinen-Müll). Chefkoch serves vollständiges HTML an Server-IPs und
// erlaubt Hotlinking seiner CDN-Bilder ohne Referer-Prüfung.
//
// GET https://<worker>.workers.dev/?q=Kartoffelgulasch&hl=de
// -> { "query": "...", "hl": "de", "engine": "chefkoch", "count": 5,
//      "images": [{ "url": "https://img.chefkoch-cdn.de/rezepte/..." }] }

const CHEFKOCH_SEARCH_URL = 'https://www.chefkoch.de/rs/s0/{q}/Rezepte.html';
const CK_IMG_REGEX = /https:\/\/img\.chefkoch-cdn\.de\/rezepte\/\d+\/bilder\/\d+\/[^"'?\s\\<>]+\.jpg/g;
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

        const searchUrl = CHEFKOCH_SEARCH_URL.replace('{q}', encodeURIComponent(query.trim()).replace(/%20/g, '+'));

        let html = '';
        try {
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': BROWSER_UA,
                    'Accept-Language': 'de-AT,de;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml'
                }
            });
            html = await response.text();
        } catch (e) {
            return jsonResponse({ error: `chefkoch scrape failed: ${e.message}`, images: [] }, 502);
        }

        const seen = new Set();
        const images = [];
        for (const match of html.matchAll(CK_IMG_REGEX)) {
            const dedupeKey = match[0].split('/').slice(0, 7).join('/');
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);
            images.push({ url: match[0], license: 'Chefkoch', creator: 'chefkoch.de' });
            if (images.length >= 5) break;
        }

        return jsonResponse({ query: query.trim(), hl, engine: 'chefkoch', count: images.length, images });
    }
}
