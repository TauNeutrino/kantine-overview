package at.kaufi.kantine.ui.week

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WeekScreen(
    onLogout: () -> Unit,
    viewModel: WeekScreenViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val selectedTab by viewModel.selectedTab.collectAsState()
    val currentLang by viewModel.currentLang.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state) {
        if (state is WeekScreenState.Error) {
            snackbarHostState.showSnackbar((state as WeekScreenState.Error).message)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Kantine") },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                        )
                    }
                    IconButton(onClick = onLogout) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Logout,
                            contentDescription = "Logout",
                        )
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            if (state is WeekScreenState.Loading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { viewModel.selectTab(0) },
                    text = { Text("Diese Woche") },
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { viewModel.selectTab(1) },
                    text = { Text("Nächste Woche") },
                )
            }

            when (val s = state) {
                is WeekScreenState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize())
                }

                is WeekScreenState.Success -> {
                    val weekData = if (selectedTab == 0) s.thisWeek else s.nextWeek
                    PullToRefreshBox(
                        isRefreshing = false,
                        onRefresh = { viewModel.refresh() },
                    ) {
                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                        ) {
                            item {
                                WeekHeader(
                                    weekLabel = weekData.weekLabel,
                                    dateRange = weekData.dateRange,
                                )
                            }
                            items(weekData.days) { day ->
                                DayCard(day = day, currentLang = currentLang)
                            }
                        }
                    }
                }

                is WeekScreenState.Error -> {
                    Box(modifier = Modifier.fillMaxSize())
                }
            }
        }
    }
}
