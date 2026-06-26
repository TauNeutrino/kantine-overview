package at.kaufi.kantine.network

import at.kaufi.kantine.network.dto.LoginRequest
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

class BessaApiTest {
    private val server = MockWebServer()
    private lateinit var api: BessaApi

    @Before
    fun setUp() {
        server.start()

        val tokenProvider = mockk<TokenProvider>()
        every { tokenProvider.getToken() } returns null

        val interceptor = BessaInterceptor(tokenProvider)
        val client = OkHttpClient.Builder()
            .addInterceptor(interceptor)
            .build()

        val moshi = Moshi.Builder()
            .addLast(KotlinJsonAdapterFactory())
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

        api = retrofit.create(BessaApi::class.java)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun login_returnsToken() = runBlocking {
        server.enqueue(
            MockResponse()
                .setBody("""{"key":"test-token-123"}""")
                .setResponseCode(200)
        )

        val response = api.login(LoginRequest("user@example.com", "password"))
        assertEquals("test-token-123", response.key)
    }

    @Test
    fun login_http401_throwsUnauthorized() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(401))

        try {
            api.login(LoginRequest("user@example.com", "wrong"))
            fail("Expected exception for 401")
        } catch (e: java.io.IOException) {
            assertTrue(e.message!!.contains("Unauthorized"))
        }
    }

    @Test
    fun login_rateLimit429_triggersRetryThenThrows() = runBlocking {
        repeat(4) {
            server.enqueue(
                MockResponse()
                    .setResponseCode(429)
                    .addHeader("Retry-After", "0")
            )
        }

        try {
            api.login(LoginRequest("user@example.com", "password"))
            fail("Expected exception after max retries")
        } catch (e: java.io.IOException) {
            assertTrue(e.message!!.contains("Rate limited"))
        }
    }
}
