package at.kaufi.kantine.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import at.kaufi.kantine.data.auth.AuthRepository
import at.kaufi.kantine.data.auth.TokenManager
import at.kaufi.kantine.network.BessaException
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import javax.inject.Inject

sealed class LoginState {
    data object Idle : LoginState()
    data object Loading : LoginState()
    data object Success : LoginState()
    data class Error(val message: String) : LoginState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val tokenManager: TokenManager,
) : ViewModel() {

    private val _loginState = MutableStateFlow<LoginState>(LoginState.Idle)
    val loginState: StateFlow<LoginState> = _loginState.asStateFlow()

    init {
        autoLogin()
    }

    /**
     * Attempts to authenticate with the given [email] and [password].
     */
    fun login(email: String, password: String) {
        if (_loginState.value is LoginState.Loading) return

        _loginState.value = LoginState.Loading
        viewModelScope.launch {
            val result = authRepository.login(email, password)
            _loginState.value = when {
                result.isSuccess -> LoginState.Success
                else -> mapError(result.exceptionOrNull())
            }
        }
    }

    /**
     * Checks for an existing token and validates it on app start.
     * If the token is stale (API returns 401), clears it and returns to Idle.
     */
    fun autoLogin() {
        val token = tokenManager.getToken() ?: return

        _loginState.value = LoginState.Loading
        viewModelScope.launch {
            val result = authRepository.getUser()
            _loginState.value = when {
                result.isSuccess -> LoginState.Success
                else -> {
                    // Token is invalid or expired — wipe it and go back to login
                    tokenManager.clearToken()
                    LoginState.Idle
                }
            }
        }
    }

    /**
     * Resets the login state to Idle (e.g. after a dismissed error).
     */
    fun resetState() {
        _loginState.value = LoginState.Idle
    }

    private fun mapError(error: Throwable?): LoginState.Error {
        return when (error) {
            is BessaException.Unauthorized -> LoginState.Error(
                "Invalid email or password.",
            )

            is BessaException.RateLimited -> LoginState.Error(
                "Too many login attempts. Please wait and try again.",
            )

            is BessaException.NetworkError -> LoginState.Error(
                "Network error. Please check your connection.",
            )

            is BessaException.ServerError -> LoginState.Error(
                "Server error. Please try again later.",
            )

            is HttpException -> when (error.code()) {
                400 -> LoginState.Error("Invalid email or password.")
                else -> LoginState.Error("Login failed (${error.code()}). Try again.")
            }

            else -> LoginState.Error("Login failed. Please try again.")
        }
    }
}
