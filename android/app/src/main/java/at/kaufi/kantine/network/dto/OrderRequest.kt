package at.kaufi.kantine.network.dto

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class OrderRequest(
    val article: Int,
    val date: String,
    val amount: Int = 1,
)
