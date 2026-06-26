package at.kaufi.kantine.domain.i18n

import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class TranslationManagerTest {
    private lateinit var dataSource: TranslationDataSource
    private lateinit var manager: TranslationManager

    @Before
    fun setUp() {
        dataSource = mockk()
        every { dataSource.languageFlow } returns flowOf(null)
        manager = TranslationManager(dataSource)
    }

    @Test
    fun germanLocale_returnsGermanTranslation() {
        manager.setLanguage("de")
        assertEquals("Diese Woche", manager.t("thisWeek"))
    }

    @Test
    fun englishLocale_returnsEnglishTranslation() {
        manager.setLanguage("en")
        assertEquals("This Week", manager.t("thisWeek"))
    }

    @Test
    fun unknownKey_returnsKeyName() {
        assertEquals("unknownKey", manager.t("unknownKey"))
    }

    @Test
    fun setLanguage_updatesCurrentLang() {
        manager.setLanguage("en")
        assertEquals("en", manager.currentLang.value)
    }

    @Test
    fun dataStoreLanguageChange_updatesManager() = runBlocking {
        val languageFlow = MutableStateFlow<String?>(null)
        val ds = mockk<TranslationDataSource>()
        every { ds.languageFlow } returns languageFlow

        val mgr = TranslationManager(ds)

        kotlinx.coroutines.delay(100)
        assertEquals("de", mgr.currentLang.value)

        languageFlow.value = "en"
        kotlinx.coroutines.delay(100)

        assertEquals("en", mgr.currentLang.value)
        assertEquals("This Week", mgr.t("thisWeek"))
    }
}
