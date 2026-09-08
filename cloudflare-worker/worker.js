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
// Merge-Logik (Promise.all) sammeln. Getestet und NICHT GET-scrapebar
// (Stand: 2026-09): gutekueche.at + kochbar.de (Suche clientseitig,
// ?search= filtert nicht), lecker.de (JS-gerendert), Google/Bing/DDG/Yandex
// (bot-geblockt für Server-IPs).

const CHEFKOCH_SEARCH_URL = 'https://www.chefkoch.de/rs/s0/{q}/Rezepte.html';
const CK_IMG_REGEX = /https:\/\/img\.chefkoch-cdn\.de\/rezepte\/\d+\/bilder\/\d+\/[^"'?\s\\<>]+\.jpg/g;
const KOCHBAR_SEARCH_URL = 'https://www.kochbar.de/rezepte/{q}.html';
const KB_IMG_REGEX = /https:\/\/ais\.kochbar\.de\/kbrezept\/([^\/\s"']+?)\/\d+x\d+\/([^"'\s\\<>]+\.jpg)/g;
const KB_IMAGE_SIZE = '460x345';
const EATSMARTER_SEARCH_URL = 'https://eatsmarter.de/suche/rezepte?ft={q}';
const ES_IMG_REGEX = /https:\/\/images\.eatsmarter\.de\/sites\/default\/files\/styles\/300x225-webp\/public\/([^"'?\s\\<>]+\.jpg)/g;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Revision marker — bump on every worker change so live deployments are
// verifiable with one curl (Cloudflare auto-deploy can lag or fail silently).
const WORKER_REV = '2026-09-08-at-synonyms';

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

function normalizeToken(token) {
    return token.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

// Austrian dish vocabulary mapped to standard German — the canteen menu
// uses Austrian names (Rindsbraten, Erdäpfel, Paradeiser) while recipe sites
// mostly use standard spellings (Rinderbraten, Kartoffel, Tomate).
const AUSTRIAN_FOOD_SYNONYMS = {
    rindsbraten: 'rinderbraten', hendl: 'haehnchen', hendel: 'haehnchen',
    erdaepfel: 'kartoffel', paradeiser: 'tomate', fisolen: 'bohnen',
    marillen: 'aprikosen', topfen: 'quark', palatschinken: 'pfannkuchen',
    semmel: 'broetchen', schlagobers: 'sahne', obers: 'sahne', rahm: 'sahne',
    eierschwammerl: 'pfifferlinge', karfiol: 'blumenkohl', kraut: 'kohl',
    vogerlsalat: 'feldsalat', ribisel: 'johannisbeeren', powidl: 'pflaumenmus',
    germ: 'hefe', staubzucker: 'puderzucker', stelze: 'haxe', beuschel: 'lunge',
    // Vegetarische Proteine und englische Menü-Begriffe — verhindern, dass
    // "Soja-Tikka" auf Chicken-Tikka-Rezepte zeigt (Protein-Äquivalenz unten).
    tofu: 'soja', chicken: 'haehnchen', beef: 'rind', pork: 'schwein',
    turkey: 'puten', salmon: 'lachs', huhn: 'haehnchen', huehner: 'haehnchen',
    // Österreichisch → standardsprachlich (chefkoch-Probe 2026-09: melanzani
    // 0/39, kren 2/41, semmelkren 3/41, schopfsteak 0/19 on-topic Bilder)
    melanzani: 'aubergine', kren: 'meerrettich', semmelkren: 'meerrettich',
    schopfsteak: 'schweinenackensteak', schweinsschopf: 'schweinenackensteak',
    faschiertes: 'hackfleisch', faschierte: 'hackfleisch', faschiertem: 'hackfleisch',
    wuerstel: 'wuerstchen', kaeferbohnen: 'bohnen', kaeferbohne: 'bohne',
    geselchtes: 'speck', eierschoeberl: 'eierknoedel', rotkraut: 'rotkohl',
    jungzwiebel: 'fruehlingszwiebeln', schnitzerl: 'schnitzel',
    sauerrahm: 'schmand', depreziner: 'debreziner'
};

// Generische Menü-Zeilen ("Suppe, kleiner Salat + Dessert", "Kleine
// Hauptspeise von Menü 3") enthalten keinen Gerichtsnamen — für sie gibt es
// kein sinnvolles Rezeptfoto, der Worker liefert leer (Client zeigt den
// "Bei Google öffnen"-Fallback statt eines beliebigen Gerichts).
const GENERIC_QUERY_WORDS = new Set([
    'suppe', 'salat', 'dessert', 'nachspeise', 'hauptspeise', 'vorspeise',
    'menue', 'tagesmenue', 'tagesmenu', 'menueplan', 'kombination',
    'kleiner', 'kleine', 'grosser', 'grosse', 'mit', 'und', 'oder', 'von', 'vom',
    'beilage', 'beilagen', 'mix'
]);

// Nach einem Seitenindikator ("mit X") behalten diese Wortendlichungen volles
// Gewicht: Es sind Bestandteile des Gerichts selbst (Rahmsauce, Erbsenreis,
// Spinatspätzle), keine Beilagen. Echte Beilagen (Dip, Semmel, Salat) bleiben
// bei 0.25, damit ein beilage-lastiger Treffer nicht das eigentliche Gericht
// verdrängt.
const CORE_DISH_SUFFIXES = [
    'sauce', 'sosse', 'nudeln', 'nudel', 'reis', 'ragout', 'curry', 'spaetzle',
    'gulasch', 'auflauf', 'eintopf', 'pueeree', 'polenta', 'knoedel',
    'schmarren', 'ramen', 'suppe', 'pizza', 'pasta', 'gnocchi', 'bowl'
];

// Protein-Stämme für zwei Zwecke: (1) volles Gewicht nach "mit" ("mit Huhn",
// "mit Rindfleisch" ist integral, keine Beilage), (2) Protein-Konflikt-Penalty
// (Soja-Gericht darf nicht mit einem Chicken-Foto beantwortet werden).
const PROTEIN_STEMS = [
    'haehnchen', 'hendl', 'huenchen', 'puten', 'rind', 'kalb', 'schwein',
    'lachs', 'forelle', 'seehecht', 'hecht', 'kabeljau', 'garnelen', 'scampi',
    'thunfisch', 'soja', 'fleisch'
];

function canonicalToken(token) {
    const normalized = normalizeToken(token);
    return AUSTRIAN_FOOD_SYNONYMS[normalized] || normalized;
}

// Synonym-Gruppe für Komposita: "Grillhendl" enthält "hendl" → Gruppe
// "haehnchen". Direkte Tabellen-Treffer und Werte derselben Gruppe gelten als
// gleich ("hendl" ≡ "haehnchen" ≡ "grillhendl" ≡ "grillhaehnchen").
function synonymGroup(normalized) {
    if (AUSTRIAN_FOOD_SYNONYMS[normalized]) return AUSTRIAN_FOOD_SYNONYMS[normalized];
    for (const [key, value] of Object.entries(AUSTRIAN_FOOD_SYNONYMS)) {
        if (key.length >= 4 && normalized.endsWith(key)) return value;
    }
    for (const value of Object.values(AUSTRIAN_FOOD_SYNONYMS)) {
        if (value.length >= 4 && normalized.endsWith(value)) return value;
    }
    return null;
}

function proteinGroup(normalized) {
    const mapped = AUSTRIAN_FOOD_SYNONYMS[normalized] || normalized;
    for (const stem of PROTEIN_STEMS) {
        const canonicalStem = AUSTRIAN_FOOD_SYNONYMS[stem] || stem;
        if (mapped === canonicalStem) return canonicalStem;
        if (canonicalStem.length >= 4 && (mapped.endsWith(canonicalStem) || mapped.startsWith(canonicalStem))) return canonicalStem;
    }
    return null;
}

function tokensEquivalent(queryToken, slugToken) {
    if (queryToken === slugToken) return true;
    const group = synonymGroup(queryToken);
    return group !== null && group === synonymGroup(slugToken);
}

// Side-dish indicators: from the first indicator on, German dish suffixes
// ("mit X", "dazu", "als Beilage", ...) weigh only a quarter — a side-heavy
// slide must not outrank the pure main dish.
const SIDE_INDICATORS = ['mit', 'an', 'dazu', 'beilage', 'beilagen', 'garnitur', 'garniert', 'serviert'];

function queryTokenWeights(queryTokens) {
    const weights = [];
    let side = false;
    for (const token of queryTokens) {
        if (SIDE_INDICATORS.includes(token)) side = true;
        weights.push(side && !isCoreDishToken(token) ? 0.25 : 1);
    }
    return weights;
}

function isCoreDishToken(token) {
    if (PROTEIN_STEMS.some(stem => token === stem || (stem.length >= 4 && token.endsWith(stem)))) return true;
    return CORE_DISH_SUFFIXES.some(suffix => token.endsWith(suffix));
}

function partialMatchWeight(slugTokens, queryToken) {
    const normalized = canonicalToken(queryToken);
    if (normalized.length < 4) return 0;
    for (const raw of slugTokens) {
        const slugToken = canonicalToken(raw);
        if (slugToken.length < 4) continue;
        if (slugToken.includes(normalized) || normalized.includes(slugToken)) return 0.5;
        // 1-Zeichen-Typo-Toleranz für lange Wörter (Menü-Schreibweise
        // "geschmorrtes" vs Rezept-Slug "geschmortes", verdoppelte Buchstaben)
        if (normalized.length >= 6 && oneCharDeletionMatch(normalized, slugToken)) return 0.5;
    }
    return 0;
}

// Joined-containment: Komposita über mehrere Slug-Tokens ("gemuese" +
// "strudel" ≈ Query-Wort "gemuesestrudel") bekommen einen Bonus. Fugen-Buchstabe
// (Gemüse-s-Strudel) wird toleriert (≤1 Zeichen Differenz). Nur für Query-Tokens,
// die KEIN einzelnes Slug-Token sind (sonst doppelt zum exakten Treffer).
function oneCharDeletionMatch(a, b) {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) !== 1) return false;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    for (let i = 0; i < longer.length; i++) {
        if (longer.slice(0, i) + longer.slice(i + 1) === shorter) return true;
    }
    return false;
}

function joinedCompoundBonus(slugTokens, queryTokens) {
    for (let start = 0; start < slugTokens.length; start++) {
        let joined = slugTokens[start];
        for (let end = start + 1; end < Math.min(start + 3, slugTokens.length); end++) {
            joined += slugTokens[end];
            if (joined.length < 6) continue;
            for (const qt of queryTokens) {
                if (qt.length >= 6 && !slugTokens.includes(qt) && oneCharDeletionMatch(qt, joined)) return 3;
            }
        }
    }
    return 0;
}

function relevanceScore(slugTokens, queryTokens) {
    const slug = slugTokens.map(canonicalToken);
    const query = queryTokens.map(canonicalToken);
    const weights = queryTokenWeights(query);
    let exact = 0;
    const matched = new Set();
    for (let i = 0; i < query.length; i++) {
        if (slug.includes(query[i])) {
            exact += weights[i];
            matched.add(query[i]);
        } else if (slug.some(slugToken => tokensEquivalent(query[i], slugToken))) {
            exact += weights[i];
            matched.add(query[i]);
        } else if (partialMatchWeight(slug, query[i]) > 0) {
            exact += weights[i] * 0.5;
            matched.add(query[i]);
        }
    }
    let orderedPairs = 0;
    for (let i = 0; i + 1 < query.length; i++) {
        for (let j = i + 1; j < query.length; j++) {
            const first = slugIndexOf(slug, query[i]);
            const second = slugIndexOf(slug, query[j]);
            if (first >= 0 && second > first) orderedPairs += Math.min(weights[i], weights[j]);
        }
    }
    const extraSlugTokens = slug.length - matched.size;
    const firstTokenBonus = (slug.length > 0 && query.length > 0 && tokensEquivalent(slug[0], query[0])) ? weights[0] : 0;
    const contiguousBonus = slug.join(' ').includes(query.join(' ')) ? 4 : 0;
    let score = 2 * exact + 2 * orderedPairs - 0.5 * extraSlugTokens + firstTokenBonus + contiguousBonus + joinedCompoundBonus(slug, query);

    // Protein-Konflikt: Query nennt ein Protein, der Slug ein anderes
    // ("Soja-Tikka" vs "chicken-tikka") — strafegal, falsches Gerichtsfoto.
    const queryProteins = new Set(query.map(proteinGroup).filter(Boolean));
    const slugProteins = new Set(slug.map(proteinGroup).filter(Boolean));
    if (queryProteins.size > 0 && slugProteins.size > 0 &&
        ![...queryProteins].some(p => slugProteins.has(p))) {
        score -= 1.5;
    }
    // Ernährungs-Konflikt: veganer/vegetarischer Slug ohne entsprechende Query
    // ("Penne Bolognese" ≠ "Penne mit veganer Sauce Bolognese").
    const slugText = slug.join(' ');
    const queryText = query.join(' ');
    if (/\b(vegan|vegetarisch)/.test(slugText) && !/\b(vegan|vegetarisch)/.test(queryText)) {
        score -= 2.5;
    }
    return score;
}

function slugIndexOf(slug, token) {
    for (let i = 0; i < slug.length; i++) {
        if (tokensEquivalent(slug[i], token)) return i;
    }
    return -1;
}

function titleFromSlug(slugTokens) {
    return slugTokens.map(token => token.charAt(0).toUpperCase() + token.slice(1)).join(' ');
}

function searchCandidates(query) {
    const words = String(query).trim().split(/\s+/).filter(Boolean);
    const candidates = [String(query).trim()];
    if (words.length >= 2) candidates.push(words.slice(0, 2).join(' '));
    if (words.length >= 1) candidates.push(words[0]);
    return [...new Set(candidates)].filter(candidate => candidate.length >= 3);
}

// Wortweise kanonisierte Suchvariante: Tabellenwörter werden ersetzt
// ("Melanzani" -> "aubergine", "frisches Grillhendl" -> "grillhaehnchen") —
// die Original-Suche läuft zuerst, die kanonisierte Variante eskaliert nur,
// wenn deren Pool das Quality-Gate verfehlt. Direkte AT-Wörter sind auf
// chefkoch durchwegs schlecht indexiert (melanzani 0/39, kren 2/41,
// semmelkren 3/41 on-topic).
function canonicalSearchVariant(query) {
    const words = String(query).trim().split(/\s+/).filter(Boolean);
    const mapped = words.map(word => {
        const normalized = normalizeToken(word);
        if (AUSTRIAN_FOOD_SYNONYMS[normalized]) return AUSTRIAN_FOOD_SYNONYMS[normalized];
        for (const [key, value] of Object.entries(AUSTRIAN_FOOD_SYNONYMS)) {
            if (key.length >= 4 && normalized.endsWith(key)) return normalized.slice(0, normalized.length - key.length) + value;
        }
        return word;
    });
    const out = mapped.join(' ');
    return out === String(query).trim() ? null : out;
}

// Original-Kandidaten und kanonisierte Varianten positionsweise verzahnt:
// [full, full-kanonisch, 2 Wörter, 2 Wörter kanonisch, 1 Wort, 1 Wort kanonisch]
function mergedSearchCandidates(query) {
    const canonical = canonicalSearchVariant(query);
    const primary = searchCandidates(query);
    if (!canonical) return primary;
    const secondary = searchCandidates(canonical);
    const merged = [];
    for (let i = 0; i < Math.max(primary.length, secondary.length); i++) {
        if (primary[i]) merged.push(primary[i]);
        if (secondary[i]) merged.push(secondary[i]);
    }
    return [...new Set(merged)];
}

// Quality-Gate: Ein Candidate-Pool wird nur akzeptiert, wenn der beste Score
// (immer gegen die VOLLE Gerichts-Query gerechnet, nicht gegen den
// verkürzten Candidate) einen echten Kern-Token-Treffer enthält. Sonst
// eskaliert die Suche zum nächsten (kürzeren/kanonisierten) Candidate, statt
// Junk-Bilder eines verfeinerten Voll-Query-Treffers zu liefern. 1.25 weil
// ein einzelner exakter Kern-Token durch Extra-Strafen bis auf 1.5 fallen
// kann ("Riz Casimir"), während Junk (nur Partials/Beilagen-Tokens) ≤ 1.0 bleibt.
const SEARCH_QUALITY_GATE = 1.25;

function bestPoolScore(scored) {
    return scored.reduce((max, entry) => Math.max(max, entry.score), -Infinity);
}

function candidateTokens(candidate) {
    return candidate.toLowerCase().split(/[\s-]+/).filter(word => word.length >= 2);
}

function slugifySearchQuery(query) {
    return query
        .toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

async function fetchFromChefkoch(searchQuery, scoringTokens) {
    for (const candidate of mergedSearchCandidates(searchQuery)) {
        const tokens = scoringTokens;
        const searchUrl = CHEFKOCH_SEARCH_URL.replace('{q}', encodeURIComponent(candidate).replace(/%20/g, '+'));
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
            continue;
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
                score: relevanceScore(slugTokens, tokens)
            });
        }
        if (scored.length >= 1 && bestPoolScore(scored) >= SEARCH_QUALITY_GATE) return scored;
    }
    return [];
}

async function fetchFromKochbar(searchQuery, scoringTokens) {
    for (const candidate of mergedSearchCandidates(searchQuery)) {
        const tokens = scoringTokens;
        const slug = slugifySearchQuery(candidate);
        if (slug.length < 3) continue;
        const searchUrl = KOCHBAR_SEARCH_URL.replace('{q}', slug);
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
            continue;
        }

        const seen = new Set();
        const scored = [];
        for (const match of html.matchAll(KB_IMG_REGEX)) {
            const kbrezeptId = match[1];
            const file = match[2];
            if (file.includes('@')) continue;
            if (seen.has(kbrezeptId)) continue;
            seen.add(kbrezeptId);
            const imageUrl = `https://ais.kochbar.de/kbrezept/${kbrezeptId}/${KB_IMAGE_SIZE}/${file}`;
            const slugTokens = file.replace(/\.jpg$/i, '').replace(/-rezept$/, '').split('-').filter(Boolean);
            scored.push({
                url: imageUrl,
                license: 'Kochbar',
                creator: 'kochbar.de',
                title: titleFromSlug(slugTokens),
                score: relevanceScore(slugTokens, tokens),
                source: 'kochbar'
            });
        }
        if (scored.length >= 1 && bestPoolScore(scored) >= SEARCH_QUALITY_GATE) return scored;
    }
    return [];
}

async function fetchFromEatsmarter(searchQuery, scoringTokens) {
    for (const candidate of mergedSearchCandidates(searchQuery)) {
        const tokens = scoringTokens;
        const searchUrl = EATSMARTER_SEARCH_URL.replace('{q}', encodeURIComponent(candidate));
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
            continue;
        }

        const seen = new Set();
        const scored = [];
        for (const match of html.matchAll(ES_IMG_REGEX)) {
            const file = match[1];
            if (file.includes('default_images')) continue;
            if (seen.has(file)) continue;
            seen.add(file);
            const imageUrl = `https://images.eatsmarter.de/sites/default/files/styles/300x225-webp/public/${file}`;
            const slugTokens = file.replace(/\.jpg$/i, '').split('-').filter(token => token && !/^\d+$/.test(token));
            scored.push({
                url: imageUrl,
                license: 'Eatsmarter',
                creator: 'eatsmarter.de',
                title: titleFromSlug(slugTokens),
                score: relevanceScore(slugTokens, tokens),
                source: 'eatsmarter'
            });
        }
        if (scored.length >= 1 && bestPoolScore(scored) >= SEARCH_QUALITY_GATE) return scored;
    }
    return [];
}

