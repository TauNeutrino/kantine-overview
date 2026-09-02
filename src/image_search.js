// === Dish Image Search: Query Derivation + Fetch Client (FR-123..125) ===
// Part 1: pure query functions (no dependencies) — vm-testable in isolation.
// Part 2: keyless image client — source chain Wikipedia → Commons → Google
// (proxy chain, parallel) → Openverse, localStorage cache, abortable via
// cancelSignal. Fetches only when fetchDishImages is called.

import { LS, DISH_IMAGE_CACHE_TTL_MS, DISH_IMAGE_FETCH_TIMEOUT_MS, DISH_IMAGE_MAX_RESULTS, DISH_IMAGE_WIKIPEDIA_URL, DISH_IMAGE_COMMONS_URL, DISH_IMAGE_GOOGLE_SCRAPE_URL, DISH_IMAGE_GOOGLE_TAB_URL, DISH_IMAGE_OPENVERSE_URL, DISH_IMAGE_PROXY_CHAIN } from './constants.js'

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
        .replace(/\s*\([A-Za-z]{1,4}(?:\s*,\s*[A-Za-z]{1,4})*\)/g, '')
        .replace(/\d+[.,]\d+\s*€?/g, '')
        .replace(/^[\s•·▪◦‣*–—-]+/, '')
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
 * Fetches preview images for a dish query. Source chain: Wikipedia article
 * summary → Wikimedia Commons search → Google scrape via parallel proxy
 * chain → Openverse. Fresh results are cached in localStorage for
 * DISH_IMAGE_CACHE_TTL_MS. Never throws: total failure (or cancellation)
 * resolves to { images: [], source: null }.
 * @param {string} query Sanitized dish query
 * @param {'de'|'en'} [lang] Query language for the Google UI hint (defaults to 'de')
 * @param {AbortSignal} [cancelSignal] Aborts the search when the popup closes
 * @returns {Promise<{images: {url: string, license: string, creator: string}[], source: string|null, cached?: boolean}>}
 */
