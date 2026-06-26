package at.kaufi.kantine.domain.i18n

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TranslationManager @Inject constructor(
    private val translationDataSource: TranslationDataSource,
) {
    private val deMap = DeTranslations.map
    private val enMap = EnTranslations.map

    private val _currentLang = MutableStateFlow(resolveInitialLang())
    val currentLang: StateFlow<String> = _currentLang.asStateFlow()

    private val scope = CoroutineScope(Dispatchers.Default + Job())

    init {
        scope.launch {
            translationDataSource.languageFlow.collect { lang ->
                _currentLang.value = resolveLang(lang)
            }
        }
    }

    fun t(key: String): String {
        val lang = _currentLang.value
        val map = if (lang == "en") enMap else deMap
        return map[key] ?: key
    }

    fun setLanguage(lang: String?) {
        val resolved = resolveLang(lang)
        _currentLang.value = resolved
    }

    private fun resolveInitialLang(): String {
        return when (Locale.getDefault().language) {
            "en" -> "en"
            else -> "de"
        }
    }

    private fun resolveLang(lang: String?): String {
        return when (lang) {
            "en" -> "en"
            else -> "de"
        }
    }
}
