package at.kaufi.kantine.network.dto

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class LoginResponse(
    val key: String,
)
