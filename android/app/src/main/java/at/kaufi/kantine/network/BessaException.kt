package at.kaufi.kantine.network

import okio.IOException

sealed class BessaException(message: String, cause: Throwable? = null) : Exception(message, cause) {
    class NetworkError(cause: Throwable) : BessaException("Network error", cause)
    class Unauthorized : BessaException("Token expired or invalid")
    class RateLimited(retryAfterMs: Long) : BessaException("Rate limited")
    class ServerError(code: Int) : BessaException("Server error: $code")
}
