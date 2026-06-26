package at.kaufi.kantine.data.local

import androidx.room.Entity
import androidx.room.ForeignKey

@Entity(
    tableName = "days",
    foreignKeys = [
        ForeignKey(
            entity = WeekEntity::class,
            parentColumns = ["weekNumber", "year"],
            childColumns = ["weekNumber", "weekYear"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    primaryKeys = ["date"],
    indices = [
        androidx.room.Index(value = ["weekNumber", "weekYear"]),
    ],
)
data class DayEntity(
    val date: String,
    val weekday: String,
    val orderCutoff: String?,
    val weekNumber: Int,
    val weekYear: Int,
)
