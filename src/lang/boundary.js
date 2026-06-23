export function resolveBoundary(fragment, langModel) {
    const MIN_BOUNDARY_CONFIDENCE = 1.5;
    const MIN_LEFT_ENGLISH = 1.0;
    
    // Handle empty fragment
    if (!fragment || fragment.trim() === '') {
        return { enPart: '', deCut: '' };
    }

    const words = fragment.trim().split(/\s+/);
    
    if (words.length < 2) {
        return { enPart: fragment, deCut: '' };
    }

    let bestK = -1;
    let maxScore = -9999;

    for (let k = 1; k < words.length; k++) {
        const leftWords = words.slice(0, k);
        const rightWords = words.slice(k);

        const leftText = leftWords.join(' ');
        const rightText = rightWords.join(' ');

        const leftScore = langModel.scoreLang(leftText);
        const rightScore = langModel.scoreLang(rightText);

        const leftLooksEnglish = leftScore < -MIN_LEFT_ENGLISH;
        const rightLooksGerman = rightScore > 0;

        const boundaryScore = (-leftScore) + rightScore;

        if (leftLooksEnglish && rightLooksGerman && boundaryScore > maxScore) {
            maxScore = boundaryScore;
            bestK = k;
        }
    }

    if (bestK !== -1 && maxScore > MIN_BOUNDARY_CONFIDENCE) {
        return {
            enPart: words.slice(0, bestK).join(' '),
            deCut: words.slice(bestK).join(' ')
        };
    }

    return { enPart: fragment, deCut: '' };
}
