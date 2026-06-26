package at.kaufi.kantine.data.repository.di

import at.kaufi.kantine.data.repository.MenuRepository
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing repository-layer singletons.
 *
 * [MenuRepository] is auto-bound via [@Inject constructor][javax.inject.Inject]
 * and [@Singleton] on the class itself — no explicit [@Provides][dagger.Provides]
 * is needed here. This module serves as an extension point for additional
 * repository bindings as the data layer grows.
 */
@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule
