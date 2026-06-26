package at.kaufi.kantine.domain.splitter

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * Scores a DE/EN split result, producing a composite confidence and a quality label.
 */
object Scorer {

    private const val WEIGHT_ANCHOR = 0.35
    private const val WEIGHT_PURITY = 0.30
    private const val WEIGHT_COURSE = 0.20
    private const val WEIGHT_COVERAGE = 0.15

    private const val THRESHOLD_HIGH = 0.80
    private const val THRESHOLD_MEDIUM = 0.55

    private fun tokenize(text: String?): List<String> {
        return Regex("[a-zäöüß]{2,}").findAll((text ?: "").lowercase()).map { it.value }.toList()
    }

    private fun countGermanIntrusionsInEnglish(enClean: String): Int {
        val tokens = enClean.split(Regex("\\s+"))
        var count = 0
        for (i in 1 until tokens.size) {
            val tok = tokens[i]
            if (!Regex("^[A-ZÄÖÜ]").containsMatchIn(tok)) continue
            val word = tok.lowercase().replace(Regex("[^a-zäöüß]"), "")
            if (word.length < 3 || Loanwords.isLoanword(tok)) continue
            count++
        }
        return count
    }

    private fun hasSeparatorSlash(text: String?): Boolean {
        return (text ?: "").replace(Regex("\\([^)]*\\)"), "").contains("/")
    }

    fun scoreSplit(
        courses: List<Course>,
        notes: List<String>,
        rawText: String,
        langModel: LangModel,
    ): ScoreResult {
        // Anchor score
        val anchoredCount = courses.count { it.anchored }
        val anchor = anchoredCount.toDouble() / max(courses.size.toDouble(), 1.0)

        // Purity score
        var puritySum = 0.0
        var purityCount = 0
        for (course in courses) {
            if (!course.mono) {
                val deClean = (course.de ?: "").replace(Regex("\\([^)]*\\)"), "").trim()
                val enClean = (course.en ?: "").replace(Regex("\\([^)]*\\)"), "").trim()

                val deScoreLang = langModel.scoreLang(deClean)
                val enScoreLang = langModel.scoreLang(enClean)

                val dePurity = max(0.0, deScoreLang) / (abs(deScoreLang) + 1.0)
                var enPurity = max(0.0, -enScoreLang) / (abs(enScoreLang) + 1.0)
                if (countGermanIntrusionsInEnglish(enClean) > 0) {
                    enPurity = min(enPurity, 0.2)
                }

                puritySum += dePurity + enPurity
                purityCount += 2
            }
        }
        val purity = if (purityCount > 0) puritySum / purityCount else 1.0

        // Course score
        val baseCourseScore = if (courses.size == 1 || courses.size == 3) 1.0 else 0.0
        var penalties = 0.0
        for (course in courses) {
            if (!course.mono) {
                if ((course.de ?: "").isEmpty() || (course.en ?: "").isEmpty()) {
                    penalties += 0.3
                }
            }
        }
        val courseScore = max(0.0, baseCourseScore - penalties)

        // Coverage score
        val rawTokens = tokenize(rawText)
        val splitText = courses.joinToString(" ") { (it.de ?: "") + " " + (it.en ?: "") } +
            " " + notes.joinToString(" ")
        val splitTokenSet = tokenize(splitText).toSet()
        val covered = rawTokens.count { it in splitTokenSet }
        val coverage = covered.toDouble() / max(rawTokens.size.toDouble(), 1.0)

        // Composite confidence
        val confidence = max(0.0, min(1.0,
            anchor * WEIGHT_ANCHOR +
                purity * WEIGHT_PURITY +
                courseScore * WEIGHT_COURSE +
                coverage * WEIGHT_COVERAGE,
        ))

        val corrupted = courses.any { hasSeparatorSlash(it.en) || hasSeparatorSlash(it.de) }
        val suspiciousCourseCount = courses.size == 2

        val label = when {
            !corrupted && !suspiciousCourseCount && confidence >= THRESHOLD_HIGH -> Labels.HIGH
            !corrupted && confidence >= THRESHOLD_MEDIUM -> Labels.MEDIUM
            else -> Labels.LOW
        }

        var finalConfidence = confidence
        if (corrupted) {
            finalConfidence = min(finalConfidence, THRESHOLD_MEDIUM - 0.05)
        } else if (suspiciousCourseCount) {
            finalConfidence = min(finalConfidence, THRESHOLD_HIGH - 0.01)
        }

        return ScoreResult(
            confidence = finalConfidence,
            subScores = SubScores(
                anchor = anchor,
                purity = purity,
                course = courseScore,
                coverage = coverage,
            ),
            label = label,
        )
    }

    data class ScoreResult(
        val confidence: Double,
        val subScores: SubScores,
        val label: String,
    )
}
