package at.kaufi.kantine.domain.splitter

/**
 * Template matcher for known menu text patterns.
 * If the normalized text matches a known template, returns a pre-built SplitResult.
 */
object TemplateMatcher {

    private val TEMPLATES = listOf(
        Template(
            test = { t -> Regex("^Suppe\\s*/\\s*Soup\\s+Salat\\s*/\\s*Salad\\s+Dessert$", RegexOption.IGNORE_CASE)
                .matches(t.trim()) },
            result = SplitResult(
                de = "• Suppe\n• Salat\n• Dessert",
                en = "• Soup\n• Salad\n• Dessert",
                raw = "• Suppe / Soup\n• Salat / Salad\n• Dessert",
                label = Labels.TEMPLATE,
                confidence = 1.0,
                subScores = SubScores(1.0, 1.0, 1.0, 1.0),
                notes = emptyList(),
            ),
        ),
    )

    fun matchTemplate(normalizedText: String?): SplitResult? {
        if (normalizedText.isNullOrBlank()) return null

        for (tpl in TEMPLATES) {
            if (tpl.test(normalizedText)) return tpl.result
        }

        return null
    }

    private data class Template(
        val test: (String) -> Boolean,
        val result: SplitResult,
    )
}
