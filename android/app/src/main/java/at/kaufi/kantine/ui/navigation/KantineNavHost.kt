package at.kaufi.kantine.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import at.kaufi.kantine.ui.auth.AuthViewModel
import at.kaufi.kantine.ui.auth.LoginScreen
import at.kaufi.kantine.ui.week.WeekScreen

@Composable
fun KantineNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier,
) {
    val authViewModel: AuthViewModel = hiltViewModel()

    NavHost(
        navController = navController,
        startDestination = Screen.Login.route,
        modifier = modifier,
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.WeekView.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                viewModel = authViewModel,
            )
        }
        composable(Screen.WeekView.route) {
            WeekScreen(
                onLogout = {
                    authViewModel.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }
    }
}
