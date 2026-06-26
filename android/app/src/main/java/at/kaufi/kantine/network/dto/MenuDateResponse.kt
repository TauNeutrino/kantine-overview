package at.kaufi.kantine.network.dto

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class MenuDateResponse(
    val results: List<MenuDate>,
)

@JsonClass(generateAdapter = true)
data class MenuDate(
    val date: String,
    val orders: List<Any>,
)
