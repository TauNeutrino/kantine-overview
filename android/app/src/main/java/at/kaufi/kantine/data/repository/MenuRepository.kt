package at.kaufi.kantine.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import at.kaufi.kantine.data.local.DayEntity
import at.kaufi.kantine.data.local.MenuItemEntity
import at.kaufi.kantine.data.local.WeekEntity
import at.kaufi.kantine.data.local.WeekWithDays
import at.kaufi.kantine.data.local.dao.MenuDao
import at.kaufi.kantine.data.mapper.getISOWeekNumber
import at.kaufi.kantine.data.mapper.getISOWeekYear
import at.kaufi.kantine.data.mapper.mapDailyMenuResponseToEntities
import at.kaufi.kantine.network.BessaApi
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton

/**
 * DataStore for storing the last cache refresh timestamp.
 * Uses the standard [preferencesDataStore] delegate — no GlobalScope,
 * created once per process via the Context delegate pattern.
 */
private val Context.cachePrefs by preferencesDataStore(name = "menu_cache")

/**
 * Repository layer for menu data.
 *
 * Orchestrates API fetching, entity mapping, Room persistence, and cache
 * freshness checks — matching the JS implementation in actions.js.
 */
@Singleton
class MenuRepository @Inject constructor(
    private val bessaApi: BessaApi,
    private val menuDao: MenuDao,
    @ApplicationContext private val context: Context,
) {
    private companion object {
        /** Cache TTL: 60 minutes (matches JS: `ageMs > 60 * 60 * 1000`). */
        private const val CACHE_TTL_MS = 60 * 60 * 1000L

        /** Bessa venue ID (matches constants.js: VENUE_ID = 591). */
        private const val VENUE_ID = 591

        /** Bessa menu ID (matches constants.js: MENU_ID = 7). */
        private const val MENU_ID = 7

        /** Max parallel API requests per batch (matches JS: BATCH_SIZE = 5). */
        private const val BATCH_SIZE = 5

        /** Max days to fetch forward from cutoff (matches JS: slice(0, 30)). */
        private const val MAX_DAYS = 30

        /** Days to look backward from today (matches JS: cutoff.setDate(cutoff.getDate() - 7)). */
        private const val DAYS_BACKWARD = 7

        private val KEY_LAST_CACHE_TS = longPreferencesKey("last_cache_timestamp")
    }

    // ── Public API ──────────────────────────────────────────────────────

    /** Observe all cached weeks via Room's reactive Flow. */
    fun getWeeks(): Flow<List<WeekEntity>> = menuDao.getWeeks()

    /**
     * Refresh the menu cache from the API only if the local cache is stale.
     * @return `true` if a refresh was performed, `false` if cache was fresh.
     */
    suspend fun refreshMenuIfStale(): Boolean {
        if (isCacheFresh()) return false
        refreshMenu()
        return true
    }

    /**
     * Force a full API refresh regardless of cache freshness.
     *
     * Matches JS [loadMenuDataFromAPI] in actions.js (lines 897-1086):
     * 1. GET /venues/{venueId}/menu/dates/ → available dates
     * 2. Filter: last 7 days to +30 days
     * 3. Batch à 5 parallel requests per date
     * 4. Individual try/catch per date — failed dates are SKIPPED
     * 5. Structure into weeks → Room upsert
     * 6. Update cache timestamp
     */
    suspend fun refreshMenu() {
        // 1. Fetch available dates from API
        val datesResponse = bessaApi.getMenuDates(VENUE_ID)
        val allDates = datesResponse.results

        // 2. Filter: last 7 days to +30 days (matches JS lines 927-934)
        val cutoffDate = LocalDate.now().minusDays(DAYS_BACKWARD.toLong())
        val cutoffStr = cutoffDate.toString()

        val availableDates = allDates
            .filter { it.date >= cutoffStr }
            .sortedBy { it.date }
            .take(MAX_DAYS)

        if (availableDates.isEmpty()) return

        // Collect all day results keyed by week (year-weekNumber)
        // Using LinkedHashMap to preserve insertion (date) order
        val weeksMap = linkedMapOf<Pair<Int, Int>, MutableList<DayWithItems>>()

        // 3. Batch à 5 parallel requests (matches JS lines 942-987)
        coroutineScope {
            for (i in availableDates.indices step BATCH_SIZE) {
                val batchEnd = minOf(i + BATCH_SIZE, availableDates.size)
                val batch = availableDates.subList(i, batchEnd)

                val deferred = batch.map { dateObj ->
                    async {
                        try {
                            val response = bessaApi.getDailyMenu(VENUE_ID, MENU_ID, dateObj.date)
                            val mapping = mapDailyMenuResponseToEntities(dateObj.date, response)
                            if (mapping != null) {
                                val key = mapping.week.year to mapping.week.weekNumber
                                val dayItems = DayWithItems(
                                    day = mapping.days.first(),
                                    items = mapping.items,
                                )
                                key to dayItems
                            } else {
                                null
                            }
                        } catch (_: Exception) {
                            // 4. Individual try/catch per date — failed dates SKIPPED
                            null
                        }
                    }
                }

                for (deferredResult in deferred) {
                    val result = deferredResult.await()
                    if (result != null) {
                        val (key, dayWithItems) = result
                        weeksMap.getOrPut(key) { mutableListOf() }.add(dayWithItems)
                    }
                }
            }
        }

        if (weeksMap.isEmpty()) return

        // 5. Structure results into weeks/days/items → Room upsert
        val weeks = weeksMap.map { (key, daysWithItems) ->
            val (year, weekNumber) = key
            WeekEntry(
                year = year,
                weekNumber = weekNumber,
                days = daysWithItems,
            )
        }.sortedWith(compareBy({ it.year }, { it.weekNumber }))

        for (entry in weeks) {
            // Clear old data for this week first (avoids stale orphaned items)
            menuDao.deleteItemsForWeek(entry.weekNumber, entry.year)
            menuDao.deleteDaysForWeek(entry.weekNumber, entry.year)
        }

        for (entry in weeks) {
            menuDao.upsertWeek(
                WeekEntity(
                    weekNumber = entry.weekNumber,
                    year = entry.year,
                )
            )
        }

        for (entry in weeks) {
            menuDao.upsertDays(entry.days.map { it.day })
            menuDao.upsertItems(entry.days.flatMap { it.items })
        }

        // 6. Update cache timestamp
        updateCacheTimestamp()
    }

    /**
     * Check whether the cached menu data is still fresh.
     *
     * Matches JS [isCacheFresh] in actions.js (lines 879-895):
     * - TTL: 60 minutes since last cache update
     * - Current week must exist in Room with at least one day
     * - Returns `true` ONLY if BOTH conditions are met
     */
    suspend fun isCacheFresh(): Boolean {
        val timestamp = getCacheTimestamp()
        if (timestamp == null) return false

        val ageMs = System.currentTimeMillis() - timestamp
        if (ageMs > CACHE_TTL_MS) return false

        val now = LocalDate.now()
        val thisWeek = getISOWeekNumber(now)
        val thisYear = getISOWeekYear(now)

        val currentWeek = menuDao.getWeekWithDays(thisWeek, thisYear).firstOrNull()
        if (currentWeek == null || currentWeek.days.isEmpty()) return false

        return true
    }

    /**
     * Get a specific week with its days and menu items.
     */
    suspend fun getWeek(weekNumber: Int, year: Int): WeekWithDays? =
        menuDao.getWeekWithDays(weekNumber, year).firstOrNull()

    // ── Internal helpers ────────────────────────────────────────────────

    private suspend fun getCacheTimestamp(): Long? {
        val prefs = context.cachePrefs.data.firstOrNull() ?: return null
        return prefs[KEY_LAST_CACHE_TS]
    }

    private suspend fun updateCacheTimestamp() {
        context.cachePrefs.edit { prefs ->
            prefs[KEY_LAST_CACHE_TS] = System.currentTimeMillis()
        }
    }
}

/**
 * Internal data class used during batch assembly before Room upsert.
 */
private data class DayWithItems(
    val day: DayEntity,
    val items: List<MenuItemEntity>,
)

/**
 * Internal data class grouping a week's data for ordered upsert.
 */
private data class WeekEntry(
    val year: Int,
    val weekNumber: Int,
    val days: List<DayWithItems>,
)
