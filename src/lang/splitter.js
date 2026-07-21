import { normalize } from './normalize.js';
import { matchTemplate } from './templates.js';
import { segment } from './segment.js';
import { resolveBoundary } from './boundary.js';
import { splitDishes } from './dishes.js';
import { scoreSplit } from './score.js';
import { createLangModel } from './langModel.js';
import { LANG_MODEL_SEED } from './langModelSeed.js';
import { alignTrailingEnglish } from './alignTrailing.js';

function stripAllergen(text, allergen) {
    if (!text) return '';
    let out = text;
    if (allergen) {
        const suffix = `(${allergen})`;
        const idx = out.lastIndexOf(suffix);
        if (idx !== -1) out = out.slice(0, idx) + out.slice(idx + suffix.length);
    }
    return out.replace(/\s+/g, ' ').trim();
}

function attachAllergen(dish, allergen, anchored) {
    let de = dish.de || '';
    let en = dish.en || '';
    if (allergen) {
        const tag = ` (${allergen})`;
        if (!de.includes(`(${allergen})`)) de = de + tag;
        if (!en.includes(`(${allergen})`)) en = en + tag;
    }
    return { de, en, allergen: allergen || '', mono: !!dish.mono, anchored: !!anchored };
}

// Allergen-internal slashes are repaired during normalization, so a "/" surviving
// paren removal can only be a dish separator => merged dishes.
function hasSeparatorSlash(text) {
    return (text || '').replace(/\([^)]*\)/g, '').indexOf('/') !== -1;
}

function repairMergedCourses(courses, langModel) {
    const repaired = [];
    for (const course of courses) {
        if (!course.mono && hasSeparatorSlash(course.en)) {
            const allergen = course.allergen || '';
            const fullText = stripAllergen(course.de, allergen) + ' / ' + stripAllergen(course.en, allergen);
            const dishes = splitDishes(fullText, langModel);
            if (dishes.length >= 2) {
                dishes.forEach((dish, idx) => {
                    const isLast = idx === dishes.length - 1;
                    repaired.push(attachAllergen(dish, isLast ? allergen : '', isLast ? course.anchored : false));
                });
                continue;
            }
        }
        repaired.push(course);
    }
    return repaired;
}

function peelGluedTailFromUnanchored(courses, langModel) {
    for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        if (!course.anchored && course.en && !hasSeparatorSlash(course.en) && langModel.scoreLang(course.en) > 0) {
            const { enPart, deCut } = resolveBoundary(course.en, langModel);
            if (deCut) {
                if (course.mono) {
                    course.en = enPart;
                    course.de = deCut;
                    course.mono = false;
                } else {
                    courses[i].en = enPart;
                    courses.splice(i + 1, 0, { de: deCut, en: deCut, mono: true, anchored: false });
                }
            }
        }
    }
    return courses;
}

function peelTrailingMonoCourse(courses) {
    if (courses.length !== 2) return courses;
    const last = courses[1];
    const allergen = last.allergen || '';

    const enWords = stripAllergen(last.en, allergen).split(/\s+/);
    if (enWords.length < 2) return courses;

    const word = enWords[enWords.length - 1];
    if (!/^[A-ZÄÖÜ][a-zäöüß]/.test(word)) return courses;

    const newEn = enWords.slice(0, -1).join(' ');
    const deNoAllergen = stripAllergen(last.de, allergen);
    const deWords = deNoAllergen.split(/\s+/);
    const newDe = (deWords.length >= 2 && deWords[deWords.length - 1] === word)
        ? deWords.slice(0, -1).join(' ')
        : deNoAllergen;

    courses[1] = { de: newDe, en: newEn, allergen: '', mono: newDe === newEn, anchored: false };
    const monoText = allergen ? `${word} (${allergen})` : word;
    courses.push({ de: monoText, en: monoText, allergen, mono: true, anchored: !!allergen });
    return courses;
}

// Merge a trailing mono course that is only a non-allergen parenthetical
// ingredient/meat annotation back into the previous anchored course.
// Example (Friday single-course menus): "... (ACGLMF)(Beef, Pork)" should be
// one course, not three.
function mergeTrailingAnnotations(courses) {
    if (courses.length < 2) return courses;
    const last = courses[courses.length - 1];
    if (last.anchored || !last.mono) return courses;

    const text = (last.de || '').trim();
    // Parenthetical with comma- or slash-separated words (meat/ingredient lists).
    // Must not look like an allergen code (those are handled by segment()).
    if (!/^\(\s*[A-Za-z][A-Za-z]*(?:\s*[，,\/]\s*[A-Za-z][A-Za-z]*)*\s*\)$/.test(text)) {
        return courses;
    }

    const prev = courses[courses.length - 2];
    prev.de = ((prev.de || '') + ' ' + text).trim();
    prev.en = ((prev.en || '') + ' ' + text).trim();
    courses.pop();
    return courses;
}

export function splitLanguage(text, options = {}) {
    if (!text) return { de: '', en: '', raw: '', confidence: 0, subScores: {anchor:0,purity:0,course:0,coverage:0}, label: 'fallback', notes: [] };

    const { text: normText, notes } = normalize(text);

    const tplResult = matchTemplate(normText);
    if (tplResult) {
        tplResult.raw = '• ' + text;
        tplResult.notes = notes;
        return tplResult;
    }

    const langModel = (options && options.langModel) ? options.langModel : createLangModel(LANG_MODEL_SEED);

    let courses = segment(normText);
    courses = mergeTrailingAnnotations(courses);
    courses = alignTrailingEnglish(courses, langModel);
    courses = repairMergedCourses(courses, langModel);
    courses = peelGluedTailFromUnanchored(courses, langModel);
    courses = peelTrailingMonoCourse(courses);

    const deParts = [];
    const enParts = [];

    for (const course of courses) {
        const dePart = course.de;
        const enPart = course.en;
        deParts.push(dePart);
        enParts.push(enPart);
    }

    if (deParts.length > 3 || enParts.length > 3) {
        const formattedRaw = '• ' + text.replace(/(?:\(|(?:\/|\s|^))([A-Z,]+)\)\s*(?=\S)(?!\s*\/)/g, '($1)\n• ').replace(/^• • /, '• ');
        return { de: formattedRaw, en: formattedRaw, raw: formattedRaw, label: 'fallback', confidence: 0, subScores: {anchor:0,purity:0,course:0,coverage:0}, notes };
    }

    const de = deParts.length > 0 ? '• ' + deParts.join('\n• ') : '';
    const en = enParts.length > 0 ? '• ' + enParts.join('\n• ') : '';
    const raw = de;

    const { confidence, subScores, label } = scoreSplit({ courses, notes, raw: normText, langModel });

    const noteText = notes.length > 0 ? '\n' + notes.join(' ') : '';
    return { de: de + noteText, en: en + noteText, raw: raw + noteText, confidence, subScores, label, notes };
}
