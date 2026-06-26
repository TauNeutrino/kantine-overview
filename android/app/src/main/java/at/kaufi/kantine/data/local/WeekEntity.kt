package at.kaufi.kantine.data.local

import androidx.room.Entity

@Entity(tableName = "weeks", primaryKeys = ["weekNumber", "year"])
data class WeekEntity(
    val weekNumber: Int,
    val year: Int,
)
