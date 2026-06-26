package at.kaufi.kantine.domain.splitter

import android.content.Context
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.BufferedReader
import java.io.InputStreamReader
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Loads the lang_model_seed.json from res/raw/ at app start and initializes
 * the [LangModel] singleton via [Splitter.setDefaultModel].
 */
@Singleton
class SeedLoader @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val moshi: Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    /**
     * Load seed data from raw resource, parse into [LangModelSeed], create a [LangModel],
     * and set it as the default for [Splitter].
     */
    fun loadAndInit() {
        val json = readRawResource("lang_model_seed")
        val adapter = moshi.adapter(LangModelSeed::class.java)
        val seed = adapter.fromJson(json)
            ?: throw IllegalStateException("Failed to parse lang_model_seed.json")

        val model = LangModel(seed)
        Splitter.setDefaultModel(model)
    }

    private fun readRawResource(name: String): String {
        val resId = context.resources.getIdentifier(name, "raw", context.packageName)
        val inputStream = context.resources.openRawResource(resId)
        return BufferedReader(InputStreamReader(inputStream)).use { it.readText() }
    }
}
