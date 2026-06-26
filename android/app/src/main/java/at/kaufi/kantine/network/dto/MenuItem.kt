package at.kaufi.kantine.network.dto

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class MenuItem(
    val id: Int,
    val article: Int,
    val name: String,
    val description: String?,
    val price: String,
    val available_amount: String?,
    val amount_tracking: Boolean,
    val allergens: List<String>?,
)
