// Kantine Dish-Images Worker — serverseitiger Chefkoch-Rezeptfoto-Scrape.
// Rezeptseiten liefern exakte Gerichts-Treffer (echte Rezeptfotos statt
// Suchmaschinen-Müll). Chefkoch serves vollständiges HTML an Server-IPs und
// erlaubt Hotlinking seiner CDN-Bilder ohne Referer-Prüfung.
//
// Deutsche Rezeptseiten werden IMMER mit dem deutschen Gerichtsnamen gesucht
// (Parameter qde; englische Begriffe liefern auf chefkoch.de falsche Treffer).
// Bilder erhalten einen Relevanz-Score: Token-Überlappung zwischen Suchquery
// und Rezept-Slug, absteigend sortiert.
//
// GET https://<worker>.workers.dev/?q=roast%20pork&qde=Schweinebraten&hl=en
// -> { "query": "...", "searchQuery": "...", "engine": "chefkoch", "count": 5,
//      "images": [{ "url": "...", "license": "Chefkoch", "creator": "chefkoch.de",
//                   "title": "Schweinebraten ...", "score": 2 }] }
//
// Weitere Quellen: eine fetchFrom<X>()-Scrape-Funktion ergänzen und in der
// Merge-Logik sammeln (z. B. gutekueche.at — deren Suche läuft aktuell
// clientseitig und ist nicht GET-scrapebar; Stand: 2026-09).

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

function slugTokensFromUrl(imageUrl) {
    const file = (imageUrl.split('/').pop() || '').replace(/\.jpg$/i, '');
    return file.split('-').filter(Boolean);
}

function relevanceScore(slugTokens, queryTokens) {
    let score = 0;
    for (const queryToken of queryTokens) {
        if (slugTokens.some(slugToken => slugToken === queryToken || slugToken.startsWith(queryToken) || queryToken.startsWith(slugToken))) score++;
    }
    return score;
}

function titleFromSlug(slugTokens) {
    return slugTokens.map(token => token.charAt(0).toUpperCase() + token.slice(1)).join(' ');
}

async function fetchFromChefkoch(searchQuery, queryTokens) {
    const searchUrl = CHEFKOCH_SEARCH_URL.replace('{q}', encodeURIComponent(searchQuery).replace(/%20/g, '+'));
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
        return [];
    }

    const seen = new Set();
    const scored = [];
    for (const match of html.matchAll(CK_IMG_REGEX)) {
        const imageUrl = match[0];
        const dedupeKey = imageUrl.split('/').slice(0, 7).join('/');
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        const slugTokens = slugTokensFromUrl(imageUrl);
        scored.push({
            url: imageUrl,
            license: 'Chefkoch',
            creator: 'chefkoch.de',
            title: titleFromSlug(slugTokens),
            score: relevanceScore(slugTokens, queryTokens)
        });
    }
    return scored;
}

export default {
    async fetch(request) {
        const url = new URL(request.url);
        const query = url.searchParams.get('q');
        const queryDe = url.searchParams.get('qde');
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

        // Deutsche Rezeptseiten suchen immer mit dem deutschen Gerichtsnamen —
        // englische Begriffe liefern dort falsche Treffer.
        const searchQuery = (queryDe && queryDe.trim().length >= 3) ? queryDe.trim() : query.trim();
        const queryTokens = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 2);

        const scored = await fetchFromChefkoch(searchQuery, queryTokens);
        scored.sort((a, b) => b.score - a.score);
        const images = scored.slice(0, 5);

        return jsonResponse({ query: query.trim(), searchQuery, hl, engine: 'chefkoch', count: images.length, images });
    }
}
