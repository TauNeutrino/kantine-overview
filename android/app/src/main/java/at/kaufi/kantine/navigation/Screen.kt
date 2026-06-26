package at.kaufi.kantine.navigation

sealed class Screen(val route: String) {
    data object LoginScreen : Screen("login")
    data object WeekViewScreen : Screen("week_view")
}
