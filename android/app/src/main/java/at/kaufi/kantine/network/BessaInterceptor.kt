package at.kaufi.kantine.network

import okhttp3.Interceptor
import okhttp3.Response
import java.util.concurrent.TimeUnit
import javax.inject.Inject

/**
 * OkHttp interceptor for the Bessa API.
 *
 * - Attaches [Authorization] and [X-Client-Version] headers.
 * - Handles 401 → [BessaException.Unauthorized]
 * - Handles 429 → exponential backoff up to 3 retries → [BessaException.RateLimited]
 * - Handles 5xx → [BessaException.ServerError]
 */
class BessaInterceptor @Inject constructor(
    private val tokenProvider: TokenProvider,
) : Interceptor {

    companion object {
        private const val MAX_RETRIES = 3
        private const val DEFAULT_RETRY_AFTER_SECONDS = 1L
        private const val CLIENT_VERSION = "1.0.0"
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val token = tokenProvider.getToken()

        val request = original.newBuilder().apply {
            token?.let { addHeader("Authorization", "Token $it") }
            addHeader("X-Client-Version", CLIENT_VERSION)
        }.build()

        var retries = 0
        while (true) {
            val response = chain.proceed(request)

            when (response.code) {
                401 -> {
                    response.close()
                    throw BessaException.Unauthorized()
                }

                429 -> {
                    response.close()
                    if (retries >= MAX_RETRIES) {
                        val retryAfterMs = response.header("Retry-After")
                            ?.toLongOrNull()
                            ?.let { TimeUnit.SECONDS.toMillis(it) }
                            ?: TimeUnit.SECONDS.toMillis(DEFAULT_RETRY_AFTER_SECONDS)
                        throw BessaException.RateLimited(retryAfterMs)
                    }
                    val waitMs = response.header("Retry-After")
                        ?.toLongOrNull()
                        ?.let { TimeUnit.SECONDS.toMillis(it) }
                        ?: TimeUnit.SECONDS.toMillis(DEFAULT_RETRY_AFTER_SECONDS)
                    val backoffMs = waitMs * (1L shl retries)
                    Thread.sleep(backoffMs)
                    retries++
                }

                in 500..599 -> {
                    response.close()
                    throw BessaException.ServerError(response.code)
                }

                else -> return response
            }
        }
    }
}
