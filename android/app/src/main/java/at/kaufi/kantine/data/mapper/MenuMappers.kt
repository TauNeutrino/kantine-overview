package at.kaufi.kantine.data.mapper

import at.kaufi.kantine.data.local.DayEntity
import at.kaufi.kantine.data.local.MenuItemEntity
import at.kaufi.kantine.data.local.WeekEntity
import at.kaufi.kantine.network.dto.DailyMenuResponse
import at.kaufi.kantine.network.dto.MenuItem
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.WeekFields
import java.util.Locale

/**
 * Maps a network [MenuItem] to a Room [MenuItemEntity] for the given [dayDate].
 *
 * Matches the JS mapping in actions.js (lines 1023-1036):
 *   - id = "${day.date}_${item.id}"
 *   - articleId = item.id
 *   - available = amount_tracking == false || available_amount > 0
 *   - amountTracking = item.amount_tracking !== false
 */
fun MenuItem.toEntity(dayDate: String): MenuItemEntity {
    val isUnlimited = !amount_tracking
    val hasStock = (available_amount?.toIntOrNull() ?: 0) > 0
    return MenuItemEntity(
        id = "${dayDate}_$id",
        articleId = id,
        name = name,
        description = description,
        price = price,
        available = isUnlimited || hasStock,
        availableAmount = available_amount?.toIntOrNull() ?: 0,
        amountTracking = amount_tracking,
        dayDate = dayDate,
    )
}

/**
 * Result of mapping a [DailyMenuResponse] + date string into Room entities.
 */
data class MenuMappingResult(
    val week: WeekEntity,
    val days: List<DayEntity>,
    val items: List<MenuItemEntity>,
)

/**
 * Maps an API [DailyMenuResponse] for a given [dateStr] into [MenuMappingResult].
 *
 * Returns null when the response contains no items (matching JS behavior
 * where empty days are skipped — see actions.js lines 962-968).
 */
fun mapDailyMenuResponseToEntities(
    dateStr: String,
    response: DailyMenuResponse,
): MenuMappingResult? {
    val items = response.results
        .flatMap { group -> group.items }
        .map { it.toEntity(dateStr) }

    if (items.isEmpty()) return null

    val date = LocalDate.parse(dateStr)
    val weekNumber = getISOWeekNumber(date)
    val year = getISOWeekYear(date)
    val weekday = date.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.US)

    // Order cutoff: same day at 10:00 (matches JS: orderCutoffDate.setHours(10, 0, 0, 0))
    val orderCutoff = date.atTime(10, 0).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)

    val day = DayEntity(
        date = dateStr,
        weekday = weekday,
        orderCutoff = "${orderCutoff}Z",
        weekNumber = weekNumber,
        weekYear = year,
    )

    val week = WeekEntity(
        weekNumber = weekNumber,
        year = year,
    )

    return MenuMappingResult(
        week = week,
        days = listOf(day),
        items = items,
    )
}

/**
 * ISO-8601 week number using [WeekFields.ISO.weekOfWeekBasedYear].
 * Must produce the same result as JS getISOWeek() in utils.js.
 */
fun getISOWeekNumber(date: LocalDate): Int =
    date.get(WeekFields.ISO.weekOfWeekBasedYear())

/**
 * ISO-8601 week-based year using [WeekFields.ISO.weekBasedYear].
 */
fun getISOWeekYear(date: LocalDate): Int =
    date.get(WeekFields.ISO.weekBasedYear())
