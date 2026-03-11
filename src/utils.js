import { langMode } from './state.js';

export function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function getWeekYear(d) {
    const date = new Date(d.getTime());
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    return date.getFullYear();
}

/**
 * Translates an English day name to the UI language.
 * Returns German by default; returns English when langMode is 'en'.
 * @param {string} englishDay - Day name in English (e.g. 'Monday')
 * @returns {string} Translated day name
 */
export function translateDay(englishDay) {
    if (langMode === 'en') return englishDay;
    const map = { Monday: 'Montag', Tuesday: 'Dienstag', Wednesday: 'Mittwoch', Thursday: 'Donnerstag', Friday: 'Freitag', Saturday: 'Samstag', Sunday: 'Sonntag' };
    return map[englishDay] || englishDay;
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

export function isNewer(remote, local) {
    if (!remote || !local) return false;
    const r = remote.replace(/^v/, '').split('.').map(Number);
    const l = local.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(r.length, l.length); i++) {
        if ((r[i] || 0) > (l[i] || 0)) return true;
        if ((r[i] || 0) < (l[i] || 0)) return false;
    }
    return false;
}

export function getRelativeTime(date) {
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'gerade eben';
    if (diffMin === 1) return 'vor 1 min.';
    if (diffMin < 60) return `vor ${diffMin} min.`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH === 1) return 'vor 1 Std.';
    return `vor ${diffH} Std.`;
}

// === Language Filter (FR-100) ===
const DE_STEMS = [
    'apfel', 'achtung', 'aubergine', 'auflauf', 'beere', 'blumenkohl', 'bohne', 'braten', 'brokkoli', 'brot', 'brust',
    'brötchen', 'butter', 'chili', 'dessert', 'dip', 'eier', 'eintopf', 'eis', 'erbse', 'erdbeer',
    'essig', 'filet', 'fisch', 'fisole', 'fleckerl', 'fleisch', 'flügel', 'frucht', 'für', 'gebraten',
    'gemüse', 'gewürz', 'gratin', 'grieß', 'gulasch', 'gurke', 'himbeer', 'honig', 'huhn', 'hähnchen',
    'jambalaya', 'joghurt', 'karotte', 'kartoffel', 'keule', 'kirsch', 'knacker', 'knoblauch', 'knödel', 'kompott',
    'kraut', 'kräuter', 'kuchen', 'käse', 'kürbis', 'lauch', 'mandel', 'milch', 'mild', 'mit',
    'mohn', 'most', 'möhre', 'natur', 'nockerl', 'nudel', 'nuss', 'nuß', 'obst', 'oder',
    'olive', 'paprika', 'pfanne', 'pfannkuchen', 'pfeffer', 'pikant', 'pilz', 'plunder', 'püree', 'ragout',
    'rahm', 'reis', 'rind', 'sahne', 'salami', 'salat', 'salz', 'sauer', 'scharf', 'schinken',
    'schnitte', 'schnitzel', 'schoko', 'schupf', 'schwein', 'sellerie', 'senf', 'sosse', 'soße', 'spargel',
    'spätzle', 'speck', 'spieß', 'spinat', 'steak', 'suppe', 'süß', 'tofu', 'tomate', 'topfen',
    'torte', 'trüffel', 'und', 'vanille', 'vogerl', 'vom', 'wien', 'wurst', 'zucchini', 'zum',
    'zur', 'zwiebel', 'öl'
];

const EN_STEMS = [
    'almond', 'and', 'apple', 'asparagus', 'bacon', 'baked', 'ball', 'bean', 'beef', 'berry',
    'bread', 'breast', 'broccoli', 'bun', 'butter', 'cabbage', 'cake', 'caper', 'carrot', 'casserole',
    'cauliflower', 'celery', 'cheese', 'cherry', 'chicken', 'chili', 'choco', 'chocolate', 'cider', 'cilantro',
    'coffee', 'compote', 'cream', 'cucumber', 'curd', 'danish', 'dessert', 'dip', 'dumpling', 'egg',
    'eggplant', 'filet', 'fish', 'for', 'fried', 'from', 'fruit', 'garlic', 'goulash', 'gratin',
    'ham', 'herb', 'honey', 'hot', 'ice', 'jambalaya', 'leek', 'leg', 'mash', 'meat',
    'mexican', 'mild', 'milk', 'mint', 'mushroom', 'mustard', 'noodle', 'nut', 'oat', 'oil',
    'olive', 'onion', 'or', 'oven', 'pan', 'pancake', 'pea', 'pepper', 'plain', 'plate',
    'poppy', 'pork', 'potato', 'pumpkin', 'radish', 'ragout', 'raspberry', 'rice', 'roast', 'roll',
    'salad', 'salami', 'salt', 'sauce', 'sausage', 'shrimp', 'skewer', 'slice', 'soup', 'sour',
    'spice', 'spicy', 'spinach', 'steak', 'stew', 'strawberr', 'strawberry', 'strudel', 'sweet', 'tart',
    'thyme', 'to', 'tofu', 'tomat', 'tomato', 'truffle', 'trukey', 'turkey', 'vanilla', 'vegan',
    'vegetable', 'vinegar', 'wedge', 'wing', 'with', 'wok', 'yogurt', 'zucchini'
];

