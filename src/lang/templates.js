// @ts-check

const TEMPLATES = [
  {
    test: (t) => /^Suppe\s*\/\s*Soup\s+Salat\s*\/\s*Salad\s+Dessert$/i.test(String(t).trim()),
    result: {
      de: '• Suppe\n• Salat\n• Dessert',
      en: '• Soup\n• Salad\n• Dessert',
      raw: '• Suppe / Soup\n• Salat / Salad\n• Dessert',
      label: 'template',
      confidence: 1.0,
      subScores: { anchor: 1, purity: 1, course: 1, coverage: 1 },
      notes: [],
    },
  },
  {
    test: (t) => /^Suppe\s*\/\s*Soup\s+Salat\s*\/\s*Salad\s*\/\s*Dessert$/i.test(String(t).trim()),
    result: {
      de: '• Suppe\n• Salat\n• Dessert',
      en: '• Soup\n• Salad\n• Dessert',
      raw: '• Suppe / Soup\n• Salat / Salad\n• Dessert',
      label: 'template',
      confidence: 1.0,
      subScores: { anchor: 1, purity: 1, course: 1, coverage: 1 },
      notes: [],
    },
  },
  {
    test: (t) => /^Suppr\s*\/\s*Soup\s+Salat\s*\/\s*Salad\s+Dessert$/i.test(String(t).trim()),
    result: {
      de: '• Suppe\n• Salat\n• Dessert',
      en: '• Soup\n• Salad\n• Dessert',
      raw: '• Suppe / Soup\n• Salat / Salad\n• Dessert',
      label: 'template',
      confidence: 1.0,
      subScores: { anchor: 1, purity: 1, course: 1, coverage: 1 },
      notes: [],
    },
  },
  {
    test: (t) => /^Suppe,\s*kleiner\s+(Salat|Beilagensalat)\s*\+\s*Des+ert\s*[/,]\s*(soup,?\s*)?small\s+salad\s+and\s+dessert$/i.test(String(t).trim()),
    result: (t) => {
      const parts = String(t).match(/^(.*?)\s*(?:\/|,)\s*((?:soup,?\s*)?small\s+salad\s+and\s+dessert)$/i);
      return {
        de: '• ' + (parts ? parts[1].trim() : String(t).trim()),
        en: '• ' + (parts ? parts[2].trim() : String(t).trim()),
        raw: '• ' + String(t).trim(),
        label: 'template',
        confidence: 1.0,
        subScores: { anchor: 1, purity: 1, course: 1, coverage: 1 },
        notes: [],
      };
    },
  },
];

export function matchTemplate(normalizedText) {
  if (typeof normalizedText !== 'string' || !normalizedText) return null;

  for (const tpl of TEMPLATES) {
    if (tpl.test(normalizedText)) {
      return typeof tpl.result === 'function' ? tpl.result(normalizedText) : tpl.result;
    }
  }

  return null;
}
