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
    const k = findDishBoundary(mid, langModel);
    const en1 = mid.slice(0, k).join(' ').trim();
    const de2 = mid.slice(k).join(' ').trim();
    const tail = tokens.slice(s2 + 1).join(' ').trim();

    const first = { de: de1, en: en1 || de1, mono: false };
    const remainder = (de2 ? de2 + ' / ' : '/ ') + tail;
    return [first, ...splitDishes(remainder, langModel)];
}

function classifyToken(token, langModel, isFirst) {
    if (isLoanword(token)) return 'ambig';
    if (!isFirst && /^[A-ZÄÖÜ]/.test(token)) return 'de';
    const s = langModel.scoreLang(token);
    if (s > 0.5) return 'de';
    if (s < -0.5) return 'en';
    return 'ambig';
}

function findDishBoundary(midTokens, langModel) {
    const n = midTokens.length;
    if (n <= 1) return n;

    const tags = midTokens.map((t, i) => classifyToken(t, langModel, i === 0));

    let bestK = 1;
    let bestPenalty = Infinity;
    let bestCap = -1;

    for (let k = 1; k < n; k++) {
        let leftGerman = 0;
        for (let i = 0; i < k; i++) if (tags[i] === 'de') leftGerman++;
        let rightEnglish = 0;
        for (let i = k; i < n; i++) if (tags[i] === 'en') rightEnglish++;

        const penalty = leftGerman + rightEnglish;
        const cap = /^[A-ZÄÖÜ]/.test(midTokens[k]) ? 1 : 0;

        if (penalty < bestPenalty || (penalty === bestPenalty && cap > bestCap)) {
            bestPenalty = penalty;
            bestCap = cap;
            bestK = k;
        }
    }

    return bestK;
}
