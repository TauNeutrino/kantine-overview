package at.kaufi.kantine.domain.splitter

/**
 * Shared label constants for the DE/EN menu splitter pipeline.
 */
object Labels {
    const val HIGH = "high"
    const val MEDIUM = "medium"
    const val LOW = "low"
    const val FALLBACK = "fallback"
    const val TEMPLATE = "template"
}

/**
 * Sub-scores that make up the composite confidence.
 * @property anchor How many courses are anchored by allergens
 * @property purity Language purity of DE/EN sides
 * @property course How well-formed the course structure is
 * @property coverage Coverage of raw tokens by split output
 */
data class SubScores(
    val anchor: Double,
    val purity: Double,
    val course: Double,
    val coverage: Double,
)

/**
 * Frozen contract: splitLanguage always returns { de, en, raw } as bullet-prefixed strings.
 * All other fields are additive.
 *
 * @property de German text (bullet-prefixed lines)
 * @property en English text (bullet-prefixed lines)
 * @property raw Raw text (same as de, except for fallback/template)
 * @property confidence Composite confidence score [0, 1]
 * @property subScores Detail sub-scores
 * @property label Quality label (high/medium/low/fallback/template)
 * @property notes Any extracted notes
 */
data class SplitResult(
    val de: String,
    val en: String,
    val raw: String,
    val confidence: Double = 0.0,
    val subScores: SubScores = SubScores(0.0, 0.0, 0.0, 0.0),
    val label: String = Labels.FALLBACK,
    val notes: List<String> = emptyList(),
)

/**
 * A single course (dish) extracted from the menu text.
 * @property de German description
 * @property en English description
 * @property allergen Allergen code (e.g. "A", "A,C,G")
 * @property mono Whether this course has no separate DE/EN (monolingual)
 * @property anchored Whether this course was anchored by a known allergen pattern
 */
data class Course(
    val de: String,
    val en: String,
    val allergen: String = "",
    val mono: Boolean = false,
    val anchored: Boolean = false,
)

/**
 * Internal language model data structure.
 * @property version Model version string
 * @property trigramsDe German trigram counts
 * @property trigramsEn English trigram counts
 * @property funcDe German function word set
 * @property funcEn English function word set
 */
data class LangModelSeed(
    val version: String,
    val trigramsDe: Map<String, Int>,
    val trigramsEn: Map<String, Int>,
    val funcDe: List<String>,
    val funcEn: List<String>,
)