// Generische Menü-Zeilen ohne Gerichtsnamen ("Suppe, kleiner Salat + Dessert")
// und Side-Fragmente, deren Hauptgericht der Splitter verschluckt hat
// ("mit Nachos", "mit Tomatensauce") -> keine Bilder, der Client zeigt seinen
// "Bei Google öffnen"-Fallback.
const SIDE_START_RE = /^(mit|an|dazu|und|oder|als|beilage)\b/;

function isGenericQuery(searchQuery) {
    if (SIDE_START_RE.test(String(searchQuery).trim().toLowerCase())) return true;
    const tokens = String(searchQuery)
        .toLowerCase()
        .split(/[\s,+/&·]+/)
        .map(word => normalizeToken(word.replace(/[^A-Za-zÄÖÜäöüß]/g, '')))
        .filter(token => token && !/^\d+$/.test(token));
    return tokens.length > 0 && tokens.every(token => GENERIC_QUERY_WORDS.has(token));
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

        if (isGenericQuery(searchQuery)) {
            return jsonResponse({ query: query.trim(), searchQuery, hl, engine: 'chefkoch+kochbar+eatsmarter', rev: WORKER_REV, count: 0, images: [], generic: true });
        }

        // Suchen mit Candidate (inkl. Verkürzung/Kanonisierung), scoren aber
        // immer gegen die volle Gerichts-Query — Relevanz gilt dem Gericht,
        // nicht der Suchvariante.
        const scoringTokens = candidateTokens(searchQuery);
        const [chefkochScored, kochbarScored, eatsmarterScored] = await Promise.all([
            fetchFromChefkoch(searchQuery, scoringTokens),
            fetchFromKochbar(searchQuery, scoringTokens),
            fetchFromEatsmarter(searchQuery, scoringTokens)
        ]);
        const chefkochWithSource = chefkochScored.map(img => ({ ...img, source: 'chefkoch' }));
        // Global score-sortierter Merge: Slide 1 ist immer der bestbewertete
        // Treffer über alle Quellen — das frühere Pool-Round-Robin zeigte
        // immer chefkoch zuerst, auch wenn kochbar/eatsmarter bis zu 8 Punkte
        // besser scoreten (55% der Live-Queries zeigten nicht den besten
        // Treffer). Quellen-Diversity bleibt als Tie-Breaker beim Auffüllen
        // der 5 Slots.
        const all = [...chefkochWithSource, ...kochbarScored, ...eatsmarterScored].sort((a, b) => b.score - a.score);
        const picked = [];
        const sourceCounts = { chefkoch: 0, kochbar: 0, eatsmarter: 0 };
        while (picked.length < 5 && all.length > 0) {
            let bestIdx = 0;
            for (let i = 1; i < all.length; i++) {
                const countBest = sourceCounts[all[bestIdx].source] || 0;
                const countI = sourceCounts[all[i].source] || 0;
                if (countI < countBest || (countI === countBest && all[i].score > all[bestIdx].score)) bestIdx = i;
            }
            const entry = all.splice(bestIdx, 1)[0];
            sourceCounts[entry.source] = (sourceCounts[entry.source] || 0) + 1;
            picked.push(entry);
        }
        const images = picked;

        return jsonResponse({ query: query.trim(), searchQuery, hl, engine: 'chefkoch+kochbar+eatsmarter', rev: WORKER_REV, count: images.length, images });
    }
}
