// === Dish Image Search: Query Derivation (FR-123..125) ===
// Part 1: pure functions only (no imports) so they stay vm-testable.
// The fetch/proxy/cache client is added to this module in a later step.

/**
 * Derives the main-course line from a language split result.
 * Only confident splits (label 'high') in de/en mode qualify; the second
 * course line is the main dish, single-course menus fall back to that line.
 * @param {{de?: string, en?: string, label?: string}|null} split splitLanguage result
 * @param {'de'|'en'|'all'} langMode Current language mode
 * @returns {{text: string, lang: string}|null} Main course line or null
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
    return `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=2`
}
