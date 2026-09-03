import { isLoanword } from './loanwords.js';

// Split a reconstructed bilingual segment "DE1 / EN1 DE2 / EN2 ..." into individual
// dishes. The separator-slash count is the structural skeleton (every bilingual dish
// is "German / English"); allergens are optional anchors handled by the caller.
//
// Each returned dish = { de, en, mono }. The caller (splitter.js) reattaches the
// allergen to the LAST dish and assigns the `anchored` flag.
export function splitDishes(text, langModel) {
    const t = String(text || '').replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim();
    if (!t) return [];

    const tokens = t.split(' ');
    const slashIdxs = [];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '/') slashIdxs.push(i);
    }

    // No slash -> a single mono dish (e.g. "Vanillapudding").
    if (slashIdxs.length === 0) {
        return [{ de: t, en: t, mono: true }];
    }

    // Exactly one slash -> a single bilingual dish.
    if (slashIdxs.length === 1) {
        const si = slashIdxs[0];
        const de = tokens.slice(0, si).join(' ').trim();
        const en = tokens.slice(si + 1).join(' ').trim();
        if (!de || !en) {
            const solo = de || en;
            return [{ de: solo, en: solo, mono: true }];
        }
        return [{ de, en, mono: false }];
    }

    // Two or more slashes -> peel the first dish, recurse on the remainder.
    // Structure between the first two slashes is "EN_1 ... DE_2"; the EN_1 -> DE_2
    // boundary is resolved via the multi-signal detector below.
    const s1 = slashIdxs[0];
    const s2 = slashIdxs[1];
    const de1 = tokens.slice(0, s1).join(' ').trim();
    const mid = tokens.slice(s1 + 1, s2); // EN_1 ... DE_2
    const tail = tokens.slice(s2 + 1).join(' ').trim();
    // Bilingual dishes usually share their head noun ("Fusilli mit ... /
    // Fusilli with ..."). If the word opening the tail (EN_2) also occurs
    // inside mid, it most likely opens DE_2 — pass it as a bonus signal.
    const k = findDishBoundary(mid, langModel, headBonusKey(mid, tail));
    const en1 = mid.slice(0, k).join(' ').trim();
    const de2 = mid.slice(k).join(' ').trim();

    const first = { de: de1, en: en1 || de1, mono: false };
    const remainder = (de2 ? de2 + ' / ' : '/ ') + tail;
    return [first, ...splitDishes(remainder, langModel)];
}

// Normalized comparison key for head-noun matching (case-insensitive,
// punctuation-stripped). Returns '' when the tail opener is not a usable
// signal: too short or lowercase (filters function words like "with").
function headBonusKey(midTokens, tail) {
    const first = String(tail || '').split(' ')[0] || '';
    if (!/^[A-ZÄÖÜ]/.test(first)) return '';
    const key = first.toLowerCase().replace(/[^a-zäöüß]/g, '');
    if (key.length < 3) return '';
    const wanted = new Set(midTokens.map(t => String(t).toLowerCase().replace(/[^a-zäöüß]/g, '')));
    return wanted.has(key) ? key : '';
}
// Continuous language evidence per token: the trigram model's signed score
// (positive = German, negative = English). Loanwords are neutral — they occur
// on both sides ("Kichererbsencurry" vs "chickpea curry").
// Capitalization is NOT used as evidence here: English dish text in the source
// data capitalizes freely ("Indian: Mix Sabji", "Vegetables"), so a hard
// "capital => German" rule drowns the model signal. It only breaks ties.
function findDishBoundary(midTokens, langModel, headKey = '') {
    const n = midTokens.length;
    if (n <= 1) return n;

    const EPS = 1e-9;
    const HEAD_BONUS = 3.0;
    const scores = midTokens.map(t => isLoanword(t) ? 0 : langModel.scoreLang(t));
    const norm = t => String(t).toLowerCase().replace(/[^a-zäöüß]/g, '');

    let bestK = 1;
    let bestPenalty = Infinity;
    let bestCap = -1;

    for (let k = 1; k < n; k++) {
        // Left of the boundary should be English, right should be German:
        // penalize German evidence left + English evidence right.
        let penalty = 0;
        for (let i = 0; i < k; i++) if (scores[i] > 0) penalty += scores[i];
        for (let i = k; i < n; i++) if (scores[i] < 0) penalty -= scores[i];

        const cap = /^[A-ZÄÖÜ]/.test(midTokens[k]) ? 1 : 0;
        if (headKey && norm(midTokens[k]) === headKey && cap) penalty -= HEAD_BONUS;

        if (penalty < bestPenalty - EPS || (Math.abs(penalty - bestPenalty) <= EPS && cap > bestCap)) {
            bestPenalty = penalty;
            bestCap = cap;
            bestK = k;
        }
    }

    return bestK;
}
