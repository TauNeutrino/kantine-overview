package at.kaufi.kantine.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import at.kaufi.kantine.data.local.dao.MenuDao

@Database(
    entities = [WeekEntity::class, DayEntity::class, MenuItemEntity::class],
    version = 1,
)
@TypeConverters(Converters::class)
abstract class KantineDatabase : RoomDatabase() {
    abstract fun menuDao(): MenuDao
}