export async function fetchDishImages(query, lang, cancelSignal) {
    if (cancelSignal && cancelSignal.aborted) return { images: [], source: null }
    const key = query.trim().replace(/\s+/g, ' ').toLowerCase()
    const note = (level, message) => {
        if (cancelSignal && cancelSignal.aborted) return
        console[level](`[Kantine] Bildersuche: ${message}`)
    }
    const cache = readDishImageCache()
    const entry = cache && cache.queries ? cache.queries[key] : null
    if (entry && Date.now() - entry.ts < DISH_IMAGE_CACHE_TTL_MS) {
        note('log', `Cache-Treffer für "${key}" — ${entry.images.length} Bilder (Quelle: ${entry.source})`)
        return { images: entry.images, source: entry.source, cached: true }
    }

    const startedAt = Date.now()
    note('log', `"${key}" (hl=${lang === 'en' ? 'en' : 'de'}) — kein Cache, Quellen-Kette: Wikipedia → Commons → Google → Openverse`)
    const isCancelled = () => Boolean(cancelSignal && cancelSignal.aborted)
    const attemptSignal = () => {
        const timeoutSignal = AbortSignal.timeout(DISH_IMAGE_FETCH_TIMEOUT_MS)
        if (cancelSignal && typeof AbortSignal.any === 'function') return AbortSignal.any([cancelSignal, timeoutSignal])
        return timeoutSignal
    }

    let result = null

    // Stage 1: Wikipedia article summary (direct fetch, CORS-enabled) — precise lead image.
    try {
        const response = await fetch(DISH_IMAGE_WIKIPEDIA_URL.replace('{q}', encodeURIComponent(query)), { signal: attemptSignal() })
        if (response.ok) {
            const summary = await response.json()
            const thumb = summary && summary.thumbnail && summary.thumbnail.source
            if (typeof thumb === 'string' && thumb.startsWith('http')) {
                const images = [{ url: thumb, license: '', creator: summary.title || query }].slice(0, DISH_IMAGE_MAX_RESULTS)
                writeDishImageCache(key, 'wikipedia', images)
                note('log', `Wikipedia-Artikelbild gefunden — fertig in ${Date.now() - startedAt}ms — ${images.length} Bild`)
                result = { images, source: 'wikipedia' }
            }
        }
    } catch (e) {
        if (!isCancelled()) note('warn', `Wikipedia fehlgeschlagen (${e && e.message ? e.message : e})`)
    }
    if (result || isCancelled()) return result || { images: [], source: null }

    // Stage 2: Wikimedia Commons file search (direct fetch, CORS via origin=*).
    try {
        const response = await fetch(DISH_IMAGE_COMMONS_URL.replace('{q}', encodeURIComponent(query)), { signal: attemptSignal() })
        if (response.ok) {
            const data = await response.json()
            const pages = data && data.query && data.query.pages ? Object.values(data.query.pages) : []
            const images = pages
                .map(page => page && page.imageinfo && page.imageinfo[0])
                .filter(info => info && typeof info.thumburl === 'string' && info.thumburl.startsWith('https://'))
                .slice(0, DISH_IMAGE_MAX_RESULTS)
                .map(info => ({ url: info.thumburl, license: '', creator: String(info.title || '').replace(/^File:/, '') }))
            note('log', `Commons-Suche lieferte ${images.length} Bilder`)
            if (images.length >= 1) {
                writeDishImageCache(key, 'commons', images)
                note('log', `fertig in ${Date.now() - startedAt}ms — ${images.length} Bilder (Quelle: Wikimedia Commons)`)
                result = { images, source: 'commons' }
            }
        }
    } catch (e) {
        if (!isCancelled()) note('warn', `Commons fehlgeschlagen (${e && e.message ? e.message : e})`)
    }
    if (result || isCancelled()) return result || { images: [], source: null }

    // Stage 3: Google scrape via proxy chain — all proxies fire in parallel
    // (one hanging proxy no longer stalls the whole chain); first hit in
    // chain order wins.
    note('log', 'Wikipedia/Commons ohne Treffer — Google über Proxy-Kette (parallel)...')
    const scrapeUrl = DISH_IMAGE_GOOGLE_SCRAPE_URL
        .replace('{q}', encodeURIComponent(query))
        .replace('{hl}', lang === 'en' ? 'en' : 'de')
    const attempts = DISH_IMAGE_PROXY_CHAIN.map(proxy => {
        const attemptStartedAt = Date.now()
        return fetch(proxy.template.replace('{url}', encodeURIComponent(scrapeUrl)), { signal: attemptSignal() })
            .then(async response => {
                if (!response.ok) {
                    note('warn', `${proxy.name} antwortete HTTP ${response.status} nach ${Date.now() - attemptStartedAt}ms`)
                    return []
                }
                let body = await response.text()
                if (proxy.name === 'allorigins-get') body = JSON.parse(body).contents
                const images = extractImageThumbs(body)
                note('log', `${proxy.name} lieferte ${images.length} Bilder (${Date.now() - attemptStartedAt}ms, ${(body.length / 1024).toFixed(0)} KB HTML)`)
                return images
            })
            .catch(e => {
                note('warn', `${proxy.name} fehlgeschlagen nach ${Date.now() - attemptStartedAt}ms (${e && e.message ? e.message : e})`)
                return []
            })
    })
    const settled = await Promise.all(attempts)
    if (isCancelled()) return { images: [], source: null }
    for (let i = 0; i < DISH_IMAGE_PROXY_CHAIN.length; i++) {
        if (settled[i].length >= 1) {
            writeDishImageCache(key, 'google', settled[i])
            note('log', `fertig in ${Date.now() - startedAt}ms — ${settled[i].length} Bilder (Quelle: Google via ${DISH_IMAGE_PROXY_CHAIN[i].name})`)
            return { images: settled[i], source: 'google' }
        }
    }
    note('log', 'alle Proxys ohne Treffer — Fallback Openverse...')

    // Stage 4: Openverse.
    try {
        const response = await fetch(DISH_IMAGE_OPENVERSE_URL.replace('{q}', encodeURIComponent(query)), { signal: attemptSignal() })
        if (response.ok) {
            const data = await response.json()
            const images = data.results.map(r => ({ url: r.thumbnail || r.url, license: r.license || '', creator: r.creator || '' }))
                .filter(image => typeof image.url === 'string' && image.url.startsWith('https://'))
                .slice(0, DISH_IMAGE_MAX_RESULTS)
            note('log', `Openverse lieferte ${images.length} verwendbare Bilder`)
            if (images.length >= 1) {
                writeDishImageCache(key, 'openverse', images)
                note('log', `fertig in ${Date.now() - startedAt}ms — ${images.length} Bilder (Quelle: Openverse)`)
                return { images, source: 'openverse' }
            }
        } else {
            note('warn', `Openverse antwortete HTTP ${response.status}`)
        }
    } catch (e) {
        // Openverse unreachable or malformed — fall through to the total-failure result.
        note('warn', `Openverse fehlgeschlagen (${e && e.message ? e.message : e})`)
    }

    note('warn', `keine Quelle lieferte Bilder für "${key}" (${Date.now() - startedAt}ms) — Fehlerzustand mit "Bei Google öffnen"-Link wird angezeigt`)
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
