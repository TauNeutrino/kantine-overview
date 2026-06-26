package at.kaufi.kantine.data.local

import androidx.room.TypeConverter

class Converters {
    @TypeConverter
    fun fromBooleanToInt(value: Boolean?): Int? = value?.let { if (it) 1 else 0 }

    @TypeConverter
    fun toBooleanFromInt(value: Int?): Boolean? = value?.let { it == 1 }
}
