package at.kaufi.kantine.domain.splitter

/**
 * Segments a normalized menu text into separate [Course] objects.
 *
 * The segmentation is based on detecting allergen markers like (A), (A,C,G)
 * which anchor course boundaries, then splitting each segment into DE/EN.
 */
object Segmenter {

    private fun isValidAllergen(content: String?): Boolean {
        if (content.isNullOrEmpty()) return false
        return Regex("^[A-Z](\\s*,?\\s*[A-Z])*$").matches(content.trim())
    }

    fun segment(normalizedText: String?): List<Course> {
        if (normalizedText.isNullOrBlank()) return emptyList()

        val courses = mutableListOf<Course>()
        val parenRegex = Regex("\\(([^)]+)\\)\\s*(?!\\s*/)")
        var lastScanIndex = 0

        for (match in parenRegex.findAll(normalizedText)) {
            val content = match.groupValues[1]
            if (isValidAllergen(content)) {
                val segmentEndIndex = match.range.last + 1
                val segmentText = normalizedText.substring(lastScanIndex, segmentEndIndex)

                courses.add(processSegment(segmentText, content, true))
                lastScanIndex = segmentEndIndex
            }
        }

        // Any remaining text after the last valid allergen is an unanchored segment
        if (lastScanIndex < normalizedText.length) {
            val remainingText = normalizedText.substring(lastScanIndex).trim()
            if (remainingText.isNotEmpty()) {
                courses.add(processSegment(remainingText, "", false))
            }
        }

        return courses
    }

    private fun processSegment(segmentText: String, allergen: String, anchored: Boolean): Course {
        // 1. Strip the allergen code from the end of the segment text if it exists
        var textWithoutAllergen = segmentText
        if (allergen.isNotEmpty()) {
            val suffix = "($allergen)"
            if (textWithoutAllergen.endsWith(suffix)) {
                textWithoutAllergen = textWithoutAllergen.substring(0, textWithoutAllergen.length - suffix.length)
            } else {
                val lastParenIndex = textWithoutAllergen.lastIndexOf("($allergen)")
                if (lastParenIndex != -1) {
                    textWithoutAllergen = textWithoutAllergen.substring(0, lastParenIndex)
                }
            }
        }
        textWithoutAllergen = textWithoutAllergen.trim()

        // 2. Split DE|EN at the FIRST slash that is NOT inside parentheses
        var (de, en, mono) = Triple(textWithoutAllergen, textWithoutAllergen, true)
        var parenDepth = 0
        for (i in textWithoutAllergen.indices) {
            val ch = textWithoutAllergen[i]
            when {
                ch == '(' -> parenDepth++
                ch == ')' -> parenDepth--
                ch == '/' && parenDepth == 0 -> {
                    // Expand to surrounding whitespace
                    var left = i
                    var right = i + 1
                    while (left > 0 && textWithoutAllergen[left - 1] == ' ') left--
                    while (right < textWithoutAllergen.length && textWithoutAllergen[right] == ' ') right++
                    de = textWithoutAllergen.substring(0, left).trim()
                    en = textWithoutAllergen.substring(right).trim()
                    mono = false
                    break
                }
            }
        }

        // 3. Re-attach allergen if it exists and not already present
        if (allergen.isNotEmpty()) {
            val aSuffix = " ($allergen)"
            if (!de.contains("($allergen)")) de += aSuffix
            if (!en.contains("($allergen)")) en += aSuffix
        }

        return Course(de = de, en = en, allergen = allergen, mono = mono, anchored = anchored)
    }
}