export function splitLanguage(text) {
    if (!text) return { de: '', en: '', raw: '' };

    const raw = text;
    let formattedRaw = text.replace(/(?:\(|(?:\/|\s|^))([A-Z,]+)\)\s*(?=\S)(?!\s*\/)/g, '($1)\n• ');
    if (!formattedRaw.startsWith('• ')) {
        formattedRaw = '• ' + formattedRaw;
    }

    function scoreBlock(wordArray) {
        let de = 0, en = 0;
        wordArray.forEach(word => {
            const w = word.toLowerCase().replace(/[^a-zäöüß]/g, '');
            if (w) {
                let bestDeMatch = 0;
                let bestEnMatch = 0;
                if (DE_STEMS.includes(w)) bestDeMatch = w.length;
                else DE_STEMS.forEach(s => { if (w.includes(s) && s.length > bestDeMatch) bestDeMatch = s.length; });

                if (EN_STEMS.includes(w)) bestEnMatch = w.length;
                else EN_STEMS.forEach(s => { if (w.includes(s) && s.length > bestEnMatch) bestEnMatch = s.length; });

                if (bestDeMatch > 0) de += (bestDeMatch / w.length);
                if (bestEnMatch > 0) en += (bestEnMatch / w.length);

                if (/^[A-ZÄÖÜ]/.test(word)) {
                    de += 0.5;
                }
            }
        });
        return { de, en };
    }

    function heuristicSplitEnDe(fragment) {
        const words = fragment.trim().split(/\s+/);
        if (words.length < 2) return { enPart: fragment, nextDe: '' };

        let bestK = -1;
        let maxScore = -9999;

        for (let k = 1; k < words.length; k++) {
            const left = words.slice(0, k);
            const right = words.slice(k);

            const leftScore = scoreBlock(left);
            const rightScore = scoreBlock(right);

            const rightFirstWord = right[0];
            let capitalBonus = 0;
            if (/^[A-ZÄÖÜ]/.test(rightFirstWord)) {
                capitalBonus = 1.0;
            }

            const score = (leftScore.en - leftScore.de) + (rightScore.de - rightScore.en) + capitalBonus;

            const leftLooksEnglish = (leftScore.en > leftScore.de) || (leftScore.en > 0);
            const rightLooksGerman = (rightScore.de + capitalBonus) > rightScore.en;

            if (leftLooksEnglish && rightLooksGerman && score > maxScore) {
                maxScore = score;
                bestK = k;
            }
        }

        if (bestK !== -1) {
            return {
                enPart: words.slice(0, bestK).join(' '),
                nextDe: words.slice(bestK).join(' ')
            };
        }
        return { enPart: fragment, nextDe: '' };
    }

    const allergenRegex = /(.*?)(?:\(|(?:\/|\s|^))([A-Z,]+)\)\s*(?!\s*[/])/g;
    let match;
    const rawCourses = [];
    let lastScanIndex = 0;

    while ((match = allergenRegex.exec(text)) !== null) {
        if (match.index > lastScanIndex) {
            rawCourses.push(text.substring(lastScanIndex, match.index).trim());
        }
        rawCourses.push(match[0].trim());
        lastScanIndex = allergenRegex.lastIndex;
    }
    if (lastScanIndex < text.length) {
        rawCourses.push(text.substring(lastScanIndex).trim());
    }
    if (rawCourses.length === 0 && text.trim() !== '') {
        rawCourses.push(text.trim());
    }

    const deParts = [];
    const enParts = [];

    for (let course of rawCourses) {
        let courseMatch = course.match(/(.*?)(?:\(|(?:\/|\s|^))([A-Z,]+)\)\s*$/);
        let courseText = course;
        let allergenTxt = "";
        let allergenCode = "";

        if (courseMatch) {
            courseText = courseMatch[1].trim();
            allergenCode = courseMatch[2];
            allergenTxt = ` (${allergenCode})`;
        }

        const slashParts = courseText.split(/\s*\/\s*(?![A-Z,]+$)/);

        if (slashParts.length >= 2) {
            const deCandidate = slashParts[0].trim();
            let enCandidate = slashParts.slice(1).join(' / ').trim();

            const nestedSplit = heuristicSplitEnDe(enCandidate);
            if (nestedSplit.nextDe) {
                deParts.push(deCandidate + allergenTxt);
                enParts.push(nestedSplit.enPart + allergenTxt);

                const nestedDe = nestedSplit.nextDe + allergenTxt;
                deParts.push(nestedDe);
                enParts.push(nestedDe);
            } else {
                const enFinal = enCandidate + allergenTxt;
                const deFinal = deCandidate.includes(allergenTxt.trim()) ? deCandidate : (deCandidate + allergenTxt);

                deParts.push(deFinal);
                enParts.push(enFinal);
            }
        } else {
            const heuristicSplit = heuristicSplitEnDe(courseText);
            if (heuristicSplit.nextDe) {
                enParts.push(heuristicSplit.enPart + allergenTxt);
                deParts.push(heuristicSplit.nextDe + allergenTxt);
            } else {
                deParts.push(courseText + allergenTxt);
                enParts.push(courseText + allergenTxt);
            }
        }
    }

    let deJoined = deParts.join('\n• ');
    if (deParts.length > 0 && !deJoined.startsWith('• ')) deJoined = '• ' + deJoined;

    let enJoined = enParts.join('\n• ');
    if (enParts.length > 0 && !enJoined.startsWith('• ')) enJoined = '• ' + enJoined;

    return {
        de: deJoined,
        en: enJoined,
        raw: formattedRaw
    };
}

export function getLocalizedText(text) {
    if (langMode === 'all') return text || '';
    const split = splitLanguage(text);
    if (langMode === 'en') return split.en || split.raw;
    return split.de || split.raw;
}
