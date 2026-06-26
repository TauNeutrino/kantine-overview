package at.kaufi.kantine.domain.splitter

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.io.BufferedReader
import java.io.InputStreamReader

/**
 * Regression test for [Splitter.splitLanguage] using frozen test vectors
 * generated from the original JS implementation.
 *
 * Each vector asserts exact match on `de`, `en`, and `label`,
 * and `confidence` within ±0.0001 tolerance.
 */
@RunWith(JUnit4::class)
class LanguageSplitterRegressionTest {

    private lateinit var langModel: LangModel

    @Before
    fun setUp() {
        // Load seed data from test resources and create a LangModel
        val json = readTestResource("lang_model_seed.json")
        val seed = parseSeed(json)
        langModel = LangModel(seed)
    }

    @Test
    fun testRegressionVectors() {
        val json = readTestResource("test-vectors.json")
        val vectors = parseVectors(json)

        assertTrue("No test vectors found", vectors.isNotEmpty())

        var failures = 0
        for ((index, vector) in vectors.withIndex()) {
            val result = Splitter.splitLanguage(vector.input, langModel)

            val deMatch = result.de == vector.expected.de
            val enMatch = result.en == vector.expected.en
            val labelMatch = result.label == vector.expected.label
            val confidenceDiff = kotlin.math.abs(result.confidence - vector.expected.confidence)

            if (!deMatch || !enMatch || !labelMatch || confidenceDiff > 0.0001) {
                failures++
                System.err.println(
                    "FAIL [$index] input=\"${vector.input}\"\n" +
                        "  de: expected=\"${vector.expected.de}\" actual=\"${result.de}\"\n" +
                        "  en: expected=\"${vector.expected.en}\" actual=\"${result.en}\"\n" +
                        "  label: expected=${vector.expected.label} actual=${result.label}\n" +
                        "  confidence: expected=${vector.expected.confidence} actual=${result.confidence} diff=$confidenceDiff"
                )
            }
        }

        assertTrue("$failures / ${vectors.size} regression vectors failed", failures == 0)
    }

    @Test
    fun testEmptyInput() {
        val result = Splitter.splitLanguage("", langModel)
        assertEquals("", result.de)
        assertEquals("", result.en)
        assertEquals("", result.raw)
        assertEquals("fallback", result.label)
        assertEquals(0.0, result.confidence, 0.0001)
        assertTrue(result.notes.isEmpty())
    }

    @Test
    fun testWhitespaceInput() {
        // JS behavior: whitespace is truthy, so it goes through pipeline
        // → empty de/en, low confidence (0.3 from purity=1 * 0.3 weight)
        val result = Splitter.splitLanguage("   ", langModel)
        assertEquals("", result.de)
        assertEquals("", result.en)
        assertEquals("", result.raw)
        assertEquals("low", result.label)
        assertEquals(0.3, result.confidence, 0.0001)
    }

    private fun readTestResource(name: String): String {
        val inputStream = javaClass.classLoader?.getResourceAsStream(name)
            ?: throw IllegalStateException("Test resource not found: $name")
        return BufferedReader(InputStreamReader(inputStream)).use { it.readText() }
    }

    private fun parseSeed(json: String): LangModelSeed {
        // Simple JSON parsing for the seed structure using Moshi-like manual parsing.
        // Since we don't have Moshi in test, we parse using org.json or manual.
        // Use a simple approach: parse the JSON manually for the regression test.
        return parseSeedJson(json)
    }

    private fun parseSeedJson(json: String): LangModelSeed {
        val obj = parseJsonObject(json)
        return LangModelSeed(
            version = obj["version"] as String,
            trigramsDe = (obj["trigramsDe"] as Map<*, *>).mapKeys { it.key.toString() }
                .mapValues { (it.value as Number).toInt() },
            trigramsEn = (obj["trigramsEn"] as Map<*, *>).mapKeys { it.key.toString() }
                .mapValues { (it.value as Number).toInt() },
            funcDe = (obj["funcDe"] as List<*>).map { it.toString() },
            funcEn = (obj["funcEn"] as List<*>).map { it.toString() },
        )
    }

