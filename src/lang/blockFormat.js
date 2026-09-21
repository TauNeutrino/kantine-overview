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
// nothing at all ("... small portion of ..."). Some descriptions also translate
// the first course inline ("DE1 (A) EN1 (A) DE2 (B) ..."), so an English
// segment only starts the trailing block when no German segment follows it.
// These texts contain no top-level slash, so the slash pipeline
// (segment/dishes) cannot read them — this module reconstructs the courses.

const ALLERGEN_RE = /\(\s*([A-Z]{1,10}(?:\s*,\s*[A-Z]{1,10})*)\s*\)/g;
const BLOCK_CUES = /\b(Gebäck|Gemüse|Kartoffel|Salat|Suppe|Menü|Käse|Obstgarten)\b/;
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

// 'unknown' covers loanword-only dish names ("Donut", "Sushi"): too little
// signal for the language model, but structurally part of the German block.
function classifySegment(segment, langModel) {
    if (isGermanish(segment, langModel)) return 'de';
    if (isEnglishish(segment, langModel)) return 'en';
    return 'unknown';
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

function collectSegments(text) {
    const segments = [];
    let cursor = 0;
    for (const anchor of collectAnchors(text)) {
        const segment = text.slice(cursor, anchor.start).trim();
        if (segment) segments.push({ text: segment, code: anchor.code, start: cursor });
        cursor = anchor.end;
    }
    const tail = text.slice(cursor).trim();
    if (tail) segments.push({ text: tail, code: '', start: cursor });
    return segments;
}

// Fragments like "m. Schnittlauchdip" or "mit Sauerrahm, Gebäck" continue the
// dish before them — the source anchors them separately, the translation does not.
function mergeAddenda(courses) {
    const merged = [];
    for (const course of courses) {
        if (merged.length > 0 && ADDENDUM_RE.test(course.text)) {
            const previous = merged[merged.length - 1];
            previous.text += ' ' + course.text;
            previous.code = course.code;
            if (course.enInline) previous.enInline = (previous.enInline ? previous.enInline + ' ' : '') + course.enInline;
        } else {
            merged.push({ ...course });
        }
    }
    return merged;
}

function withCode(text, code) {
    return code ? `${text} (${code})` : text;
}

function bulletList(parts) {
    return parts.length > 0 ? '• ' + parts.join('\n• ') : '';
}

function distributeEnglish(englishBlock, count, smallPortionCourseIndex) {
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
        if (parts.length === count && parts.every(Boolean)) return parts;
    }

    const phrases = splitTopLevel(englishBlock);
    if (phrases.length === count) return phrases;

    const enIndex = englishBlock.search(SMALL_PORTION_EN_RE);
    if (count === 2 && enIndex > 0 && smallPortionCourseIndex > 0) {
        return [englishBlock.slice(0, enIndex).trim(), englishBlock.slice(enIndex).trim()];
    }

    return null;
}

// Inline translations show up in the trailing block again in malformed source
// rows — drop the inline bullet in that case instead of printing it twice.
function dropDuplicates(inlinePieces, englishBlock) {
    const blockKey = englishBlock.toLowerCase().replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ');
    return inlinePieces.filter(piece => {
        const key = piece.toLowerCase().replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
        return !key || !blockKey.includes(key);
    });
}

function buildResult(scored, normalizedText, langModel) {
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

// Reads the German-block/English-block menu shape. Returns null when the text
// is not that shape (slash format, single course, no readable structure) so the
// caller can fall back to the regular pipeline.
export function splitBlockFormat(normalizedText, langModel) {
    if (!normalizedText || hasTopLevelSlash(normalizedText)) return null;

    const segments = collectSegments(normalizedText);
    if (segments.length < 2) return null;

    const kinds = segments.map(s => classifySegment(s.text, langModel));
    const germanLater = new Array(segments.length).fill(false);
    for (let i = segments.length - 2; i >= 0; i--) {
        germanLater[i] = germanLater[i + 1] || kinds[i + 1] === 'de';
    }

    const courses = [];
    let trailingStart = -1;
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (kinds[i] === 'en') {
            const last = courses.length - 1;
            if (germanLater[i] && last >= 0) {
                courses[last].enInline = courses[last].enInline
                    ? courses[last].enInline + ' ' + segment.text
                    : segment.text;
                continue;
            }
            trailingStart = segment.start;
            break;
        }
        courses.push({ text: segment.text, code: segment.code, enInline: '' });
    }
    if (courses.length < 2) return null;

    const mergedCourses = mergeAddenda(courses);
    const englishBlock = trailingStart >= 0 ? normalizedText.slice(trailingStart).trim() : '';

    if (!englishBlock || !isEnglishish(englishBlock, langModel)) {
        // No usable trailing block: only inline translations can carry this split.
        if (!mergedCourses.some(c => c.enInline)) return null;
        const scored = mergedCourses.map(course => ({
            de: withCode(course.text, course.code),
            en: withCode(course.enInline || course.text, course.code),
            allergen: course.code,
            mono: !course.enInline,
            anchored: !!course.code
        }));
        return buildResult(scored, normalizedText, langModel);
    }

    // Merging addenda is usually right ("m. Schnittlauchdip"), but it must not
    // swallow a real course ("mit Tomatensauce, Beeren Nusskuchen"). The
    // translation block arbitrates: use the variant whose course count can be
    // distributed across the English fragments.
    const variants = [mergedCourses];
    if (mergedCourses.length !== courses.length) variants.push(courses.map(c => ({ ...c })));

    for (const variant of variants) {
        const hasInline = variant.some(c => c.enInline);
        const targets = hasInline ? variant.filter(c => !c.enInline) : variant;
        if (targets.length === 0) continue;
        const portionIndex = variant.findIndex(c => SMALL_PORTION_DE_RE.test(c.text));
        const fragments = distributeEnglish(englishBlock, targets.length, portionIndex);
        if (!fragments) continue;

        targets.forEach((course, i) => { course.en = fragments[i]; });
        const scored = variant.map(course => {
            const english = course.en || course.enInline;
            return {
                de: withCode(course.text, course.code),
                en: withCode(english || course.text, course.code),
                allergen: course.code,
                mono: !english,
                anchored: !!course.code
            };
        });
        return buildResult(scored, normalizedText, langModel);
    }

    // Graceful tier: German side stays per course, every English piece stays in order.
    const inlinePieces = dropDuplicates(
        mergedCourses.filter(c => c.enInline).map(c => withCode(c.enInline, c.code)),
        englishBlock
    );
    const pieces = [...inlinePieces, englishBlock.replace(/\s+/g, ' ').trim()];
    return {
        courses: null,
        de: bulletList(mergedCourses.map(c => withCode(c.text, c.code))),
        en: bulletList(pieces),
        raw: '• ' + normalizedText,
        label: 'medium',
        confidence: 0.6,
        subScores: { anchor: 1, purity: 0.5, course: 0.6, coverage: 0.9 }
    };
}
