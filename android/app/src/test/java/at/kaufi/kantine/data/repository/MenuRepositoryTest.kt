package at.kaufi.kantine.data.repository

import android.content.Context
import at.kaufi.kantine.data.local.WeekEntity
import at.kaufi.kantine.data.local.WeekWithDays
import at.kaufi.kantine.data.local.dao.MenuDao
import at.kaufi.kantine.network.BessaApi
import at.kaufi.kantine.network.dto.DailyMenuResponse
import at.kaufi.kantine.network.dto.MenuDate
import at.kaufi.kantine.network.dto.MenuDateResponse
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test
import java.io.File
import java.time.LocalDate

class MenuRepositoryTest {
    private lateinit var bessaApi: BessaApi
    private lateinit var menuDao: MenuDao
    private lateinit var context: Context
    private lateinit var repository: MenuRepository
    private lateinit var tempDir: File

    @Before
    fun setUp() {
        bessaApi = mockk()
        menuDao = mockk(relaxed = true)
        context = mockk(relaxed = true)
        tempDir = File(System.getProperty("java.io.tmpdir"), "menu-test-" + System.currentTimeMillis())
        tempDir.mkdirs()
        every { context.filesDir } returns tempDir
        every { context.applicationContext } returns context
        repository = MenuRepository(bessaApi, menuDao, context)
    }

    @Test
    fun refreshMenu_storesDataInRoom() = runBlocking {
        val today = LocalDate.now().toString()
        val dates = listOf(MenuDate(today, emptyList()))
        coEvery { bessaApi.getMenuDates(any()) } returns MenuDateResponse(dates)

        val menuItem = at.kaufi.kantine.network.dto.MenuItem(
            id = 1,
            article = 1,
            name = "Test Dish",
            description = "A test dish",
            price = "5.00",
            amount_tracking = false,
            available_amount = "10",
            allergens = emptyList(),
        )
        val menuGroup = at.kaufi.kantine.network.dto.MenuGroup(
            id = 1,
            date = today,
            venue = 591,
            items = listOf(menuItem),
        )
        coEvery { bessaApi.getDailyMenu(any(), any(), any()) } returns DailyMenuResponse(listOf(menuGroup))

        repository.refreshMenu()

        coVerify { menuDao.upsertWeek(any()) }
        coVerify { menuDao.upsertDays(any()) }
    }

    @Test
    fun isCacheFresh_noCache_returnsFalse() = runBlocking {
        val result = repository.isCacheFresh()
        assertFalse(result)
    }

    @Test
    fun getWeek_returnsCorrectWeek() = runBlocking {
        val weekEntity = WeekEntity(weekNumber = 5, year = 2024)
        val weekWithDays = WeekWithDays(
            week = weekEntity,
            days = emptyList()
        )
        coEvery { menuDao.getWeekWithDays(5, 2024) } returns flowOf(weekWithDays)

        val result = repository.getWeek(5, 2024)

        assertNotNull(result)
        assertEquals(5, result?.week?.weekNumber)
        assertEquals(2024, result?.week?.year)
    }
}
