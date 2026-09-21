// @ts-check

import { splitTopLevel, GERMAN_FUNCTION_WORDS } from './alignTrailing.js';
import { scoreSplit } from './score.js';

// Bessa changed the menu layout in 2026-04: descriptions no longer interleave
// "DE1 / EN1 DE2 / EN2" pairs. Instead one German block carries the allergen
// anchors and the English translation block follows as a whole:
//
//   "Rindsuppe m. Kaspressknödel (LMCGA) Zanderfilet ... (DAG) Obstgarten (G)
//    Beef soup with cheese dumplings (LMCGA) Pike-perch fillet ... (DAG) curd cream"
//
// The English block is separated by mirrored allergen codes, by commas, or by
// nothing at all ("... small portion of ..."). These texts contain no top-level
// slash, so the slash pipeline (segment/dishes) cannot read them — this module
// reconstructs the courses for that shape instead.

const ALLERGEN_RE = /\(\s*([A-Z]{1,10}(?:\s*,\s*[A-Z]{1,10})*)\s*\)/g;
const BLOCK_CUES = /\b(Portion|Gebäck|Gemüse|Kartoffel|Sauce|Salat|Suppe|Menü|Käse|Obstgarten)\b/;
const ADDENDUM_RE = /^(m\.|mit|und)\s/i;
const SMALL_PORTION_DE_RE = /kleine?n?\s*Portion/i;
const SMALL_PORTION_EN_RE = /\bsmall portion\b/i;

function hasTopLevelSlash(text) {
    let depth = 0;
    for (const ch of text) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (ch === '/' && depth === 0) return true;
    }
    return false;
}

function isGermanish(segment, langModel) {
    if (!segment) return false;
    if (/[äöüßÄÖÜ]/.test(segment)) return true;
    const words = segment.toLowerCase().match(/[a-zäöüß]+/g) || [];
    if (words.some(w => GERMAN_FUNCTION_WORDS.has(w))) return true;
    if (BLOCK_CUES.test(segment)) return true;
    return langModel.scoreLang(segment) > 1;
}

function isEnglishish(segment, langModel) {
    if (!segment || /[äöüßÄÖÜ]/.test(segment)) return false;
    return langModel.scoreLang(segment) < -2;
}

function collectAnchors(text) {
    const anchors = [];
    ALLERGEN_RE.lastIndex = 0;
    let match;
    while ((match = ALLERGEN_RE.exec(text)) !== null) {
        anchors.push({ code: match[1].replace(/\s/g, ''), start: match.index, end: match.index + match[0].length });
    }
    return anchors;
}

// Fragments like "m. Schnittlauchdip" or "mit Sauerrahm, Gebäck" continue the
// dish before them — the source anchors them separately, the translation does not.
function mergeAddenda(courses) {
    const merged = [];
    for (const course of courses) {
        if (merged.length > 0 && ADDENDUM_RE.test(course.text)) {
            merged[merged.length - 1].text += ' ' + course.text;
            merged[merged.length - 1].code = course.code;
        } else {
            merged.push({ ...course });
        }
    }
    return merged;
}

function distributeEnglish(englishBlock, courses) {
    const anchors = collectAnchors(englishBlock);
    if (anchors.length > 0) {
        const parts = [];
        let cursor = 0;
        for (const anchor of anchors) {
            parts.push(englishBlock.slice(cursor, anchor.start).trim());
            cursor = anchor.end;
        }
        const tail = englishBlock.slice(cursor).trim();
        if (tail) parts.push(tail);
        if (parts.length === courses.length && parts.every(Boolean)) return parts;
    }

    const phrases = splitTopLevel(englishBlock);
    if (phrases.length === courses.length) return phrases;

    const enIndex = englishBlock.search(SMALL_PORTION_EN_RE);
    const deIndex = courses.findIndex(c => SMALL_PORTION_DE_RE.test(c.text));
    if (enIndex > 0 && deIndex > 0) {
        const parts = [englishBlock.slice(0, enIndex).trim(), englishBlock.slice(enIndex).trim()];
        if (parts.length === courses.length) return parts;
    }

    return null;
}

function bulletList(parts) {
    return parts.length > 0 ? '• ' + parts.join('\n• ') : '';
}

// Reads the German-block/English-block menu shape. Returns null when the text
// is not that shape (slash format, single course, no readable structure) so the
// caller can fall back to the regular pipeline.
export function splitBlockFormat(normalizedText, langModel) {
    if (!normalizedText || hasTopLevelSlash(normalizedText)) return null;

    const anchors = collectAnchors(normalizedText);
    if (anchors.length < 2) return null;

    const germanCourses = [];
    let cursor = 0;
    let englishStart = -1;
    for (const anchor of anchors) {
        const segment = normalizedText.slice(cursor, anchor.start).trim();
        if (!segment) {
            cursor = anchor.end;
            continue;
        }
        if (!isGermanish(segment, langModel)) {
            englishStart = cursor;
            break;
        }
        germanCourses.push({ text: segment, code: anchor.code });
        cursor = anchor.end;
    }
    if (englishStart === -1) englishStart = cursor;

    const courses = mergeAddenda(germanCourses);
    if (courses.length < 2) return null;

    const englishBlock = normalizedText.slice(englishStart).trim();
    if (!englishBlock || !isEnglishish(englishBlock, langModel)) return null;

    const fragments = distributeEnglish(englishBlock, courses);
    if (!fragments) {
        // German side is reliable, the English block stays one ordered line.
        return {
            courses: null,
            de: bulletList(courses.map(c => `${c.text} (${c.code})`)),
            en: bulletList([englishBlock.replace(/\s+/g, ' ').trim()]),
            raw: '• ' + normalizedText,
            label: 'medium',
            confidence: 0.6,
            subScores: { anchor: 1, purity: 0.5, course: 0.6, coverage: 0.9 }
        };
    }

    const scored = courses.map((course, i) => {
        const fragment = fragments[i];
        const en = fragment.includes(`(${course.code})`) ? fragment : `${fragment} (${course.code})`;
        return {
            de: `${course.text} (${course.code})`,
            en,
            allergen: course.code,
            mono: false,
            anchored: true
        };
    });

    const result = scoreSplit({ courses: scored, notes: [], raw: normalizedText, langModel });
    return {
        courses: scored,
        de: bulletList(scored.map(c => c.de)),
        en: bulletList(scored.map(c => c.en)),
        raw: '• ' + normalizedText,
        label: result.label,
        confidence: result.confidence,
        subScores: result.subScores
    };
}
