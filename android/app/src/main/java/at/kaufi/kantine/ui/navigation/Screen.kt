package at.kaufi.kantine.ui.navigation

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object WeekView : Screen("week_view")
}
