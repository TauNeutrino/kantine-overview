const DE_STEMS = [
    'mit','und','oder','für','vom','zum','zur','gebraten','kartoffel','gemüse','suppe',
    'kuchen','schwein','rind','hähnchen','huhn','fisch','nudel','soße','sosse','wurst',
    'kürbis','braten','sahne','apfel','käse','fleisch','pilz','kirsch','joghurt','spätzle',
    'knödel','kraut','schnitzel','püree','rahm','erdbeer','schoko','vanille','tomate',
    'gurke','salat','zwiebel','paprika','reis','bohne','erbse','karotte','möhre','lauch',
    'knoblauch','chili','gewürz','kräuter','pfeffer','salz','butter','milch','eier',
    'pfanne','auflauf','gratin','ragout','gulasch','eintopf','filet','steak','brust',
    'salami','schinken','speck','brokkoli','blumenkohl','zucchini','aubergine',
    'spinat','spargel','olive','mandel','nuss','honig','senf','essig','öl','brot',
    'brötchen','pfannkuchen','eis','torte','dessert','kompott','obst','frucht','beere',
    'plunder', 'dip'
];
const EN_STEMS = [
    'with','and','or','for','from','to','fried','potato','vegetable','soup','cake',
    'pork','beef','chicken','fish','noodle','sauce','sausage','pumpkin','roast',
    'cream','apple','cheese','meat','mushroom','cherry','yogurt','wedge','sweet',
    'sour','dumpling','cabbage','mash','strawberr','choco','vanilla','tomat','cucumber',
    'salad','onion','pepper','rice','bean','pea','carrot','leek','garlic','chili',
    'spice','herb','salt','butter','milk','egg','pan','casserole','gratin','ragout',
    'goulash','stew','filet','steak','breast','salami','ham','bacon','broccoli',
    'cauliflower','zucchini','eggplant','spinach','asparagus','olive','almond','nut',
    'honey','mustard','vinegar','oil','bread','bun','pancake','ice','tart','dessert',
    'compote','fruit','berry', 'dip', 'danish'
];

function splitLanguage(text) {
    if (!text) return { de: '', en: '', raw: '' };

    const raw = text;
    const formattedRaw = '• ' + text.replace(/\(([A-Z ]+)\)\s*(?=\S)/g, '($1)\n• ');

    function scoreBlock(wordArray) {
        let de = 0, en = 0;
        wordArray.forEach(word => {
            const w = word.toLowerCase().replace(/[^a-zäöüß]/g, '');
            if (w) {
                DE_STEMS.forEach(s => { if (w.includes(s)) de += w.length / s.length; });
                EN_STEMS.forEach(s => { if (w.includes(s)) en += w.length / s.length; });
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

            // Left side is EN, right side is DE. We want EN words on left, DE words on right.
            const score = (leftScore.en - leftScore.de) + (rightScore.de - rightScore.en);

            if (score > maxScore) {
                maxScore = score;
                bestK = k;
            }
        }

        if (bestK !== -1 && maxScore > 0) {
            return {
                enPart: words.slice(0, bestK).join(' '),
                nextDe: words.slice(bestK).join(' ')
            };
        }
        return { enPart: fragment, nextDe: '' };
    }

    if (!text.includes(' / ')) {
        const words = text.toLowerCase().split(/\s+/);
        const score = scoreBlock(words);
        if (score.en > score.de) {
            return { de: '', en: formattedRaw, raw: formattedRaw };
        }
        return { de: formattedRaw, en: '', raw: formattedRaw };
    }

    const parts = text.split(' / ');
    if (parts.length > 4) {
        return { de: formattedRaw, en: '', raw: formattedRaw };
    }

    const deParts = [];
    const enParts = [];

    deParts.push(parts[0].trim());

    const allergenRegex = /\(([A-Z ]+)\)\s*/;

    for (let i = 1; i < parts.length; i++) {
        const fragment = parts[i].trim();
        const match = fragment.match(allergenRegex);

        if (match) {
            const allergenEnd = match.index + match[0].length;
            const enPart = fragment.substring(0, match.index).trim();
            const allergenCode = match[1];
            const nextDe = fragment.substring(allergenEnd).trim();

            enParts.push(enPart + '(' + allergenCode + ')');
            if (deParts.length > 0) {
                deParts[deParts.length - 1] = deParts[deParts.length - 1] + '(' + allergenCode + ')';
            }

            if (nextDe) {
                deParts.push(nextDe);
            }
        } else {
            console.log("No allergen match in:", fragment);
            const split = heuristicSplitEnDe(fragment);
            console.log("Split:", split);
            enParts.push(split.enPart);
            if (split.nextDe) {
                deParts.push(split.nextDe);
            }
        }
    }

    return {
        de: deParts.map(p => '• ' + p).join('\n'),
        en: enParts.map(p => '• ' + p).join('\n'),
        raw: formattedRaw
    };
}

console.log(splitLanguage("Hühnersuppe mit Reis / Chicken soup with rice Jambalaya mit Tofu und Joghurtdip / Jambalaya with  tofu and yogurt dip Mini Plunder / Mini danishes(ACGHO)"));
