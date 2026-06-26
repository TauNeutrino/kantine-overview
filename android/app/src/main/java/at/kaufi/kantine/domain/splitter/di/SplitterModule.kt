package at.kaufi.kantine.domain.splitter.di

import at.kaufi.kantine.domain.splitter.LangModel
import at.kaufi.kantine.domain.splitter.SeedLoader
import at.kaufi.kantine.domain.splitter.Splitter
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing the [LangModel] singleton for the DE/EN splitter.
 *
 * The model is loaded once at app startup via [SeedLoader], which initializes
 * [Splitter]'s default model. This module provides the exposed [LangModel]
 * reference for potential direct injection.
 */
@Module
@InstallIn(SingletonComponent::class)
object SplitterModule {

    @Provides
    @Singleton
    fun provideLangModel(seedLoader: SeedLoader): LangModel {
        seedLoader.loadAndInit()
        // Return the model that Splitter initialised.
        // Splitter.createDefaultLangModel() will return it after init.
        return Splitter.createDefaultLangModel()
    }
}
