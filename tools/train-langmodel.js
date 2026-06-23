const fs = require('fs');

const args = process.argv.slice(2);
const inputFile = args[0] || 'tests/test_kantine_menuCache.json';
const outputFile = args[1];

function isValidAllergen(content) {
    if (typeof content !== 'string' || !content) return false;
    return /^[A-Z](\s*,?\s*[A-Z])*$/.test(content.trim());
}

function normalize(text) {
    let modifiedText = text;
    // 1. Repair allergen-internal slashes: (A/F/N) -> (AFN)
    modifiedText = modifiedText.replace(/\(([A-Z](?:\/[A-Z])+)\)/g, (match, p1) => {
        return '(' + p1.replace(/\//g, '') + ')';
    });
    // 2. Repair slash-before-allergen: /ACLM) -> (ACLM)
    modifiedText = modifiedText.replace(/\/([A-Z]{1,8})\)/g, '($1)');
    // 3. Collapse whitespace
    modifiedText = modifiedText.replace(/\s{2,}/g, ' ').trim();
    return modifiedText;
}

function getTrigrams(str) {
    const cleaned = str.toLowerCase().replace(/[^a-zäöüß]/g, '');
    const trigrams = [];
    for (let i = 0; i <= cleaned.length - 3; i++) {
        trigrams.push(cleaned.slice(i, i + 3));
    }
    return trigrams;
}

function main() {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    } catch (e) {
        console.error("Error reading input file:", e.message);
        process.exit(1);
    }

    const items = [];
    for (const obj of data) {
        for (const day of (obj.days || [])) {
            for (const item of (day.items || [])) {
                if (item.description) items.push(item.description);
            }
        }
    }

    const pairs = [];
    for (const raw of items) {
        const text = normalize(raw);
        const tokens = text.split(/(\([^)]+\))/);
        let currentCourse = "";
        const courses = [];
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (t.startsWith('(') && t.endsWith(')')) {
                const inner = t.slice(1, -1);
                if (isValidAllergen(inner)) {
                    currentCourse += " " + t;
                    courses.push(currentCourse.trim());
                    currentCourse = "";
                    continue;
                }
            }
            currentCourse += t;
        }
        if (currentCourse.trim()) {
            courses.push(currentCourse.trim());
        }

        for (let course of courses) {
            // Strip allergen from the end
            course = course.replace(/\(\s*[A-Z,\s]*\s*\)$/i, '').trim();
            const slashIdx = course.indexOf('/');
            if (slashIdx !== -1) {
                const de = course.slice(0, slashIdx).trim();
                const en = course.slice(slashIdx + 1).trim();
                if (de && en) {
                    pairs.push({ de, en });
                }
            }
        }
    }

    const deCount = {};
    const enCount = {};

    for (const pair of pairs) {
        for (const t of getTrigrams(pair.de)) {
            deCount[t] = (deCount[t] || 0) + 1;
        }
        for (const t of getTrigrams(pair.en)) {
            enCount[t] = (enCount[t] || 0) + 1;
        }
    }

    const allTrigrams = new Set([...Object.keys(deCount), ...Object.keys(enCount)]);
    const scoredDe = [];
    const scoredEn = [];

    for (const t of allTrigrams) {
        const d = deCount[t] || 0;
        const e = enCount[t] || 0;
        const pDe = d / (d + e + 1);
        
        // Discriminant power is |P(DE|t) - 0.5|
        // To get top DE: sort by highest P(DE|t), which implies highest discriminant where P(DE|t) > 0.5
        scoredDe.push({ t, score: pDe - 0.5 });
        // To get top EN: sort by highest P(EN|t), which implies highest discriminant where P(EN|t) > 0.5
        scoredEn.push({ t, score: 0.5 - pDe });
    }

    scoredDe.sort((a, b) => b.score - a.score);
    scoredEn.sort((a, b) => b.score - a.score);

    const selectedDe = scoredDe.slice(0, 500).map(x => x.t).sort();
    const selectedEn = scoredEn.slice(0, 500).map(x => x.t).sort();

    const trigramsDe = {};
    const trigramsEn = {};

    for (const t of selectedDe) {
        if (deCount[t]) trigramsDe[t] = deCount[t];
    }
    for (const t of selectedEn) {
        if (enCount[t]) trigramsEn[t] = enCount[t];
    }

    const funcDe = ['mit', 'und', 'auf', 'von', 'vom', 'nach', 'in', 'an', 'zu', 'aus', 'bei', 'für', 'über', 'unter'];
    const funcEn = ['with', 'and', 'on', 'from', 'the', 'of', 'in', 'a', 'an', 'to', 'at', 'by', 'for'];

    let version = "1.0";
    try {
        const v = fs.readFileSync('version.txt', 'utf8').split('\n')[0].trim();
        if (v) version = v;
    } catch (e) {}

    const out = {
        version,
        trigramsDe,
        trigramsEn,
        funcDe,
        funcEn
    };

    const json = JSON.stringify(out, null, 2);

    if (outputFile) {
        fs.writeFileSync(outputFile, json, 'utf8');
    } else {
        console.log(json);
    }
}

main();