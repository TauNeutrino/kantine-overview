package at.kaufi.kantine.domain.splitter

/**
 * Main entry point for the DE/EN menu language splitter.
 *
 * Takes a German menu item text containing mixed DE/EN text and splits it
 * into its DE and EN components.
 *
 * Frozen shape: { de, en, raw, confidence, subScores, label, notes }
 */
object Splitter {

    /**
     * Split a menu text into German ([de]) and English ([en]) parts.
     *
     * @param text The raw menu text (e.g., "Rindsroulade / Beef rolls (A)")
     * @param langModel An optional pre-built [LangModel]; if null, one is created from seed data
     */
    fun splitLanguage(
        text: String?,
        langModel: LangModel? = null,
    ): SplitResult {
        if (text.isNullOrEmpty()) {
            return SplitResult(
                de = "", en = "", raw = "",
                confidence = 0.0,
                subScores = SubScores(0.0, 0.0, 0.0, 0.0),
                label = Labels.FALLBACK,
                notes = emptyList(),
            )
        }

        val (normText, notes) = Normalizer.normalize(text)

        // Template match
        val tplResult = TemplateMatcher.matchTemplate(normText)
        if (tplResult != null) {
            return tplResult.copy(
                raw = "• $text",
                notes = notes,
            )
        }

        val model = langModel ?: createDefaultLangModel()

        var courses: List<Course> = Segmenter.segment(normText)
        courses = repairMergedCourses(courses, model)
        courses = peelGluedTailFromUnanchored(courses.toMutableList(), model)
        courses = peelTrailingMonoCourse(courses.toMutableList())

        val deParts = mutableListOf<String>()
        val enParts = mutableListOf<String>()

        for (course in courses) {
            deParts.add(course.de)
            enParts.add(course.en)
        }

        if (deParts.size > 3 || enParts.size > 3) {
            val formattedRaw = "• " + text.replace(
                Regex("(?:\\(|(?:/|\\s|^))([A-Z,]+)\\)\\s*(?=\\S)(?!\\s*/)"),
                "($1)\n• "
            ).replace(Regex("^• • "), "• ")
            return SplitResult(
                de = formattedRaw,
                en = formattedRaw,
                raw = formattedRaw,
                label = Labels.FALLBACK,
                confidence = 0.0,
                subScores = SubScores(0.0, 0.0, 0.0, 0.0),
                notes = notes,
            )
        }

        val de = if (deParts.isNotEmpty()) "• " + deParts.joinToString("\n• ") else ""
        val en = if (enParts.isNotEmpty()) "• " + enParts.joinToString("\n• ") else ""
        val raw = de

        val scoreResult = Scorer.scoreSplit(courses, notes, normText, model)

        val noteText = if (notes.isNotEmpty()) "\n" + notes.joinToString(" ") else ""

        return SplitResult(
            de = de + noteText,
            en = en + noteText,
            raw = raw + noteText,
            confidence = scoreResult.confidence,
            subScores = scoreResult.subScores,
            label = scoreResult.label,
            notes = notes,
        )
    }

    // -- Helper functions --

    internal fun stripAllergen(text: String?, allergen: String): String {
        if (text.isNullOrEmpty()) return ""
        var out = text
        if (allergen.isNotEmpty()) {
            val suffix = "($allergen)"
            val idx = out.lastIndexOf(suffix)
            if (idx != -1) {
                out = out.substring(0, idx) + out.substring(idx + suffix.length)
            }
        }
        return out.replace(Regex("\\s+"), " ").trim()
    }

    internal fun attachAllergen(dish: DishSplitter.SplitDish, allergen: String, anchored: Boolean): Course {
        var de = dish.de
        var en = dish.en
        if (allergen.isNotEmpty()) {
            val tag = " ($allergen)"
            if (!de.contains("($allergen)")) de += tag
            if (!en.contains("($allergen)")) en += tag
        }
        return Course(
            de = de,
            en = en,
            allergen = allergen,
            mono = dish.mono,
            anchored = anchored,
        )
    }

