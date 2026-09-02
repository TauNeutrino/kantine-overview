// === Dish Image Search: Query Derivation + Fetch Client (FR-123..125) ===
// Part 1: pure query functions (no dependencies) — vm-testable in isolation.
// Part 2: keyless image client — Google scrape via proxy chain, Openverse
// fallback, localStorage cache. Fetches only when fetchDishImages is called.

import { LS, DISH_IMAGE_CACHE_TTL_MS, DISH_IMAGE_FETCH_TIMEOUT_MS, DISH_IMAGE_MAX_RESULTS, DISH_IMAGE_GOOGLE_SCRAPE_URL, DISH_IMAGE_GOOGLE_TAB_URL, DISH_IMAGE_OPENVERSE_URL, DISH_IMAGE_PROXY_CHAIN } from './constants.js'

/**
 * Derives the main-course line from a language split result.
 * Only confident splits (label 'high') in de/en mode qualify; the second
 * course line is the main dish, single-course menus fall back to that line.
 * @param {Object|null} split splitLanguage result (fields: de, en, label)
 * @param {'de'|'en'|'all'} langMode Current language mode
 * @returns {Object|null} Main course line ({text, lang}) or null
 */
export function getMainCourseLine(split, langMode) {
    if (langMode === 'all') return null
    if (!split || split.label !== 'high') return null
    const lines = String(langMode === 'en' ? split.en : split.de || '').split('\n').map(s => s.trim()).filter(Boolean)
    if (lines.length >= 2) return { text: lines[1], lang: langMode }
    if (lines.length === 1) return { text: lines[0], lang: langMode }
    return null
}

/**
 * Cleans a dish line into a search query: strips allergen codes in
 * parentheses and prices, compresses whitespace and edge commas.
 * @param {string} text Raw dish line
 * @returns {string|null} Sanitized query or null if too short
 */
export function sanitizeDishQuery(text) {
    const cleaned = String(text || '')
        .replace(/\s*\([A-Z](?:\s*,\s*[A-Z])*\)/g, '')
        .replace(/\d+[.,]\d+\s*€?/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[,\s]+|[,\s]+$/g, '')
    if (cleaned.length < 3) return null
    return cleaned
}

/**
 * Builds the Google image search URL for a dish query (always opens the
 * image tab via udm=2; no other parameters).
 * @param {string} query Sanitized dish query
 * @returns {string} Google image search URL
 */
export function buildGoogleImageUrl(query) {
    return DISH_IMAGE_GOOGLE_TAB_URL.replace('{q}', encodeURIComponent(query))
}

/**
 * Extracts gstatic thumbnail URLs from proxied Google image-search HTML.
 * Every match is entity-decoded (&amp; -> &) because proxy HTML escapes the
 * URL query separators, then deduped preserving first-occurrence order.
 * @param {string} html Google image search HTML document
 * @returns {Object[]} Uniform image entries (fields: url, license, creator — Google carries no license metadata)
 */
