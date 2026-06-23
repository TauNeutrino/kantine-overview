export function isValidAllergen(content) {
    if (typeof content !== 'string' || !content) return false;
    return /^[A-Z](\s*,?\s*[A-Z])*$/.test(content.trim());
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

    return {
        text: modifiedText,
        notes: notes
    };
}