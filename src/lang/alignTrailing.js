// @ts-check

import { isLoanword } from './loanwords.js';

const MIN_ENGLISH_SCORE = -0.8;
const MIN_DETECT_CONFIDENCE = 0.7;

const GERMAN_FUNCTION_WORDS = new Set([
    'mit', 'und', 'auf', 'von', 'vom', 'nach', 'in', 'an', 'zu', 'aus',
    'bei', 'für', 'über', 'unter', 'der', 'die', 'das', 'des', 'dem', 'den',
]);

function splitTopLevel(text) {
    if (!text || typeof text !== 'string') return [];

    const phrases = [];
    let current = '';
    let parenDepth = 0;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '(' || ch === '[' || ch === '{') {
            parenDepth++;
            current += ch;
        } else if (ch === ')' || ch === ']' || ch === '}') {
            parenDepth--;
            current += ch;
        } else if (parenDepth === 0 && (ch === ',' || ch === '/')) {
            const trimmed = current.trim();
            if (trimmed) phrases.push(trimmed);
            current = '';
        } else {
            current += ch;
        }
    }

    const trimmed = current.trim();
    if (trimmed) phrases.push(trimmed);
    return phrases;
}

function stripAllergenFromEnd(text, allergen) {
    if (!allergen) return text;
    const suffix = ` (${allergen})`;
    if (text.endsWith(suffix)) return text.slice(0, -suffix.length).trim();
    const idx = text.lastIndexOf(`(${allergen})`);
    if (idx !== -1) return text.slice(0, idx).trim();
    return text;
}

function hasGermanMarker(text) {
    if (/[äöüßÄÖÜ]/.test(text)) return true;
    const words = text.toLowerCase().match(/[a-zäöüß]+/g) || [];
    return words.some(w => GERMAN_FUNCTION_WORDS.has(w) && !isLoanword(w));
}

function isStronglyEnglish(text, langModel) {
    if (!text || hasGermanMarker(text)) return false;
    return langModel.scoreLang(text) <= MIN_ENGLISH_SCORE;
}

function looksLikeAllergenParens(text) {
    return /\(\s*[A-Z](\s*,?\s*[A-Z])*\s*\)\s*$/.test(text.trim());
}

function attachAllergenToPhrase(phrase, allergen) {
    let enPhrase = phrase.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (allergen && !looksLikeAllergenParens(enPhrase)) {
        enPhrase = `${enPhrase} (${allergen})`;
    }
    return enPhrase;
}

function repairMonoTail(courses, langModel) {
    const last = courses[courses.length - 1];
    if (!last || last.anchored || !last.mono) return courses;

    const tailText = last.de || '';
    const phrases = splitTopLevel(tailText);
    if (phrases.length < 2) return courses;

    const germanCourses = courses.slice(0, -1);
    if (germanCourses.length !== phrases.length) return courses;
    if (germanCourses.some(c => !c.mono)) return courses;

    let detectConfidence = 1.0;
    for (const phrase of phrases) {
        if (!isStronglyEnglish(phrase, langModel)) return courses;
        if (langModel.scoreLang(phrase) > MIN_ENGLISH_SCORE - 0.5) detectConfidence -= 0.2;
    }
    if (detectConfidence < MIN_DETECT_CONFIDENCE) return courses;

    return germanCourses.map((course, i) => ({
        de: course.de,
        en: attachAllergenToPhrase(phrases[i], course.allergen),
        allergen: course.allergen,
        mono: false,
        anchored: course.anchored,
    }));
}

function repairInterleavedEnglish(courses, langModel) {
    if (courses.length < 2) return courses;

    const changed = courses.slice();
    let modified = false;

    for (let i = 0; i < changed.length - 1; i++) {
        const course = changed[i];
        const next = changed[i + 1];
        if (!course.mono || !next.mono) continue;

        const nextText = stripAllergenFromEnd(next.de, next.allergen);
        const phrases = splitTopLevel(nextText);
        if (phrases.length === 0) continue;

        const leading = phrases[0];
        if (!isStronglyEnglish(leading, langModel)) continue;

        const rest = phrases.slice(1).join(', ').trim();
        if (!rest) continue;
        const restHasGerman = !isStronglyEnglish(rest, langModel) && /[a-zäöüß]{3,}/i.test(rest);
        if (!restHasGerman) continue;

        changed[i] = {
            de: course.de,
            en: attachAllergenToPhrase(leading, course.allergen),
            allergen: course.allergen,
            mono: false,
            anchored: course.anchored,
        };

        if (rest) {
            const newAllergen = next.allergen ? ` (${next.allergen})` : '';
            changed[i + 1] = {
                ...next,
                de: `${rest}${newAllergen}`,
                en: `${rest}${newAllergen}`,
                mono: true,
            };
        } else {
            changed.splice(i + 1, 1);
            i--;
        }
        modified = true;
    }

    return modified ? changed : courses;
}

function repairSlashTail(courses, langModel) {
    if (courses.length < 2) return courses;

    const last = courses[courses.length - 1];
    if (!last || last.anchored || last.mono) return courses;

    const lastDe = stripAllergenFromEnd(last.de, last.allergen);
    const lastEn = stripAllergenFromEnd(last.en, last.allergen);
    if (!lastDe || !lastEn || lastDe === lastEn) return courses;

    const germanCourses = courses.slice(0, -1);
    let slashPhrases = splitTopLevel(lastEn);

    // Format "DE1 (A) DE2 (B) EN1 / EN2": segmentation cuts the trailing block at
    // the first slash, so EN1 lands on the course's de-side. When that de-side is
    // itself strongly English, split the full trailing text to recover every EN dish.
    if (slashPhrases.length !== germanCourses.length && isStronglyEnglish(lastDe, langModel)) {
        const fullPhrases = splitTopLevel(lastDe + ' / ' + lastEn);
        if (fullPhrases.length === germanCourses.length) slashPhrases = fullPhrases;
    }

    if (slashPhrases.length < 2) return courses;
    if (germanCourses.length !== slashPhrases.length) return courses;
    if (germanCourses.some(c => !c.mono)) return courses;

    for (const phrase of slashPhrases) {
        if (!isStronglyEnglish(phrase, langModel)) return courses;
    }

    return germanCourses.map((course, i) => ({
        de: course.de,
        en: attachAllergenToPhrase(slashPhrases[i], course.allergen),
        allergen: course.allergen,
        mono: false,
        anchored: course.anchored,
    }));
}

export function alignTrailingEnglish(courses, langModel) {
    if (!Array.isArray(courses) || courses.length < 2) return courses;

    let result = repairInterleavedEnglish(courses, langModel);
    result = repairMonoTail(result, langModel);
    result = repairSlashTail(result, langModel);
    return result;
}
