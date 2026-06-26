package at.kaufi.kantine.ui.menu

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import at.kaufi.kantine.data.local.WeekWithDays
import at.kaufi.kantine.data.mapper.getISOWeekNumber
import at.kaufi.kantine.data.mapper.getISOWeekYear
import at.kaufi.kantine.data.repository.MenuRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/**
 * UI state for the week menu overview screen.
 *
 * Matches the three-state model from the JS rendering cycle:
 *   - [Loading]: initial state, shown while cache is checked / API is fetched
 *   - [Success]: week menu data ready for rendering, with a human-readable label
 *   - [Error]: a recoverable error message (network, missing data, etc.)
 */
sealed interface WeekUiState {
    data object Loading : WeekUiState

    data class Success(
        val weekMenu: WeekWithDays,
        val weekLabel: String,
    ) : WeekUiState

    data class Error(val message: String) : WeekUiState
}

/**
 * ViewModel that orchestrates menu data loading for the current week.
 *
 * Ports the JS [loadMenuDataFromAPI] flow from actions.js:
 * 1. Check [MenuRepository.isCacheFresh] — TTL 60 min + current week in Room
 * 2. If stale → call [MenuRepository.refreshMenu] (batched API fetch → Room upsert)
 * 3. Load current week from Room → map to [WeekUiState]
 *
 * The [uiState] flow emits [Loading], then either [Success] or [Error].
 * Call [refresh] to re-trigger the full cycle (e.g. after pull-to-refresh).
 */
@HiltViewModel
class WeekViewModel @Inject constructor(
    private val menuRepository: MenuRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<WeekUiState>(WeekUiState.Loading)
    val uiState: StateFlow<WeekUiState> = _uiState.asStateFlow()

    init {
        loadWeekData()
    }

    /**
     * Loads the current week's menu data.
     *
     * Mirroring the JS logic from actions.js [loadMenuDataFromAPI]:
     * - Always starts with [WeekUiState.Loading]
     * - Checks cache freshness first (skips API call when still fresh)
     * - Falls back to API refresh when stale
     * - Loads the result from Room into [WeekUiState.Success]
     * - Catches all exceptions into [WeekUiState.Error] (never crashes)
     */
    private fun loadWeekData() {
        viewModelScope.launch {
            _uiState.value = WeekUiState.Loading

            try {
                val now = LocalDate.now()
                val weekNumber = getISOWeekNumber(now)
                val year = getISOWeekYear(now)
                val weekLabel = "KW $weekNumber"

                // Step 1 + 2: cache check → refresh if stale
                // Matches JS: if (!isCacheFresh()) { await loadMenuDataFromAPI(); }
                if (!menuRepository.isCacheFresh()) {
                    menuRepository.refreshMenu()
                }

                // Step 3: load current week from Room
                // Matches JS: read from weekCache Map (Room is the source of truth)
                val week: WeekWithDays? = menuRepository.getWeek(weekNumber, year)

                if (week != null) {
                    _uiState.value = WeekUiState.Success(
                        weekMenu = week,
                        weekLabel = weekLabel,
                    )
                } else {
                    _uiState.value = WeekUiState.Error(
                        message = "Keine Menüdaten für $weekLabel verfügbar",
                    )
                }
            } catch (e: Exception) {
                _uiState.value = WeekUiState.Error(
                    message = e.message ?: "Fehler beim Laden der Menüdaten",
                )
            }
        }
    }

    /**
     * Re-triggers the full data-loading cycle.
     *
     * Call this from pull-to-refresh, swipe gesture, or explicit retry button
     * bound to the [WeekUiState.Error] state.
     */
    fun refresh() {
        loadWeekData()
    }
}
