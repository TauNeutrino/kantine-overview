package at.kaufi.kantine.domain.splitter

/**
 * Resolves the boundary between English and German text in a merged fragment.
 *
 * Given a string like "Chicken breast mit Reis", this finds the boundary
 * where the English part ends and the German part begins.
 */
object BoundaryResolver {

    private const val MIN_BOUNDARY_CONFIDENCE = 1.5
    private const val MIN_LEFT_ENGLISH = 1.0

    fun resolveBoundary(fragment: String?, langModel: LangModel): BoundaryResult {
        if (fragment.isNullOrBlank()) {
            return BoundaryResult("", "")
        }

        val words = fragment.trim().split(Regex("\\s+"))

        if (words.size < 2) {
            return BoundaryResult(fragment, "")
        }

        var bestK = -1
        var maxScore = -9999.0

        for (k in 1 until words.size) {
            val leftText = words.subList(0, k).joinToString(" ")
            val rightText = words.subList(k, words.size).joinToString(" ")

            val leftScore = langModel.scoreLang(leftText)
            val rightScore = langModel.scoreLang(rightText)

            val leftLooksEnglish = leftScore < -MIN_LEFT_ENGLISH
            val rightLooksGerman = rightScore > 0

            val boundaryScore = (-leftScore) + rightScore

            if (leftLooksEnglish && rightLooksGerman && boundaryScore > maxScore) {
                maxScore = boundaryScore
                bestK = k
            }
        }

        if (bestK != -1 && maxScore > MIN_BOUNDARY_CONFIDENCE) {
            return BoundaryResult(
                enPart = words.subList(0, bestK).joinToString(" "),
                deCut = words.subList(bestK, words.size).joinToString(" "),
            )
        }

        return BoundaryResult(fragment, "")
    }

    data class BoundaryResult(
        val enPart: String,
        val deCut: String,
    )
}
