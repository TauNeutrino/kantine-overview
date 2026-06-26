package at.kaufi.kantine.data.local

import androidx.room.Embedded
import androidx.room.Relation

data class WeekWithDays(
    @Embedded val week: WeekEntity,
    @Relation(
        parentColumn = "weekNumber",
        entityColumn = "weekNumber",
        entity = DayEntity::class,
    )
    val days: List<DayWithItems>,
)

data class DayWithItems(
    @Embedded val day: DayEntity,
    @Relation(
        parentColumn = "date",
        entityColumn = "dayDate",
        entity = MenuItemEntity::class,
    )
    val items: List<MenuItemEntity>,
)
