import { normalize } from './normalize.js';
import { matchTemplate } from './templates.js';
import { segment } from './segment.js';
import { resolveBoundary } from './boundary.js';
import { scoreSplit } from './score.js';
import { createLangModel } from './langModel.js';
import { LANG_MODEL_SEED } from './langModelSeed.js';

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

    const courses = segment(normText);

    // Resolve anchor-less boundaries (Layer 3)
    for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        if (!course.anchored && course.en) {
            if (langModel.scoreLang(course.en) > 0) {
                const { enPart, deCut } = resolveBoundary(course.en, langModel);
                if (deCut) {
                    if (course.mono) {
                        course.en = enPart;
                        course.de = deCut;
                        course.mono = false;
                    } else {
                        courses[i].en = enPart;
                        courses.splice(i + 1, 0, {
                            de: deCut,
                            en: deCut,
                            mono: true,
                            anchored: false
                        });
                    }
                }
            }
        }
    }

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
