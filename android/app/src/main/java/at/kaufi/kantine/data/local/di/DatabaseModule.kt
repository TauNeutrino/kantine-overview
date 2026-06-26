package at.kaufi.kantine.data.local.di

import android.content.Context
import androidx.room.Room
import at.kaufi.kantine.data.local.KantineDatabase
import at.kaufi.kantine.data.local.dao.MenuDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): KantineDatabase =
        Room.databaseBuilder(context, KantineDatabase::class.java, "kantine.db").build()

    @Provides
    fun provideMenuDao(database: KantineDatabase): MenuDao = database.menuDao()
}
