package at.kaufi.kantine.domain.splitter

/**
 * Text normalization for the DE/EN splitter pipeline.
 *
 * 1. Repairs allergen-internal slashes: (A/F/N) → (AFN)
 * 2. Repairs slash-before-allergen: /ACLM) → (ACLM)
 * 3. Detects and parks notes ("Achtung Änderung", trailing annotation blocks)
 * 4. Collapses whitespace
 */
object Normalizer {

    fun isValidAllergen(content: String?): Boolean {
        if (content.isNullOrEmpty()) return false
        return Regex("^[A-Z](\\s*,?\\s*[A-Z])*$").matches(content.trim())
    }

    fun normalize(text: String?): NormalizeResult {
        if (text == null) return NormalizeResult("", emptyList())

        var modifiedText: String = text
        val notes = mutableListOf<String>()

        // 1. Repair allergen-internal slashes: (A/F/N) -> (AFN)
        modifiedText = modifiedText.replace(Regex("\\(([A-Z](?:/[A-Z])+)\\)")) { match ->
            val inner = match.groupValues[1]
            "(${inner.replace("/", "")})"
        }

        // 2. Repair slash-before-allergen: /ACLM) -> (ACLM)
        modifiedText = modifiedText.replace(Regex("/([A-Z]{1,8})\\)"), "($1)")

        // 4. Detect and park notes

        // Pass 1: Extract "Achtung Änderung" specifically
        val aaRegex = Regex("Achtung Änderung", RegexOption.IGNORE_CASE)
        val aaMatches = aaRegex.findAll(modifiedText).toList()
        for (m in aaMatches) {
            notes.add(m.value.trim())
            modifiedText = modifiedText.replace(m.value, " ")
        }

        // Pass 2: Detect based on combinations (6+ spaces rule)
        val parts = modifiedText.split(Regex(" {6,}"))
        if (parts.size > 1) {
            val lastPart = parts.last()
            val hasA = Regex("!!!|!{3,}").containsMatchIn(lastPart)
            val hasB = Regex("[A-ZÄÖÜ]{6,}").containsMatchIn(lastPart)
            val hasC = Regex("ACHTUNG|Achtung|Änderung|ABHOLUNG|WERKSRESTAURANT", RegexOption.IGNORE_CASE)
                .containsMatchIn(lastPart)
            val hasD = !lastPart.contains(" / ") &&
                !isValidAllergen(lastPart.replace(Regex("[()]"), ""))

            if ((hasA && hasB) || (hasA && hasC) || (hasB && hasC) || (hasD && hasC)) {
                notes.add(lastPart.trim())
                modifiedText = modifiedText.substring(0, modifiedText.lastIndexOf(lastPart)).trim()
            }
        } else {
            val exclIndex = modifiedText.indexOf("!!!")
            if (exclIndex != -1) {
                val lastPart = modifiedText.substring(exclIndex)
                val hasA = true
                val hasB = Regex("[A-ZÄÖÜ]{6,}").containsMatchIn(lastPart)
                val hasC = Regex("ACHTUNG|Achtung|Änderung|ABHOLUNG|WERKSRESTAURANT", RegexOption.IGNORE_CASE)
                    .containsMatchIn(lastPart)
                val hasD = false

                if ((hasA && hasB) || (hasA && hasC) || (hasB && hasC) || (hasD && hasC)) {
                    notes.add(lastPart.trim())
                    modifiedText = modifiedText.substring(0, exclIndex).trim()
                }
            }
        }

        // 3. Collapse whitespace
        modifiedText = modifiedText.replace(Regex("\\s{2,}"), " ").trim()

        return NormalizeResult(modifiedText, notes)
    }

    data class NormalizeResult(
        val text: String,
        val notes: List<String>,
    )
}
