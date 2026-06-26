package at.kaufi.kantine.ui.week

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
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters
import java.util.Locale
import javax.inject.Inject

data class MenuItemData(
    val name: String,
    val description: String,
    val price: String,
    val isAvailable: Boolean,
)

data class DayData(
    val dateLabel: String,
    val items: List<MenuItemData>,
)

data class WeekData(
    val weekLabel: String,
    val dateRange: String,
    val days: List<DayData>,
)

sealed interface WeekScreenState {
    data object Loading : WeekScreenState
    data class Success(
        val thisWeek: WeekData,
        val nextWeek: WeekData,
    ) : WeekScreenState
    data class Error(val message: String) : WeekScreenState
}

@HiltViewModel
class WeekScreenViewModel @Inject constructor(
    private val menuRepository: MenuRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<WeekScreenState>(WeekScreenState.Loading)
    val state: StateFlow<WeekScreenState> = _state.asStateFlow()

    private val _selectedTab = MutableStateFlow(0)
    val selectedTab: StateFlow<Int> = _selectedTab.asStateFlow()

    init { loadData() }

    fun loadData() {
        viewModelScope.launch {
            _state.value = WeekScreenState.Loading
            try {
                val now = LocalDate.now()
                val thisWeekNumber = getISOWeekNumber(now)
                val thisWeekYear = getISOWeekYear(now)
                if (!menuRepository.isCacheFresh()) {
                    menuRepository.refreshMenu()
                }
                val thisWeekDb = menuRepository.getWeek(thisWeekNumber, thisWeekYear)
                val nextMonday = now.with(TemporalAdjusters.next(DayOfWeek.MONDAY))
                val nextWeekNumber = getISOWeekNumber(nextMonday)
                val nextWeekYear = getISOWeekYear(nextMonday)
                var nextWeekDb: WeekWithDays? = menuRepository.getWeek(nextWeekNumber, nextWeekYear)
                if (nextWeekDb == null && nextWeekNumber == thisWeekNumber) {
                    nextWeekDb = thisWeekDb
                }
                _state.value = WeekScreenState.Success(
                    thisWeek = toWeekData(thisWeekDb, thisWeekNumber),
                    nextWeek = toWeekData(nextWeekDb, nextWeekNumber),
                )
            } catch (e: Exception) {
                _state.value = WeekScreenState.Error(e.message ?: "Fehler beim Laden")
            }
        }
    }

    fun refresh() { loadData() }

    fun selectTab(index: Int) { _selectedTab.value = index }

    private fun toWeekData(week: WeekWithDays?, weekNumber: Int): WeekData {
        if (week == null) return WeekData("KW $weekNumber", "", emptyList())
        val monday = week.days.firstOrNull()?.let { d ->
            try { LocalDate.parse(d.day.date) } catch (_: Exception) { null }
        }
        val dateRange = if (monday != null) {
            val sunday = monday.plusDays(6)
            val fmt = java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy", Locale.GERMAN)
            "${monday.format(fmt)} – ${sunday.format(fmt)}"
        } else ""
        return WeekData(
            weekLabel = "KW $weekNumber",
            dateRange = dateRange,
            days = week.days.map { day ->
                val dateFormatter = java.time.format.DateTimeFormatter.ofPattern("EEEE, dd.MM.", Locale.GERMAN)
                val dateLabel = try {
                    LocalDate.parse(day.day.date).format(dateFormatter)
                } catch (_: Exception) { day.day.date }
                DayData(
                    dateLabel = dateLabel,
                    items = day.items.map { item ->
                        MenuItemData(
                            name = item.name,
                            description = item.description ?: "",
                            price = formatPrice(item.price),
                            isAvailable = item.available,
                        )
                    }
                )
            }
        )
    }

    private fun formatPrice(price: Any?): String {
        return when (price) {
            is Double -> "€%.2f".format(Locale.GERMAN, price)
            is Int -> "€%d,00".format(price)
            is String -> "€$price".replace(".", ",")
            else -> ""
        }
    }
}
