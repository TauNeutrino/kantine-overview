export function isValidAllergen(content) {
    if (typeof content !== 'string' || !content) return false;
    return /^[A-Z](\s*,?\s*[A-Z])*$/.test(content.trim());
}

/**
 * Closes an allergen parenthesis whose closing ')' is missing mid-text
 * (source field corruption, e.g. "soup(GLM  Salat mit ...").
 * A '(' whose content runs to the next '(' without a ')' is unclosed; if its
 * content starts with an uppercase-only token (allergen-code shape, 1-8
 * letters) followed by whitespace and real dish text (lowercase letters),
 * the paren is closed right after the token. Anything else is left as-is —
 * the trailing truncated paren case stays with the dedicated step 3b.
 * @param {string} text
 * @returns {string}
 */
function closeUnclosedAllergenParens(text) {
    if (!text || typeof text !== 'string') return text;
    let out = '';
    let i = 0;
    while (i < text.length) {
        const ch = text[i];
        out += ch;
        if (ch !== '(') {
            i++;
            continue;
        }
        // Content of this paren: up to the next '(' or ')', whichever comes first
        let j = i + 1;
        while (j < text.length && text[j] !== '(' && text[j] !== ')') j++;
        if (j < text.length && text[j] === ')') {
            // Properly closed — copy verbatim
            out += text.slice(i + 1, j + 1);
            i = j + 1;
            continue;
        }
        // Unclosed (next '(' or end of text): try to repair
        const content = text.slice(i + 1, j);
        const m = content.match(/^([A-Z]{1,8})\s+/);
        if (m && /[a-zäöüß]/.test(content.slice(m[0].length))) {
            out += m[1] + ') ' + content.slice(m[0].length);
        } else {
            out += content;
        }
        i = j;
    }
    return out;
}

export function normalize(text) {
    let modifiedText = text;
    let notes = [];

    // 1. Repair allergen-internal slashes: (A/F/N) -> (AFN)
    modifiedText = modifiedText.replace(/\(([A-Z](?:\/[A-Z])+)\)/g, (match, p1) => {
        return '(' + p1.replace(/\//g, '') + ')';
    });

    // 2. Repair slash-before-allergen: /ACLM) -> (ACLM)
    modifiedText = modifiedText.replace(/\/([A-Z]{1,8})\)/g, '($1)');

    // 2b. Close an allergen parenthesis whose ')' was dropped by the source,
    //     e.g. "soup(GLM  Salat mit ..." -> "soup(GLM) Salat mit ...".
    //     An unclosed paren mid-text otherwise swallows the following dishes
    //     into one paren group, hiding the top-level '/' dish separators.
    modifiedText = closeUnclosedAllergenParens(modifiedText);

    // 4. Detect and park notes (doing it before step 3 to use the 6 spaces rule)
    
    // Pass 1: Extract "Achtung Änderung" specifically as requested
    const aaRegex = /Achtung Änderung/gi;
    const aaMatches = modifiedText.match(aaRegex);
    if (aaMatches) {
        aaMatches.forEach(m => {
            notes.push(m.trim());
            modifiedText = modifiedText.replace(m, ' ');
        });
    }

    // Pass 2: Detect based on combinations
    let parts = modifiedText.split(/ {6,}/);
    if (parts.length > 1) {
        let lastPart = parts[parts.length - 1];
        let hasA = /!!!|!{3,}/.test(lastPart);
        let hasB = /[A-ZÄÖÜ]{6,}/.test(lastPart);
        let hasC = /ACHTUNG|Achtung|Änderung|ABHOLUNG|WERKSRESTAURANT/i.test(lastPart);
        let hasD = !lastPart.includes(' / ') && !isValidAllergen(lastPart.replace(/[()]/g, ''));
        
        if ((hasA && hasB) || (hasA && hasC) || (hasB && hasC) || (hasD && hasC)) {
            notes.push(lastPart.trim());
            modifiedText = modifiedText.substring(0, modifiedText.lastIndexOf(lastPart)).trim();
        }
    } else {
        let exclIndex = modifiedText.indexOf('!!!');
        if (exclIndex !== -1) {
            let lastPart = modifiedText.substring(exclIndex);
            let hasA = true;
            let hasB = /[A-ZÄÖÜ]{6,}/.test(lastPart);
            let hasC = /ACHTUNG|Achtung|Änderung|ABHOLUNG|WERKSRESTAURANT/i.test(lastPart);
            let hasD = false;
            
            if ((hasA && hasB) || (hasA && hasC) || (hasB && hasC) || (hasD && hasC)) {
                notes.push(lastPart.trim());
                modifiedText = modifiedText.substring(0, exclIndex).trim();
            }
        }
    }

    // 3. Collapse whitespace
    modifiedText = modifiedText.replace(/\s{2,}/g, ' ').trim();

    // 3b. Drop a truncated trailing parenthetical (the source field limit cuts
    // mid-allergen, e.g. "... and yoghurt (")
    modifiedText = modifiedText.replace(/\(\s*$/, '').trim();

    return {
        text: modifiedText,
        notes: notes
    };
}