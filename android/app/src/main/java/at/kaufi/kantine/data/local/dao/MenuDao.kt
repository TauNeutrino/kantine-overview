package at.kaufi.kantine.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import at.kaufi.kantine.data.local.DayEntity
import at.kaufi.kantine.data.local.MenuItemEntity
import at.kaufi.kantine.data.local.WeekEntity
import at.kaufi.kantine.data.local.WeekWithDays
import kotlinx.coroutines.flow.Flow

@Dao
interface MenuDao {
    @Query("SELECT * FROM weeks")
    fun getWeeks(): Flow<List<WeekEntity>>

    @Query("SELECT * FROM days WHERE weekNumber = :weekNumber AND weekYear = :year ORDER BY date")
    fun getDaysForWeek(weekNumber: Int, year: Int): Flow<List<DayEntity>>

    @Query("SELECT * FROM menu_items WHERE dayDate = :date")
    fun getItemsForDay(date: String): Flow<List<MenuItemEntity>>

    @Transaction
    @Query("SELECT * FROM weeks WHERE weekNumber = :weekNumber AND year = :year")
    fun getWeekWithDays(weekNumber: Int, year: Int): Flow<WeekWithDays?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertWeek(week: WeekEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDays(days: List<DayEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertItems(items: List<MenuItemEntity>)

    @Query("DELETE FROM menu_items WHERE dayDate IN (SELECT date FROM days WHERE weekNumber = :weekNumber AND weekYear = :year)")
    suspend fun deleteItemsForWeek(weekNumber: Int, year: Int)

    @Query("DELETE FROM days WHERE weekNumber = :weekNumber AND weekYear = :year")
    suspend fun deleteDaysForWeek(weekNumber: Int, year: Int)
}
