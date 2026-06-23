// @ts-check

/**
 * FROZEN CONTRACT: splitLanguage always returns { de, en, raw } as bullet-prefixed strings. All other fields are additive.
 */

/**
 * Shared label constants for the DE/EN menu splitter pipeline.
 */
export const LABELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  FALLBACK: 'fallback',
  TEMPLATE: 'template',
};

/**
 * @typedef {Object} SubScores
 * @property {number} anchor
 * @property {number} purity
 * @property {number} course
 * @property {number} coverage
 */

/**
 * @typedef {Object} SplitResult
 * Frozen shape: de/en/raw are the contract fields. confidence/subScores/label/notes are additive only.
 * @property {string} de
 * @property {string} en
 * @property {string} raw
 * @property {number} [confidence]
 * @property {SubScores} [subScores]
 * @property {string} [label]
 * @property {string[]} [notes]
 */

/**
 * @typedef {Object} Course
 * @property {string} de
 * @property {string} en
 * @property {string} allergen
 * @property {boolean} mono
 * @property {boolean} anchored
 */

/**
 * @typedef {Object} LangModel
 * @property {string} version
 * @property {Object} trigramsDe
 * @property {Object} trigramsEn
 * @property {string[]} funcDe
 * @property {string[]} funcEn
 */