    internal fun hasSeparatorSlash(text: String?): Boolean {
        return (text ?: "").replace(Regex("\\([^)]*\\)"), "").contains("/")
    }

    internal fun repairMergedCourses(courses: List<Course>, langModel: LangModel): List<Course> {
        val repaired = mutableListOf<Course>()
        for (course in courses) {
            if (!course.mono && hasSeparatorSlash(course.en)) {
                val allergen = course.allergen
                val fullText = stripAllergen(course.de, allergen) + " / " + stripAllergen(course.en, allergen)
                val dishes = DishSplitter.splitDishes(fullText, langModel)
                if (dishes.size >= 2) {
                    dishes.forEachIndexed { idx, dish ->
                        val isLast = idx == dishes.size - 1
                        repaired.add(
                            attachAllergen(
                                dish,
                                if (isLast) allergen else "",
                                if (isLast) course.anchored else false,
                            )
                        )
                    }
                    continue
                }
            }
            repaired.add(course)
        }
        return repaired
    }

    internal fun peelGluedTailFromUnanchored(courses: MutableList<Course>, langModel: LangModel): MutableList<Course> {
        var i = 0
        while (i < courses.size) {
            val course = courses[i]
            if (!course.anchored && course.en.isNotEmpty() && !hasSeparatorSlash(course.en) &&
                langModel.scoreLang(course.en) > 0
            ) {
                val result = BoundaryResolver.resolveBoundary(course.en, langModel)
                if (result.deCut.isNotEmpty()) {
                    if (course.mono) {
                        courses[i] = course.copy(en = result.enPart, de = result.deCut, mono = false)
                    } else {
                        courses[i] = course.copy(en = result.enPart)
                        courses.add(i + 1, Course(de = result.deCut, en = result.deCut, mono = true, anchored = false))
                    }
                }
            }
            i++
        }
        return courses
    }

    internal fun peelTrailingMonoCourse(courses: MutableList<Course>): MutableList<Course> {
        if (courses.size != 2) return courses
        val last = courses[1]
        val allergen = last.allergen

        val enWords = stripAllergen(last.en, allergen).split(Regex("\\s+"))
        if (enWords.size < 2) return courses

        val word = enWords.last()
        if (!Regex("^[A-ZÄÖÜ][a-zäöüß]").containsMatchIn(word)) return courses

        val newEn = enWords.subList(0, enWords.size - 1).joinToString(" ")
        val deNoAllergen = stripAllergen(last.de, allergen)
        val deWords = deNoAllergen.split(Regex("\\s+"))
        val newDe = if (deWords.size >= 2 && deWords.last() == word)
            deWords.subList(0, deWords.size - 1).joinToString(" ")
        else
            deNoAllergen

        courses[1] = Course(
            de = newDe,
            en = newEn,
            allergen = "",
            mono = newDe == newEn,
            anchored = false,
        )
        val monoText = if (allergen.isNotEmpty()) "$word ($allergen)" else word
        courses.add(
            Course(
                de = monoText,
                en = monoText,
                allergen = allergen,
                mono = true,
                anchored = allergen.isNotEmpty(),
            )
        )
        return courses
    }

    // -- Default model for convenience --

    @Volatile
    private var defaultModel: LangModel? = null

    internal fun createDefaultLangModel(): LangModel {
        val existing = defaultModel
        if (existing != null) return existing

        // Create a minimal LangModel from the bundled seed-data JSON loaded at app init.
        // The default model is set once by SeedLoader at Application start.
        // If not yet initialized, fall back to an empty model that returns neutral scores.
        val fallbackSeed = LangModelSeed(
            version = "v0.0.0",
            trigramsDe = emptyMap(),
            trigramsEn = emptyMap(),
            funcDe = emptyList(),
            funcEn = emptyList(),
        )
        val model = LangModel(fallbackSeed)
        defaultModel = model
        return model
    }

    /**
     * Sets the default LangModel (called by SeedLoader at app startup).
     */
    internal fun setDefaultModel(model: LangModel) {
        defaultModel = model
    }
}
