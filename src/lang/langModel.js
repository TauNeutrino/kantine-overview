import { isLoanword } from './loanwords.js';

export function createLangModel(seed) {
    const FUNC_WEIGHT = 2.0;

    const trigramsDe = { ...(seed.trigramsDe || {}) };
    const trigramsEn = { ...(seed.trigramsEn || {}) };
    const funcDe = new Set(seed.funcDe || []);
    const funcEn = new Set(seed.funcEn || []);

    let totalDe = 0;
    for (const k in trigramsDe) {
        totalDe += trigramsDe[k];
    }

    let totalEn = 0;
    for (const k in trigramsEn) {
        totalEn += trigramsEn[k];
    }

    function scorePhrase(text) {
        if (!text) return { de: 0, en: 0 };

        let deScore = 0;
        let enScore = 0;

        const lowerText = text.toLowerCase();
        // Filter out loanword tokens: cross-lingual food terms (lasagne, gnocchi,
        // schnitzel, ...) appear in BOTH German and English descriptions, so they
        // should not bias the DE/EN evidence either way. Same applies to global
        // text rules (umlauts, digraphs) — "schnitzel" must not trigger the
        // "sch"+"tz" DE digitraph bonus.
        const alphaWords = (lowerText.match(/[a-zäöüß]+/g) || []).filter(w => !isLoanword(w));
        const filteredText = alphaWords.join(' ');

        let deTriLog = 0;
        let enTriLog = 0;

        for (const w of alphaWords) {
            for (let i = 0; i <= w.length - 3; i++) {
                const tri = w.substring(i, i + 3);

                const countDe = trigramsDe[tri] || 0;
                deTriLog += Math.log((countDe + 1) / (totalDe + 2));

                const countEn = trigramsEn[tri] || 0;
                enTriLog += Math.log((countEn + 1) / (totalEn + 2));
            }
        }

        const minTri = Math.min(deTriLog, enTriLog);
        deScore += (deTriLog - minTri);
        enScore += (enTriLog - minTri);

        for (const w of alphaWords) {
            if (funcDe.has(w)) deScore += FUNC_WEIGHT;
            if (funcEn.has(w)) enScore += FUNC_WEIGHT;
        }

        const umlauts = filteredText.match(/[äöüß]/g);
        if (umlauts) {
            deScore += 0.5 * umlauts.length;
        }

        for (const w of alphaWords) {
            if (/(ung|suppe|chen|kartoffel|schnitzel)$/.test(w)) deScore += 1.0;
            if (/(ing|ed)$/.test(w)) enScore += 0.5;
            if (/^th/.test(w)) enScore += 0.5;
        }

        const deDigraphs = filteredText.match(/(sch|pf|tz|ck)/g);
        if (deDigraphs) {
            deScore += 0.3 * deDigraphs.length;
        }

        return { de: deScore, en: enScore };
    }

    function scoreLang(text) {
        const scores = scorePhrase(text);
        return scores.de - scores.en;
    }

    function scoreCharAffinities(text) {
        if (!text) return [];

        const lowerText = text.toLowerCase();
        const len = lowerText.length;
        const rawScores = new Array(len).fill(0);
        const counts = new Array(len).fill(0);

        for (let i = 0; i <= len - 3; i++) {
            const tri = lowerText.substring(i, i + 3);
            
            if (!/^[a-zäöüß]{3}$/.test(tri)) continue;

            const countDe = trigramsDe[tri] || 0;
            const countEn = trigramsEn[tri] || 0;
            const logDe = Math.log((countDe + 1) / (totalDe + 2));
            const logEn = Math.log((countEn + 1) / (totalEn + 2));
            const signedDiff = logDe - logEn;

            for (let j = 0; j < 3; j++) {
                rawScores[i + j] += signedDiff;
                counts[i + j]++;
            }
        }

        const averaged = rawScores.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 0);

        const maxAbs = Math.max(...averaged.map(Math.abs), 1e-9);
        const normalized = averaged.map(v => v / maxAbs);

        const result = [];
        for (let i = 0; i < len; i++) {
            result.push({
                char: text[i],
                affinity: normalized[i]
            });
        }

        return result;
    }

    function getModel() {
        return {
            version: seed.version,
            trigramsDe: trigramsDe,
            trigramsEn: trigramsEn,
            funcDe: Array.from(funcDe),
            funcEn: Array.from(funcEn)
        };
    }

    const modelObj = {
        scorePhrase,
        scoreLang,
        scoreCharAffinities,
        getModel
    };

    return modelObj;
}
