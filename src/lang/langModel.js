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
        const alphaWords = lowerText.match(/[a-zäöüß]+/g) || [];

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

        const umlauts = lowerText.match(/[äöüß]/g);
        if (umlauts) {
            deScore += 0.5 * umlauts.length;
        }

        for (const w of alphaWords) {
            if (/(ung|suppe|chen|kartoffel|schnitzel)$/.test(w)) deScore += 1.0;
            if (/(ing|ed)$/.test(w)) enScore += 0.5;
            if (/^th/.test(w)) enScore += 0.5;
        }

        const deDigraphs = lowerText.match(/(sch|pf|tz|ck)/g);
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

    function mergeDelta(delta) {
        if (!delta) return modelObj;
        for (const [k, v] of Object.entries(delta)) {
            trigramsDe[k] = (trigramsDe[k] || 0) + v;
            totalDe += v;
        }
        return modelObj;
    }

    let learnedDelta = { trigramsDe: {}, trigramsEn: {} };

    function learnFromCourse(course, splitResult, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (course.anchored === true && splitResult.label === 'high') {
            const extractTrigrams = (text) => {
                const map = {};
                if (!text) return map;
                const lowerText = text.toLowerCase();
                const alphaWords = lowerText.match(/[a-zäöüß]+/g) || [];
                for (const w of alphaWords) {
                    for (let i = 0; i <= w.length - 3; i++) {
                        const tri = w.substring(i, i + 3);
                        map[tri] = (map[tri] || 0) + 1;
                    }
                }
                return map;
            };

            const newDe = extractTrigrams(course.de);
            const newEn = extractTrigrams(course.en);

            for (const [tri, count] of Object.entries(newDe)) {
                learnedDelta.trigramsDe[tri] = (learnedDelta.trigramsDe[tri] || 0) + count;
                trigramsDe[tri] = (trigramsDe[tri] || 0) + count;
                totalDe += count;
            }
            for (const [tri, count] of Object.entries(newEn)) {
                learnedDelta.trigramsEn[tri] = (learnedDelta.trigramsEn[tri] || 0) + count;
                trigramsEn[tri] = (trigramsEn[tri] || 0) + count;
                totalEn += count;
            }
        }
    }

    function loadDelta(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) return;
        try {
            const dataStr = storage.getItem('kantine_lang_model_delta');
            if (dataStr) {
                const delta = JSON.parse(dataStr);
                if (delta.modelVersion !== seed.version) {
                    storage.removeItem('kantine_lang_model_delta');
                } else {
                    learnedDelta = {
                        trigramsDe: delta.trigramsDe || {},
                        trigramsEn: delta.trigramsEn || {}
                    };
                    for (const [k, v] of Object.entries(learnedDelta.trigramsDe)) {
                        trigramsDe[k] = (trigramsDe[k] || 0) + v;
                        totalDe += v;
                    }
                    for (const [k, v] of Object.entries(learnedDelta.trigramsEn)) {
                        trigramsEn[k] = (trigramsEn[k] || 0) + v;
                        totalEn += v;
                    }
                }
            }
        } catch(e) {}
    }

    function saveDelta(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) return;

        let delta = {
            modelVersion: seed.version,
            trigramsDe: { ...learnedDelta.trigramsDe },
            trigramsEn: { ...learnedDelta.trigramsEn }
        };

        const tryStringify = () => JSON.stringify(delta);

        let str = tryStringify();
        if (str.length > 50 * 1024) {
            const allKeys = new Set([...Object.keys(delta.trigramsDe), ...Object.keys(delta.trigramsEn)]);
            const entries = Array.from(allKeys).map(k => {
                const w = Math.abs((trigramsDe[k] || 0) - (trigramsEn[k] || 0));
                return { k, weight: w };
            });
            entries.sort((a, b) => a.weight - b.weight);

            while (str.length > 50 * 1024 && entries.length > 0) {
                const evicted = entries.shift();
                delete delta.trigramsDe[evicted.k];
                delete delta.trigramsEn[evicted.k];
                str = tryStringify();
            }
            learnedDelta.trigramsDe = delta.trigramsDe;
            learnedDelta.trigramsEn = delta.trigramsEn;
        }

        try {
            storage.setItem('kantine_lang_model_delta', str);
        } catch(e) {}
    }

    const modelObj = {
        scorePhrase,
        scoreLang,
        scoreCharAffinities,
        getModel,
        mergeDelta,
        learnFromCourse,
        loadDelta,
        saveDelta
    };

    return modelObj;
}
