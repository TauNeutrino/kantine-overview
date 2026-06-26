package at.kaufi.kantine.domain.i18n

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

@Singleton
class TranslationDataSource @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val languageKey = stringPreferencesKey("language")

    val languageFlow: Flow<String?> = context.dataStore.data
        .map { preferences ->
            preferences[languageKey]
        }

    suspend fun setLanguage(lang: String?) {
        context.dataStore.edit { preferences ->
            if (lang == null) {
                preferences.remove(languageKey)
            } else {
                preferences[languageKey] = lang
            }
        }
    }
}
