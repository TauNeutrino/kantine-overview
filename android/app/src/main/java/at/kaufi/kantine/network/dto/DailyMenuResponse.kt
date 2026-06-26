package at.kaufi.kantine.network.dto

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class DailyMenuResponse(
    val results: List<MenuGroup>,
)

@JsonClass(generateAdapter = true)
data class MenuGroup(
    val id: Int,
    val date: String,
    val venue: Int,
    val items: List<MenuItem>,
)
