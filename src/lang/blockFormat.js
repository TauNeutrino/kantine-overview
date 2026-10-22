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
// nothing at all ("... small portion of ..."). Source rows also mix shapes:
// a course can be translated inline ("DE1 (A) EN1 DE2 (B) ..."), and a stray
// slash can separate an inline translation from the next German course
// ("DE1 (A) EN1 / DE2 (B) ..."). Those mixed segments are split at their
// language boundary instead of being classified as a whole.
//
// The classic slash format ("DE1 / EN1 DE2 / EN2") must keep going through
// the regular pipeline — a German-left/English-right slash inside a segment
// is the marker for it and makes this module bail out.

const ALLERGEN_RE = /\(\s*([A-Z]{1,10}(?:\s*,\s*[A-Z]{1,10})*)\s*\)/g;
const BLOCK_CUES = /\b(Gebäck|Gemüse|Kartoffel|Salat|Suppe|Menü|Käse|Obstgarten)\b/;
const ADDENDUM_RE = /^(m\.|mit|und)\s/i;
const SMALL_PORTION_DE_RE = /kleine?n?\s*Portion/i;
const SMALL_PORTION_EN_RE = /\bsmall portion\b/i;

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

// Splits at top-level separators, ignoring separators inside parentheses.
function splitTopLevelBy(text, chars) {
    const parts = [];
    let current = '';
    let depth = 0;
    for (const ch of text) {
        if (ch === '(') { depth++; current += ch; }
        else if (ch === ')') { depth--; current += ch; }
        else if (depth === 0 && chars.includes(ch)) {
            const trimmed = current.trim();
            if (trimmed) parts.push(trimmed);
            current = '';
        } else current += ch;
    }
    const trimmed = current.trim();
    if (trimmed) parts.push(trimmed);
    return parts;
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

function normalizeKey(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[^a-z0-9äöüß ]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// A product name that ends the German block ("Balisto") shows up verbatim at
// the end of the English block, and the dish before it may contain commas
// ("couscous with cranberries, pistachios and ..."). Aligning on that name
// recovers the split when a plain comma split would cut the dish apart.
function alignByCourseText(englishBlock, targets) {
    if (targets.length !== 2) return null;
    const key = normalizeKey(targets[1].text);
    if (!key) return null;
    const index = englishBlock.toLowerCase().lastIndexOf(key);
    if (index <= 0) return null;
    const prefix = englishBlock.slice(0, index).replace(/[\s,]+$/, '').trim();
    const suffix = englishBlock.slice(index).trim();
    if (!prefix || !suffix) return null;
    return [prefix, suffix];
}

function distributeEnglish(englishBlock, targets, smallPortionCourseIndex) {
    const count = targets.length;
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

    // A slash-separated English block holds one course per part.
    const slashParts = splitTopLevelBy(englishBlock, '/');
    if (slashParts.length === count) return slashParts;

    const phrases = splitTopLevel(englishBlock);
    if (phrases.length === count) return phrases;

    const aligned = alignByCourseText(englishBlock, targets);
    if (aligned) return aligned;

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

function attachInline(courses, text, index) {
    const target = index === undefined ? courses.length - 1 : index;
    const course = courses[target];
    if (!course) return;
    course.enInline = course.enInline ? course.enInline + ' ' + text : text;
}

// True when any part of the segment reads German (an English-only segment
// before it is an inline translation, not the trailing block).
function containsGerman(segment, langModel) {
    for (const part of splitTopLevelBy(segment.text, '/')) {
        const phrases = splitTopLevelBy(part, ',');
        if (phrases.some(p => classifySegment(p, langModel) !== 'en')) return true;
    }
    return false;
}

// Reads the German-block/English-block menu shape. Returns null when the text
// is not that shape (slash format, single course, no readable structure) so the
// caller can fall back to the regular pipeline.
export function splitBlockFormat(normalizedText, langModel) {
    if (!normalizedText) return null;

    const segments = collectSegments(normalizedText);
    if (segments.length < 2) return null;

    const courses = [];
    let englishBlock = '';

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const text = segment.text.replace(/^\s*\/\s*/, '');

        const slashParts = splitTopLevelBy(text, '/');
        if (slashParts.length === 2) {
            const [left, right] = slashParts;
            const leftKind = classifySegment(left, langModel);
            const rightKind = classifySegment(right, langModel);
            if (leftKind === 'de' && rightKind === 'en') return null;
            if (leftKind === 'en' && rightKind === 'de' && courses.length) {
                attachInline(courses, left);
                courses.push({ text: right, code: segment.code, enInline: '' });
                continue;
            }
            return null;
        }

        const phrases = splitTopLevelBy(text, ',');
        const kinds = phrases.map(p => classifySegment(p, langModel));
        const enIndexes = kinds.map((k, j) => (k === 'en' ? j : -1)).filter(j => j >= 0);
        // The last segment can only be the trailing translation block, never an
        // inline translation of the previous course.
        const isLastSegment = i === segments.length - 1;

        if (enIndexes.length === 1 && !isLastSegment) {
            const k = enIndexes[0];
            const before = phrases.slice(0, k).join(', ');
            const after = phrases.slice(k + 1).join(', ');
            const afterIsEnglish = after && classifySegment(after, langModel) === 'en';

            if (k === 0 && after && !afterIsEnglish && courses.length) {
                attachInline(courses, phrases[0]);
                courses.push({ text: after, code: segment.code, enInline: '' });
                continue;
            }
            if (k > 0 && before && !afterIsEnglish) {
                courses.push({ text: before, code: '', enInline: phrases[k] });
                if (after) courses.push({ text: after, code: segment.code, enInline: '' });
                continue;
            }
        }

        const kind = classifySegment(text, langModel);
        if (kind === 'en' && isLastSegment) {
            englishBlock = text;
            break;
        }
        if (kind === 'en' && courses.length) {
            // An English-looking segment before the trailing block is the
            // translation of the course whose allergen code it repeats (the
            // source repeats that code in the translation); otherwise it is a
            // German-side product name ("Balisto") and stays a German course.
            const matchIndex = courses.findIndex(c => c.code && c.code === segment.code);
            if (matchIndex >= 0) {
                attachInline(courses, text, matchIndex);
                continue;
            }
            const germanLater = segments.slice(i + 1).some(s => containsGerman(s, langModel));
            if (!segment.code && germanLater) {
                attachInline(courses, text);
                continue;
            }
        }

        courses.push({ text, code: segment.code, enInline: '' });
    }

    const merged = mergeAddenda(courses);
    if (merged.length < 2) return null;

    if (!englishBlock) {
        if (!merged.some(c => c.enInline)) return null;
        const scored = merged.map(course => ({
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
    const variants = [merged];
    if (merged.length !== courses.length) variants.push(courses.map(c => ({ ...c })));

    for (const variant of variants) {
        const hasInline = variant.some(c => c.enInline);
        const targets = hasInline ? variant.filter(c => !c.enInline) : variant;
        if (targets.length === 0) continue;
        const portionIndex = variant.findIndex(c => SMALL_PORTION_DE_RE.test(c.text));
        const fragments = distributeEnglish(englishBlock, targets, portionIndex);
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
        merged.filter(c => c.enInline).map(c => withCode(c.enInline, c.code)),
        englishBlock
    );
    const pieces = [...inlinePieces, englishBlock.replace(/\s+/g, ' ').trim()];
    return {
        courses: null,
        de: bulletList(merged.map(c => withCode(c.text, c.code))),
        en: bulletList(pieces),
        raw: '• ' + normalizedText,
        label: 'medium',
        confidence: 0.6,
        subScores: { anchor: 1, purity: 0.5, course: 0.6, coverage: 0.9 }
    };
}
