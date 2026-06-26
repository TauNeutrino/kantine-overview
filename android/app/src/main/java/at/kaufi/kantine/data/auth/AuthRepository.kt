package at.kaufi.kantine.data.auth

import at.kaufi.kantine.network.BessaApi
import at.kaufi.kantine.network.dto.LoginRequest
import at.kaufi.kantine.network.dto.UserResponse
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: BessaApi,
    private val tokenManager: TokenManager,
) {
    /**
     * Authenticates with [email] and [password].
     * On success the token is persisted via [TokenManager] and returned.
     */
    suspend fun login(email: String, password: String): Result<String> {
        return try {
            val response = api.login(LoginRequest(email = email, password = password))
            tokenManager.saveToken(response.key)
            Result.success(response.key)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Fetches the currently authenticated user profile.
     * The token is attached automatically by [at.kaufi.kantine.network.BessaInterceptor].
     */
    suspend fun getUser(): Result<UserResponse> {
        return try {
            Result.success(api.getUser())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
