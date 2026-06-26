package at.kaufi.kantine.screenshot

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import at.kaufi.kantine.ui.theme.KantineTheme
import at.kaufi.kantine.ui.week.DayCard
import at.kaufi.kantine.ui.week.DayData
import at.kaufi.kantine.ui.week.MenuItemData
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tools.fastlane.screengrab.Screengrab

@RunWith(AndroidJUnit4::class)
class DayCardScreenshotTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun dayCard() {
        val dayData = DayData(
            dateLabel = "Montag, 23. Juni",
            items = listOf(
                MenuItemData(
                    name = "Schnitzel mit Kartoffelsalat",
                    description = "Schweineschnitzel, Kartoffelsalat, Preiselbeeren",
                    price = "\u20AC8,50",
                    isAvailable = true,
                    nameDe = "Schnitzel mit Kartoffelsalat",
                    nameEn = "Schnitzel with potato salad"
                ),
                MenuItemData(
                    name = "Vegetarisches Curry",
                    description = "Saisonales Gem\u00FCse, Basmatireis, Kokosso\u00DFe",
                    price = "\u20AC7,20",
                    isAvailable = true,
                    nameDe = "Vegetarisches Curry",
                    nameEn = "Vegetable curry"
                )
            )
        )
        composeTestRule.setContent {
            KantineTheme {
                DayCard(day = dayData, currentLang = "de")
            }
        }
        composeTestRule.waitForIdle()
        Screengrab.screenshot("day_card")
    }
}
