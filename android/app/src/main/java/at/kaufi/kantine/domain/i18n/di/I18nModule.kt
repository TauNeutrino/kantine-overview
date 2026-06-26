package at.kaufi.kantine.domain.i18n.di

import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/**
 * Hilt module for i18n bindings.
 *
 * [TranslationManager] is auto-bound via [@Inject constructor][javax.inject.Inject]
 * and [@Singleton] on the class itself — no explicit [@Provides][dagger.Provides]
 * is needed here. This module serves as an extension point for additional
 * i18n bindings as the domain layer grows.
 */
@Module
@InstallIn(SingletonComponent::class)
object I18nModule
