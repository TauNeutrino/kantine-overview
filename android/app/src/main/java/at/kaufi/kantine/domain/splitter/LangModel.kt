package at.kaufi.kantine.domain.splitter

import kotlin.math.ln
import kotlin.math.max

/**
 * The trigram-based language model for distinguishing German from English.
 *
 * Pre-computes trigram log probabilities from [seed] data in [init].
 * Exposes [scorePhrase] and [scoreLang] matching the JS `createLangModel`.
 *
 * NOTE: The JS `learnFromCourse`, `saveDelta`, and `loadDelta` are intentionally
 * NOT ported — learning is a client-side feature not needed in the Android app.
 */
class LangModel(seed: LangModelSeed) {

    private val trigramsDe: Map<String, Int>
    private val trigramsEn: Map<String, Int>
    private val funcDe: Set<String>
    private val funcEn: Set<String>
    private val totalDe: Int
    private val totalEn: Int

    init {
        trigramsDe = seed.trigramsDe
        trigramsEn = seed.trigramsEn
        funcDe = seed.funcDe.toSet()
        funcEn = seed.funcEn.toSet()

        var td = 0
        for (v in trigramsDe.values) td += v
        totalDe = td

        var te = 0
        for (v in trigramsEn.values) te += v
        totalEn = te
    }

    /**
     * Score [text] for German vs English trigram affinity.
     * Returns a pair of (deScore, enScore).
     */
    fun scorePhrase(text: String?): Pair<Double, Double> {
        if (text.isNullOrBlank()) return Pair(0.0, 0.0)

        val lowerText = text.lowercase()
        val alphaWords = Regex("[a-zäöüß]+").findAll(lowerText).map { it.value }.toList()

        val FUNC_WEIGHT = 2.0

        var deTriLog = 0.0
        var enTriLog = 0.0

        for (w in alphaWords) {
            for (i in 0..w.length - 3) {
                val tri = w.substring(i, i + 3)

                val countDe = trigramsDe[tri] ?: 0
                deTriLog += ln((countDe + 1).toDouble() / (totalDe + 2).toDouble())

                val countEn = trigramsEn[tri] ?: 0
                enTriLog += ln((countEn + 1).toDouble() / (totalEn + 2).toDouble())
            }
        }

        val minTri = minOf(deTriLog, enTriLog)
        deTriLog -= minTri
        enTriLog -= minTri

        var deScore = deTriLog
        var enScore = enTriLog

        for (w in alphaWords) {
            if (w in funcDe) deScore += FUNC_WEIGHT
            if (w in funcEn) enScore += FUNC_WEIGHT
        }

        val umlauts = Regex("[äöüß]").findAll(lowerText).toList()
        if (umlauts.isNotEmpty()) {
            deScore += 0.5 * umlauts.size
        }

        for (w in alphaWords) {
            if (Regex("(ung|suppe|chen|kartoffel|schnitzel)$").containsMatchIn(w)) deScore += 1.0
            if (Regex("(ing|ed)$").containsMatchIn(w)) enScore += 0.5
            if (Regex("^th").containsMatchIn(w)) enScore += 0.5
        }

        val deDigraphs = Regex("(sch|pf|tz|ck)").findAll(lowerText).toList()
        if (deDigraphs.isNotEmpty()) {
            deScore += 0.3 * deDigraphs.size
        }

        return Pair(deScore, enScore)
    }

    /**
     * Score language: positive = German, negative = English.
     */
    fun scoreLang(text: String?): Double {
        val scores = scorePhrase(text)
        return scores.first - scores.second
    }
}
