package at.kaufi.kantine.data.auth.di

import at.kaufi.kantine.data.auth.TokenManager
import at.kaufi.kantine.network.TokenProvider
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module for the auth data layer.
 *
 * Provides a real [TokenProvider] backed by [TokenManager] (EncryptedSharedPreferences),
 * replacing the dummy provider that was in [at.kaufi.kantine.network.di.NetworkModule].
 */
@Module
@InstallIn(SingletonComponent::class)
object AuthModule {

    @Provides
    @Singleton
    fun provideTokenProvider(tokenManager: TokenManager): TokenProvider =
        object : TokenProvider {
            override fun getToken(): String? = tokenManager.getToken()
        }
}
