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
    if (!text) return '';
    return text.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function isNewer(remote, local) {
    if (!remote || !local) return false;
    if (remote === local) return false;

    let rStart = remote.charCodeAt(0) === 118 /* 'v' */ ? 1 : 0;
    let lStart = local.charCodeAt(0) === 118 /* 'v' */ ? 1 : 0;

    const rParts = remote.substring(rStart).split('.');
    const lParts = local.substring(lStart).split('.');

    const len = Math.max(rParts.length, lParts.length);
    for (let i = 0; i < len; i++) {
        const rVal = parseInt(rParts[i] || '0', 10);
        const lVal = parseInt(lParts[i] || '0', 10);
        if (rVal > lVal) return true;
        if (rVal < lVal) return false;
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
    // Core German food nouns
    'apfel', 'aubergine', 'auflauf', 'beere', 'blumenkohl', 'bohne', 'braten', 'brokkoli', 'brot', 'brust',
    'brötchen', 'butter', 'chili', 'dessert', 'dip', 'eier', 'eintopf', 'eis', 'erbse', 'erdbeer',
    'essig', 'filet', 'fisch', 'fisole', 'fleckerl', 'fleisch', 'flügel', 'frucht', 'für', 'gebraten',
    'gemüse', 'gewürz', 'gratin', 'grieß', 'gulasch', 'gurke', 'himbeer', 'honig', 'huhn', 'hähnchen',
    'joghurt', 'karotte', 'kartoffel', 'keule', 'kirsch', 'knacker', 'knoblauch', 'knödel', 'kompott',
    'kraut', 'kräuter', 'kuchen', 'käse', 'kürbis', 'lauch', 'mandel', 'milch', 'mild', 'mit',
    'mohn', 'most', 'möhre', 'natur', 'nockerl', 'nudel', 'nuss', 'nuß', 'obst', 'oder',
    'olive', 'paprika', 'pfanne', 'pfannkuchen', 'pfeffer', 'pikant', 'pilz', 'plunder', 'püree', 'ragout',
    'rahm', 'reis', 'rind', 'sahne', 'salami', 'salat', 'salz', 'sauer', 'scharf', 'schinken',
    'schnitte', 'schnitzel', 'schoko', 'schupf', 'schwein', 'sellerie', 'senf', 'sosse', 'soße', 'spargel',
    'spätzle', 'speck', 'spieß', 'spinat', 'steak', 'suppe', 'süß', 'tofu', 'tomate', 'topfen',
    'torte', 'trüffel', 'und', 'vanille', 'vogerl', 'vom', 'wien', 'wurst', 'zucchini', 'zum',
    'zur', 'zwiebel', 'öl',
    // Expanded: German participles & cooking methods
    'paniert', 'gegrillt', 'geräuchert', 'frittiert', 'gedünstet', 'überbacken', 'gekocht', 'gefüllt',
    'geschmort', 'garniert', 'mariniert', 'püriert', 'gewürzt', 'gesalzen', 'gehackt', 'gerieben',
    'gewürfelt', 'passiert', 'gestreift', 'glasiert', 'gratiniert', 'pochiert', 'durchgebraten',
    // Expanded: German meat & sausage
    'bratwurst', 'currywurst', 'leberkäse', 'fleischkäse', 'puten', 'hack', 'frikadelle', 'bulette',
    'klöß', 'würstchen', 'brühwurst', 'leberwurst', 'mettwurst', 'blutwurst', 'roulade',
    'brustfilet', 'lenden', 'bauch', 'kotelett', 'schulter', 'nacken', 'haxe', 'eisbein',
    // Expanded: German fish & seafood
    'lachs', 'backfisch', 'seelachs', 'forelle', 'karpfen', 'zander', 'hecht', 'makrele', 'hering',
    'kabeljau', 'scholle', 'rotbarsch', 'thunfisch', 'fischstäbchen',
    // Expanded: German sides & starches
    'pommes', 'bratkartoffel', 'röstkartoffel', 'schupfnudel', 'bandnudel', 'fingernudel',
    'semmelknödel', 'kartoffelbrei', 'kartoffelpüree', 'kartoffelsalat', 'püree',
    'reis', 'nudel', 'spaghetti', 'lasagne', 'tortellini', 'ravioli', 'gnocchi', 'polenta', 'risotto',
    'spätzle', 'knödel',
    // Expanded: German vegetables & legumes
    'champignon', 'linsen', 'mais', 'erbsen', 'bohnen', 'kichererbse', 'schwarzwurzel',
    'rotkohl', 'weißkohl', 'wirsing', 'mangold', 'fenchel', 'rettich', 'meerrettich', 'kren',
    'spinat', 'blumenkohl', 'brokkoli', 'sellerie', 'spargel', 'pilz', 'zucchini', 'lauch',
    'quark', 'schmand', 'buttermilch', 'dinkel', 'roggen', 'hafer', 'gerste',
    'gurke', 'tomate', 'karotte', 'zwiebel', 'knoblauch', 'paprika', 'kürbis',
    // Expanded: German food adjectives
    'knusprig', 'saftig', 'deftig', 'würzig', 'herzhaft', 'cremig', 'sämig', 'fein',
    'frisch', 'hausgemacht', 'handgemacht', 'selbstgemacht', 'gemischt', 'klassisch',
    'bayerisch', 'fränkisch', 'steirisch', 'tiroler', 'salzburger', 'münchner',
    'thüringer', 'wiener', 'griechisch', 'österreichisch', 'asiatisch', 'indisch',
    'kalorienarm', 'fettreduziert', 'vegetarisch', 'vegan', 'regional', 'saisonal',
    // Expanded: German herbs & seasoning
    'dill', 'petersil', 'schnittlauch', 'majoran', 'thymian', 'rosmarin', 'lorbeer',
    'basilikum', 'oregano', 'kümmel', 'anis', 'zimt', 'nelke', 'muskat',
    'preiselbeer', 'apfelmus', 'ketchup', 'mayonnaise', 'mostrich', 'senf',
    // Expanded: German meal structure
    'portion', 'beilage', 'hauptgericht', 'vorspeise', 'nachspeise', 'nachtisch',
    'stück', 'teller', 'schale', 'becher', 'flasche', 'glas', 'suppe', 'salat',
    // Expanded: German-specific compounds
    'rind', 'schwein', 'huhn', 'puten', 'lamm', 'kalb', 'wild', 'hirsch', 'reh',
    'frikassee', 'ragout', 'gulasch', 'eintopf', 'braten', 'roulade', 'geschnetzeltes',
    'rahm', 'sahne', 'schmand', 'topfen', 'quark', 'käse', 'milch',
    // Expanded: German desserts & baked goods
    'kuchen', 'torte', 'strudel', 'baiser', 'mousse', 'sorbet', 'pudding',
    'palatschinke', 'grieß', 'striezel', 'kipferl', 'buchtel', 'germknödel',
    'schoko', 'nuss', 'mandel', 'marzipan', 'nougat',
    // Expanded: Common German words in menus
    'achtung', 'hinweis', 'allergen', 'kennzeichnung', 'auslobung', 'enthält',
    'älter', 'aktuell', 'täglich', 'wöchentlich', 'monatlich',
    // Expanded: Austrian/German food words & compounds
    'punsch', 'würfel', 'gebäck', 'weiß', 'schöberl', 'würstel',
    'blätter', 'brösel', 'gröstl', 'erdäpfel', 'schmarren',
    'hühner', 'müsli', 'jäger', 'rüben', 'kernöl', 'laibchen',
    'soja', 'erdnuss', 'pizza', 'grün', 'königsberg', 'thailänd',
    // Expanded: German ASCII words (no umlaut, common in Bessa data)
    'spaetzle', 'frittaten', 'semmel', 'kohlrabi', 'melanzani',
    'ananas', 'bananen', 'zitronen', 'saure', 'einlage', 'buchstaben',
    'klein', 'rucola', 'cous', 'mini', 'lasagna', 'creme', 'kokos',
    'auf', 'von', 'menü',
    'gebacken', 'gelb', 'klar', 'orangen', 'garnelen', 'graupen',
];

const EN_STEMS = [
    'almond', 'and', 'apple', 'asparagus', 'bacon', 'baked', 'ball', 'bean', 'beef', 'berry',
    'bread', 'breast', 'broccoli', 'bun', 'cabbage', 'cake', 'caper', 'carrot', 'casserole',
    'cauliflower', 'celery', 'cheese', 'cherry', 'chicken', 'choco', 'chocolate', 'cider', 'cilantro',
    'coffee', 'compote', 'cream', 'cucumber', 'curd', 'danish', 'dumpling', 'egg',
    'eggplant', 'fish', 'for', 'fried', 'from', 'fruit', 'garlic', 'goulash',
    'ham', 'herb', 'honey', 'hot', 'ice', 'jambalaya', 'leek', 'leg', 'mash', 'meat',
    'mexican', 'milk', 'mint', 'mushroom', 'mustard', 'noodle', 'nut', 'oat', 'oil',
    'onion', 'or', 'oven', 'pan', 'pancake', 'pea', 'pepper', 'plain', 'plate',
    'poppy', 'pork', 'potato', 'pumpkin', 'radish', 'raspberry', 'rice', 'roast', 'roll',
    'salad', 'salt', 'sauce', 'sausage', 'shrimp', 'skewer', 'slice', 'soup', 'sour',
    'spice', 'spicy', 'spinach', 'stew', 'strawberr', 'strawberry', 'strudel', 'sweet', 'tart',
    'thyme', 'to', 'tomat', 'tomato', 'truffle', 'trukey', 'turkey', 'vanilla', 'vegan',
    'vegetable', 'vinegar', 'wedge', 'wing', 'with', 'wok', 'yogurt',
    // Expanded: English cooking methods
    'grilled', 'roasted', 'smoked', 'steamed', 'poached', 'braised', 'stuffed', 'breaded',
    'ground', 'minced', 'sliced', 'diced', 'chopped', 'mashed', 'whipped', 'seasoned',
    'barbecued', 'charred', 'seared', 'toasted', 'broiled', 'blanched', 'scrambled',
    // Expanded: English food descriptors
    'crispy', 'crunchy', 'creamy', 'fluffy', 'tender', 'juicy', 'flavorful', 'savory',
    'zesty', 'tangy', 'smoky', 'buttery', 'spiced', 'herbed', 'glazed', 'pickled',
    'fresh', 'local', 'organic', 'seasonal', 'traditional', 'homestyle', 'hearty',
    'light', 'rich', 'golden', 'garden', 'farm', 'country', 'rustic',
    // Expanded: English meal categories
    'appetizer', 'starter', 'entree', 'main', 'side', 'beverage', 'drink',
    'breakfast', 'lunch', 'dinner', 'supper', 'brunch', 'buffet', 'special',
    'choice', 'selection', 'variety', 'assorted', 'combination', 'featured',
    // Expanded: English meat & fish
    'brisket', 'chop', 'cutlet', 'fillet', 'ribs', 'steakhouse', 'jerky', 'pulled',
    'salmon', 'tuna', 'cod', 'halibut', 'bass', 'trout', 'catfish', 'tilapia',
    'lobster', 'crab', 'clam', 'mussel', 'oyster', 'scallop', 'shrimp',
    // Expanded: English international dishes
    'burger', 'burrito', 'taco', 'quesadilla', 'nachos', 'fajita', 'enchilada',
    'curry', 'stirfry', 'chowder', 'bisque', 'gumbo', 'jambalaya', 'bouillon',
    'gravy', 'broth', 'stock', 'marinade', 'vinaigrette', 'dressing',
    // Expanded: English soups & stews
    'chowder', 'bisque', 'gumbo', 'bouillon', 'consomme', 'minestrone', 'gazpacho',
    // Expanded: English dairy & grains
    'cheddar', 'mozzarella', 'parmesan', 'provolone', 'gouda', 'swiss', 'bluecheese',
    'feta', 'creamcheese', 'cottagecheese', 'sourcream',
    'pasta', 'spaghetti', 'fettuccine', 'linguine', 'penne', 'rigatoni', 'macaroni',
    'couscous', 'quinoa', 'barley', 'farro', 'bulgur', 'semolina',
    // Expanded: English condiments
    'ketchup', 'mustard', 'mayonnaise', 'relish', 'salsa', 'guacamole', 'pesto',
    'hummus', 'tahini', 'tzatziki', 'aioli', 'remoulade',
    // Expanded: English adjectives for menus
    'daily', 'weekly', 'special', 'featured', 'popular', 'signature', 'classic',
    'traditional', 'contemporary', 'modern', 'spicy', 'mild', 'hot', 'warm',
    'chilled', 'iced', 'cold', 'roomtemperature',
    // Expanded: English utility words
    'from', 'with', 'and', 'for', 'or', 'to', 'in', 'on', 'of', 'all',
    'your', 'our', 'the', 'a', 'an', 'per', 'each', 'every',
    'choose', 'select', 'add', 'extra', 'share', 'enjoy',
    // Expanded: English foods, adjectives & descriptors
    'lemon', 'garnish', 'patties', 'corn', 'indian', 'ginger',
    'green', 'cubes', 'spring', 'white', 'pineapple', 'apricot',
    'cordon', 'bleu', 'chickpea', 'seed', 'dip', 'punch',
    'banana', 'pizza', 'mango', 'bowl', 'butter',
    'millet', 'parsley', 'fennel', 'arugula', 'basil', 'red',
    'lentil', 'parsnip', 'stripes',
    'cous', 'mini', 'lasagna', 'menu',
    'buckwheat', 'sheep', 'lime', 'bell', 'caramel', 'dough',
    'clear', 'dripping', 'orange',
];

const BOTH_SET = new Set(DE_STEMS.filter(w => EN_STEMS.includes(w)));
const DE_SET = new Set(DE_STEMS);
const EN_SET = new Set(EN_STEMS);
const DE_REGEX = new RegExp(DE_STEMS.slice().sort((a, b) => b.length - a.length).join('|'), 'g');
const EN_REGEX = new RegExp(EN_STEMS.slice().sort((a, b) => b.length - a.length).join('|'), 'g');

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
                // Skip neutral words that appear in both languages equally
                if (BOTH_SET.has(w)) return;

                let bestDeMatch = 0;
                let bestEnMatch = 0;
                if (DE_SET.has(w)) bestDeMatch = w.length;
                else {
                    const deMatch = w.match(DE_REGEX);
                    if (deMatch) deMatch.forEach(m => { if (m.length > bestDeMatch) bestDeMatch = m.length; });
                }

                if (EN_SET.has(w)) bestEnMatch = w.length;
                else {
                    const enMatch = w.match(EN_REGEX);
                    if (enMatch) enMatch.forEach(m => { if (m.length > bestEnMatch) bestEnMatch = m.length; });
                }

                if (bestDeMatch > 0) de += (bestDeMatch / w.length);
                if (bestEnMatch > 0) en += (bestEnMatch / w.length);

                // Capitalization bonus: only for words with German-specific features
                if (/^[A-ZÄÖÜ]/.test(word) && word.length >= 4) {
                    const w_lower = word.toLowerCase();
                    // German noun/adjective suffixes
                    if (/(?:ung|keit|heit|chen|lein|schaft|tum|nis|ling|lich|ig|bar|sam|haft|los)$/.test(w_lower)) {
                        de += 0.3;
                    } else if (/[äöüß]/.test(w_lower)) {
                        de += 0.15;
                    }
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
            if (/^[A-ZÄÖÜ]/.test(rightFirstWord) && rightFirstWord.length >= 4) {
                // Only give bonus if the capitalized word looks German
                const w_lower = rightFirstWord.toLowerCase();
                if (DE_SET.has(w_lower) || DE_REGEX.test(w_lower)) {
                    capitalBonus = 0.3;
                } else if (/(?:ung|keit|heit|chen|lein|schaft|tum|nis|ling|lich|ig|bar|sam|haft|los)$/.test(w_lower)) {
                    capitalBonus = 0.3;
                } else if (/[äöüß]/.test(w_lower)) {
                    capitalBonus = 0.2;
                }
            }

            const score = (leftScore.en - leftScore.de) + (rightScore.de - rightScore.en) + capitalBonus;

            const leftLooksEnglish = (leftScore.en > leftScore.de) && (leftScore.en > 0);
            const rightLooksGerman = (rightScore.de + capitalBonus) > rightScore.en;

            if (leftLooksEnglish && rightLooksGerman && score > maxScore) {
                maxScore = score;
                bestK = k;
            }
        }

        // Minimum confidence threshold — avoid false splits
        const MIN_SPLIT_CONFIDENCE = 1.5;
        if (bestK !== -1 && maxScore > MIN_SPLIT_CONFIDENCE) {
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
            // Interleave: part[0] = DE1, part[1] = EN1 (+ optional DE2), part[2] = EN2 (+ optional DE3), ...
            // Collect DE and EN courses separately
            const dePartsThis = [slashParts[0].trim()];
            const enPartsThis = [];

            for (let i = 1; i < slashParts.length; i++) {
                const part = slashParts[i].trim();
                const splitResult = heuristicSplitEnDe(part);

                if (splitResult.nextDe) {
                    // Front is EN, back is DE (e.g., "Soup" + "Salat")
                    enPartsThis.push(splitResult.enPart);
                    dePartsThis.push(splitResult.nextDe);
                } else if (i === slashParts.length - 1) {
                    // Last part: if multi-word with capitalized last word not purely English,
                    // split last word as DE course (e.g., "Salad Dessert" → EN="Salad", DE="Dessert")
                    const words = part.split(/\s+/);
                    if (words.length >= 2 && /^[A-ZÄÖÜ]/.test(words[words.length - 1]) && words[words.length - 1].length >= 3) {
                        const deGuess = words[words.length - 1];
                        const w = deGuess.toLowerCase().replace(/[^a-zäöüß]/g, '');
                        if (!(EN_SET.has(w) && !DE_SET.has(w))) {
                            enPartsThis.push(words.slice(0, -1).join(' '));
                            dePartsThis.push(deGuess);
                            continue;
                        }
                    }
                    // Default: this part is pure EN
                    enPartsThis.push(part);
                } else {
                    enPartsThis.push(part);
                }
            }

            // Pair DE/EN courses by index
            const pairCount = Math.min(dePartsThis.length, enPartsThis.length);
            for (let i = 0; i < pairCount; i++) {
                const deP = dePartsThis[i].includes(allergenTxt.trim()) ? dePartsThis[i] : dePartsThis[i] + allergenTxt;
                const enP = enPartsThis[i].includes(allergenTxt.trim()) ? enPartsThis[i] : enPartsThis[i] + allergenTxt;
                deParts.push(deP);
                enParts.push(enP);
            }
            // Unpaired surplus courses → duplicate to both
            for (let i = pairCount; i < dePartsThis.length; i++) {
                const p = dePartsThis[i].includes(allergenTxt.trim()) ? dePartsThis[i] : dePartsThis[i] + allergenTxt;
                deParts.push(p);
                enParts.push(p);
            }
            for (let i = pairCount; i < enPartsThis.length; i++) {
                const p = enPartsThis[i].includes(allergenTxt.trim()) ? enPartsThis[i] : enPartsThis[i] + allergenTxt;
                deParts.push(p);
                enParts.push(p);
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

    // Bessa hat immer max. 3 Kurse: Suppe/Vorspeise, Hauptgericht, Nachspeise
    // Wenn der Split >3 produziert, ist die Heuristik falsch abgebogen → fall back to raw
    if (deParts.length > 3 || enParts.length > 3) {
        return { de: formattedRaw || raw, en: formattedRaw || raw, raw: formattedRaw };
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

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
