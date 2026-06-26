package at.kaufi.kantine.network.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class UserResponse(
    @Json(name = "id") val pk: Int,
    val username: String,
    val email: String,
    val first_name: String,
    val last_name: String,
    val locale: String?,
    val language: String?,
)
