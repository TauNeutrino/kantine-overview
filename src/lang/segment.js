function isValidAllergen(content) {
  if (typeof content !== 'string' || !content) return false;
  return /^[A-Z](\s*,?\s*[A-Z])*$/.test(content.trim());
}

/**
 * Segments a normalized menu text into separate course objects.
 * 
 * @param {string} normalizedText 
 * @returns {Array<{de: string, en: string, allergen: string, mono: boolean, anchored: boolean}>}
 */
export function segment(normalizedText) {
  if (!normalizedText || typeof normalizedText !== 'string') {
    return [];
  }

  const courses = [];
  const parenRegex = /\(([^)]+)\)\s*(?!\s*\/)/g;
  let match;
  let lastScanIndex = 0;

  while ((match = parenRegex.exec(normalizedText)) !== null) {
    const content = match[1];
    if (isValidAllergen(content)) {
      // End of this course segment is at the end of the matched parenthesis
      const segmentEndIndex = match.index + match[0].length;
      let segmentText = normalizedText.substring(lastScanIndex, segmentEndIndex);
      
      courses.push(processSegment(segmentText, content, true));
      lastScanIndex = segmentEndIndex;
    }
  }

  // Any remaining text after the last valid allergen is an unanchored segment
  if (lastScanIndex < normalizedText.length) {
    const remainingText = normalizedText.substring(lastScanIndex).trim();
    if (remainingText) {
      courses.push(processSegment(remainingText, "", false));
    }
  }

  return courses;
}

function processSegment(segmentText, allergen, anchored) {
  // 1. Strip the allergen code from the end of the segment text if it exists
  let textWithoutAllergen = segmentText;
  if (allergen) {
    const suffix = `(${allergen})`;
    if (textWithoutAllergen.endsWith(suffix)) {
      textWithoutAllergen = textWithoutAllergen.substring(0, textWithoutAllergen.length - suffix.length);
    } else {
      // In case of whitespace before the parenthesis in the raw segment
      const lastParenIndex = textWithoutAllergen.lastIndexOf(`(${allergen})`);
      if (lastParenIndex !== -1) {
        textWithoutAllergen = textWithoutAllergen.substring(0, lastParenIndex);
      }
    }
  }
  textWithoutAllergen = textWithoutAllergen.trim();

  // 2. Split DE|EN at the FIRST slash
  let de, en, mono;
  const slashMatch = textWithoutAllergen.match(/\s*\/\s*/);
  if (slashMatch) {
    de = textWithoutAllergen.substring(0, slashMatch.index).trim();
    en = textWithoutAllergen.substring(slashMatch.index + slashMatch[0].length).trim();
    mono = false;
  } else {
    de = textWithoutAllergen;
    en = textWithoutAllergen;
    mono = true;
  }

  // 3. Re-attach allergen if it exists and not already present
  if (allergen) {
    const aSuffix = ` (${allergen})`;
    de = de.includes(`(${allergen})`) ? de : `${de}${aSuffix}`;
    en = en.includes(`(${allergen})`) ? en : `${en}${aSuffix}`;
  }

  return {
    de,
    en,
    allergen,
    mono,
    anchored
  };
}
