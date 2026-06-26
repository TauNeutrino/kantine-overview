package at.kaufi.kantine.domain.splitter

/**
 * Splits a reconstructed bilingual segment "DE1 / EN1 DE2 / EN2 ..." into
 * individual dishes.
 *
 * Each returned dish has { de, en, mono }. The caller (Splitter) reattaches
 * the allergen to the LAST dish and assigns the `anchored` flag.
 */
object DishSplitter {

    fun splitDishes(text: String?, langModel: LangModel): List<SplitDish> {
        val t = (text ?: "")
            .replace(Regex("\\s*/\\s*"), " / ")
            .replace(Regex("\\s+"), " ")
            .trim()
        if (t.isEmpty()) return emptyList()

        val tokens = t.split(" ")
        val slashIdxs = tokens.indices.filter { tokens[it] == "/" }

        // No slash -> a single mono dish
        if (slashIdxs.isEmpty()) {
            return listOf(SplitDish(de = t, en = t, mono = true))
        }

        // Exactly one slash -> a single bilingual dish
        if (slashIdxs.size == 1) {
            val si = slashIdxs[0]
            val de = tokens.subList(0, si).joinToString(" ").trim()
            val en = tokens.subList(si + 1, tokens.size).joinToString(" ").trim()
            if (de.isEmpty() || en.isEmpty()) {
                val solo = if (de.isNotEmpty()) de else en
                return listOf(SplitDish(de = solo, en = solo, mono = true))
            }
            return listOf(SplitDish(de = de, en = en, mono = false))
        }

        // Two or more slashes -> peel the first dish, recurse on the remainder
        val s1 = slashIdxs[0]
        val s2 = slashIdxs[1]
        val de1 = tokens.subList(0, s1).joinToString(" ").trim()
        val mid = tokens.subList(s1 + 1, s2)
        val k = findDishBoundary(mid, langModel)
        val en1 = mid.subList(0, k).joinToString(" ").trim()
        val de2 = mid.subList(k, mid.size).joinToString(" ").trim()
        val tail = tokens.subList(s2 + 1, tokens.size).joinToString(" ").trim()

        val first = SplitDish(de = de1, en = en1.ifEmpty { de1 }, mono = false)
        val remainder = (if (de2.isNotEmpty()) "$de2 / " else "/ ") + tail
        return listOf(first) + splitDishes(remainder, langModel)
    }

    internal fun classifyToken(token: String, langModel: LangModel, isFirst: Boolean): String {
        if (Loanwords.isLoanword(token)) return "ambig"
        if (!isFirst && Regex("^[A-ZÄÖÜ]").containsMatchIn(token)) return "de"
        val score = langModel.scoreLang(token)
        if (score > 0.5) return "de"
        if (score < -0.5) return "en"
        return "ambig"
    }

    internal fun findDishBoundary(midTokens: List<String>, langModel: LangModel): Int {
        val n = midTokens.size
        if (n <= 1) return n

        val tags = midTokens.mapIndexed { idx, t -> classifyToken(t, langModel, idx == 0) }

        var bestK = 1
        var bestPenalty = Int.MAX_VALUE.toDouble()
        var bestCap = -1

        for (k in 1 until n) {
            var leftGerman = 0.0
            for (i in 0 until k) if (tags[i] == "de") leftGerman++
            var rightEnglish = 0.0
            for (i in k until n) if (tags[i] == "en") rightEnglish++

            val penalty = leftGerman + rightEnglish
            val cap = if (Regex("^[A-ZÄÖÜ]").containsMatchIn(midTokens[k])) 1 else 0

            if (penalty < bestPenalty || (penalty == bestPenalty && cap > bestCap)) {
                bestPenalty = penalty
                bestCap = cap
                bestK = k
            }
        }

        return bestK
    }

    data class SplitDish(
        val de: String,
        val en: String,
        val mono: Boolean,
    )
}
