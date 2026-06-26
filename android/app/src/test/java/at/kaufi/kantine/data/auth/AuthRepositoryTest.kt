package at.kaufi.kantine.data.auth

import at.kaufi.kantine.network.BessaApi
import at.kaufi.kantine.network.dto.LoginRequest
import at.kaufi.kantine.network.dto.LoginResponse
import at.kaufi.kantine.network.dto.UserResponse
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class AuthRepositoryTest {
    private lateinit var api: BessaApi
    private lateinit var tokenManager: TokenManager
    private lateinit var repository: AuthRepository

    @Before
    fun setUp() {
        api = mockk()
        tokenManager = mockk(relaxed = true)
        repository = AuthRepository(api, tokenManager)
    }

    @Test
    fun login_success_savesToken() = runBlocking {
        coEvery { api.login(any()) } returns LoginResponse("test-token")

        val result = repository.login("user@example.com", "password")

        assertTrue(result.isSuccess)
        assertEquals("test-token", result.getOrNull())
        coVerify { tokenManager.saveToken("test-token") }
    }

    @Test
    fun login_failure401_returnsFailure() = runBlocking {
        val exception = RuntimeException("HTTP 401")
        coEvery { api.login(any()) } throws exception

        val result = repository.login("user@example.com", "wrong")

        assertTrue(result.isFailure)
    }

    @Test
    fun getUser_with401_returnsFailure() = runBlocking {
        val exception = RuntimeException("HTTP 401")
        coEvery { api.getUser() } throws exception

        val result = repository.getUser()

        assertTrue(result.isFailure)
    }
}
