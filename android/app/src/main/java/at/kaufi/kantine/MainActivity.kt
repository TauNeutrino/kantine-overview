package at.kaufi.kantine

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import at.kaufi.kantine.ui.theme.KantineTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            KantineTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    // Navigation will be added in a later task
                }
            }
        }
    }
}