    private data class TestVector(
        val input: String,
        val expected: Expected,
    )

    private data class Expected(
        val de: String,
        val en: String,
        val confidence: Double,
        val label: String,
    )

    private fun parseVectors(json: String): List<TestVector> {
        val list = parseJsonArray(json) as List<*>
        return list.map { item ->
            val obj = item as Map<*, *>
            val expected = obj["expected"] as Map<*, *>
            TestVector(
                input = obj["input"] as String,
                expected = Expected(
                    de = expected["de"] as String,
                    en = expected["en"] as String,
                    confidence = (expected["confidence"] as Number).toDouble(),
                    label = expected["label"] as String,
                ),
            )
        }
    }

    // Minimal JSON parser for test purposes (no external dependencies required)
    private fun parseJsonObject(json: String): Map<String, Any?> {
        val trimmed = json.trim()
        require(trimmed.startsWith("{") && trimmed.endsWith("}")) { "Not a JSON object" }
        val inner = trimmed.substring(1, trimmed.length - 1).trim()

        val result = mutableMapOf<String, Any?>()
        val pairs = splitTopLevel(inner, ',')
        for (pair in pairs) {
            val (key, value) = splitKeyValue(pair.trim())
            result[key] = value
        }
        return result
    }

    private fun parseJsonArray(json: String): List<Any?> {
        val trimmed = json.trim()
        require(trimmed.startsWith("[") && trimmed.endsWith("]")) { "Not a JSON array" }
        val inner = trimmed.substring(1, trimmed.length - 1).trim()
        return splitTopLevel(inner, ',').map { parseValue(it.trim()) }
    }

    private fun splitTopLevel(s: String, separator: Char): List<String> {
        if (s.isEmpty()) return emptyList()
        val parts = mutableListOf<String>()
        var depth = 0
        var inString = false
        var start = 0
        for (i in s.indices) {
            val c = s[i]
            when {
                c == '"' && (i == 0 || s[i - 1] != '\\') -> inString = !inString
                !inString -> {
                    when (c) {
                        '{', '[' -> depth++
                        '}', ']' -> depth--
                        separator -> if (depth == 0) {
                            parts.add(s.substring(start, i))
                            start = i + 1
                        }
                    }
                }
            }
        }
        if (start < s.length) {
            parts.add(s.substring(start))
        }
        return parts
    }

    private fun splitKeyValue(s: String): Pair<String, Any?> {
        val colonIdx = findColonIndex(s)
        val key = s.substring(0, colonIdx).trim().let { unquote(it) }
        val valueStr = s.substring(colonIdx + 1).trim()
        return Pair(key, parseValue(valueStr))
    }

    private fun findColonIndex(s: String): Int {
        var depth = 0
        var inString = false
        for (i in s.indices) {
            val c = s[i]
            when {
                c == '"' && (i == 0 || s[i - 1] != '\\') -> inString = !inString
                !inString -> {
                    when (c) {
                        '{', '[' -> depth++
                        '}', ']' -> depth--
                        ':' -> if (depth == 0) return i
                    }
                }
            }
        }
        throw IllegalArgumentException("No colon found in key-value pair: $s")
    }

    private fun parseValue(s: String): Any? {
        val trimmed = s.trim()
        return when {
            trimmed == "null" -> null
            trimmed == "true" -> true
            trimmed == "false" -> false
            trimmed.startsWith("\"") -> unquote(trimmed)
            trimmed.startsWith("{") -> parseJsonObject(trimmed)
            trimmed.startsWith("[") -> parseJsonArray(trimmed)
            trimmed.contains('.') || trimmed.contains('e') || trimmed.contains('E') -> trimmed.toDoubleOrNull()
                ?: trimmed.toLong()
            else -> trimmed.toLongOrNull() ?: trimmed.toDoubleOrNull() ?: trimmed
        }
    }

    private fun unquote(s: String): String {
        var t = s.trim()
        if (t.startsWith("\"") && t.endsWith("\"")) {
            t = t.substring(1, t.length - 1)
        }
        return t.replace("\\\"", "\"").replace("\\\\", "\\")
            .replace("\\n", "\n").replace("\\t", "\t")
    }
}