export function extractImageThumbs(html) {
    const matches = String(html || '').match(/https:\/\/encrypted-tbn\d*\.gstatic\.com\/images\?q=tbn:[A-Za-z0-9_\-]+[^"'\s\\<>]*/g) || []
    const seen = new Set()
    const images = []
    for (const match of matches) {
        const url = match.replace(/&amp;/g, '&')
        if (seen.has(url)) continue
        seen.add(url)
        images.push({ url, license: '', creator: '' })
    }
    return images.slice(0, DISH_IMAGE_MAX_RESULTS)
}

/**
 * Fetches preview images for a dish query. Stage 1 scrapes Google image
 * search through a keyless proxy chain; stage 2 falls back to Openverse
 * when every proxy came up empty. Fresh results are cached in localStorage
 * for DISH_IMAGE_CACHE_TTL_MS. Never throws: total failure resolves to
 * { images: [], source: null }.
 * @param {string} query Sanitized dish query
 * @param {'de'|'en'} [lang] Query language for the Google UI hint (defaults to 'de')
 * @returns {Promise<{images: {url: string, license: string, creator: string}[], source: string|null, cached?: boolean}>}
 */
export async function fetchDishImages(query, lang) {
    const key = query.trim().replace(/\s+/g, ' ').toLowerCase()
    const cache = readDishImageCache()
    const entry = cache && cache.queries ? cache.queries[key] : null
    if (entry && Date.now() - entry.ts < DISH_IMAGE_CACHE_TTL_MS) {
        console.log(`[Kantine] Bildersuche: Cache-Treffer für "${key}" — ${entry.images.length} Bilder (Quelle: ${entry.source})`)
        return { images: entry.images, source: entry.source, cached: true }
    }

    const startedAt = Date.now()
    console.log(`[Kantine] Bildersuche: "${key}" (hl=${lang === 'en' ? 'en' : 'de'}) — kein Cache, Quellen werden der Reihe nach probiert...`)

    const scrapeUrl = DISH_IMAGE_GOOGLE_SCRAPE_URL
        .replace('{q}', encodeURIComponent(query))
        .replace('{hl}', lang === 'en' ? 'en' : 'de')

    for (const proxy of DISH_IMAGE_PROXY_CHAIN) {
        const attemptStartedAt = Date.now()
        try {
            const response = await fetch(proxy.template.replace('{url}', encodeURIComponent(scrapeUrl)), { signal: AbortSignal.timeout(DISH_IMAGE_FETCH_TIMEOUT_MS) })
            if (!response.ok) {
                console.warn(`[Kantine] Bildersuche: ${proxy.name} antwortete HTTP ${response.status} nach ${Date.now() - attemptStartedAt}ms — nächster Versuch`)
                continue
            }
            let body = await response.text()
            if (proxy.name === 'allorigins-get') body = JSON.parse(body).contents
            const images = extractImageThumbs(body)
            console.log(`[Kantine] Bildersuche: ${proxy.name} lieferte ${images.length} Bilder (${Date.now() - attemptStartedAt}ms, ${(body.length / 1024).toFixed(0)} KB HTML)`)
            if (images.length < 1) continue
            writeDishImageCache(key, 'google', images)
            console.log(`[Kantine] Bildersuche: fertig in ${Date.now() - startedAt}ms — ${images.length} Bilder (Quelle: Google via ${proxy.name})`)
            return { images, source: 'google' }
        } catch (e) {
            // Proxy unreachable, timed out or returned a malformed payload — try the next one.
            console.warn(`[Kantine] Bildersuche: ${proxy.name} fehlgeschlagen nach ${Date.now() - attemptStartedAt}ms (${e && e.message ? e.message : e})`)
        }
    }

    const openverseStartedAt = Date.now()
    try {
        console.log('[Kantine] Bildersuche: alle Proxys ohne Treffer — Fallback Openverse...')
        const response = await fetch(DISH_IMAGE_OPENVERSE_URL.replace('{q}', encodeURIComponent(query)), { signal: AbortSignal.timeout(DISH_IMAGE_FETCH_TIMEOUT_MS) })
        if (response.ok) {
            const data = await response.json()
            const images = data.results.map(r => ({ url: r.thumbnail || r.url, license: r.license || '', creator: r.creator || '' }))
                .filter(image => typeof image.url === 'string' && image.url.startsWith('https://'))
                .slice(0, DISH_IMAGE_MAX_RESULTS)
            console.log(`[Kantine] Bildersuche: Openverse lieferte ${images.length} verwendbare Bilder (${Date.now() - openverseStartedAt}ms)`)
            if (images.length >= 1) {
                writeDishImageCache(key, 'openverse', images)
                console.log(`[Kantine] Bildersuche: fertig in ${Date.now() - startedAt}ms — ${images.length} Bilder (Quelle: Openverse)`)
                return { images, source: 'openverse' }
            }
        } else {
            console.warn(`[Kantine] Bildersuche: Openverse antwortete HTTP ${response.status} nach ${Date.now() - openverseStartedAt}ms`)
        }
    } catch (e) {
        // Openverse unreachable or malformed — fall through to the total-failure result.
        console.warn(`[Kantine] Bildersuche: Openverse fehlgeschlagen nach ${Date.now() - openverseStartedAt}ms (${e && e.message ? e.message : e})`)
    }

    console.warn(`[Kantine] Bildersuche: keine Quelle lieferte Bilder für "${key}" (${Date.now() - startedAt}ms) — Fehlerzustand mit "Bei Google öffnen"-Link wird angezeigt`)
    return { images: [], source: null }
}

function readDishImageCache() {
    try {
        return JSON.parse(localStorage.getItem(LS.DISH_IMAGE_CACHE))
    } catch (e) {
        return null
    }
}

function writeDishImageCache(key, source, images) {
    const cache = readDishImageCache()
    const queries = cache && cache.queries ? { ...cache.queries } : {}
    const now = Date.now()
    for (const existingKey of Object.keys(queries)) {
        if (now - queries[existingKey].ts >= DISH_IMAGE_CACHE_TTL_MS) delete queries[existingKey]
    }
    queries[key] = { ts: now, source, images }
    const keys = Object.keys(queries)
    if (keys.length > 50) {
        keys.sort((a, b) => queries[a].ts - queries[b].ts)
        for (const evictedKey of keys.slice(0, keys.length - 50)) delete queries[evictedKey]
    }
    localStorage.setItem(LS.DISH_IMAGE_CACHE, JSON.stringify({ queries }))
}
