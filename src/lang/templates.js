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
];

export function matchTemplate(normalizedText) {
  if (typeof normalizedText !== 'string' || !normalizedText) return null;

  for (const tpl of TEMPLATES) {
    if (tpl.test(normalizedText)) return tpl.result;
  }

  return null;
}
