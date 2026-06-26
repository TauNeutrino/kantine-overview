package at.kaufi.kantine.data.local

import androidx.room.Entity
import androidx.room.ForeignKey

@Entity(
    tableName = "menu_items",
    foreignKeys = [
        ForeignKey(
            entity = DayEntity::class,
            parentColumns = ["date"],
            childColumns = ["dayDate"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    primaryKeys = ["id"],
    indices = [
        androidx.room.Index(value = ["dayDate"]),
    ],
)
data class MenuItemEntity(
    val id: String,
    val articleId: Int,
    val name: String,
    val description: String?,
    val price: String,
    val available: Boolean,
    val availableAmount: Int?,
    val amountTracking: Boolean,
    val dayDate: String,
)
