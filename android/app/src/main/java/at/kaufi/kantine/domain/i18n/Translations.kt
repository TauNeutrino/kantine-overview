package at.kaufi.kantine.domain.i18n

object DeTranslations {
    val map: Map<String, String> = mapOf(
        // Navigation
        "thisWeek" to "Diese Woche",
        "nextWeek" to "Nächste Woche",
        "nextWeekTooltipDefault" to "Menü nächster Woche anzeigen",
        "thisWeekTooltip" to "Menü dieser Woche anzeigen",

        // Header
        "appTitle" to "Kantinen Übersicht",
        "updatedAt" to "Aktualisiert",
        "langTooltip" to "Sprache der Menübeschreibung",
        "weekLabel" to "Woche",

        // Action buttons
        "refresh" to "Menüdaten neu laden",
        "history" to "Bestellhistorie",
        "highlights" to "Persönliche Highlights verwalten",
        "themeTooltip" to "Erscheinungsbild (Hell/Dunkel) wechseln",
        "login" to "Anmelden",
        "loginTooltip" to "Mit Bessa.app Account anmelden",
        "logout" to "Abmelden",
        "logoutTooltip" to "Von Bessa.app abmelden",

        // Login modal
        "loginTitle" to "Login",
        "employeeId" to "Mitarbeiternummer",
        "employeeIdPlaceholder" to "z.B. 2041",
        "employeeIdHelp" to "Deine offizielle Knapp Mitarbeiternummer.",
        "password" to "Passwort",
        "passwordPlaceholder" to "Bessa Passwort",
        "passwordHelp" to "Das Passwort für deinen Bessa Account.",
        "loginButton" to "Einloggen",
        "loggingIn" to "Wird eingeloggt...",

        // Highlights modal
        "highlightsTitle" to "Meine Highlights",
        "highlightsDesc" to "Markiere Menüs automatisch, wenn sie diese Schlagwörter enthalten.",
        "tagInputPlaceholder" to "z.B. Schnitzel, Vegetarisch...",
        "tagInputTooltip" to "Neues Schlagwort zum Hervorheben eingeben",
        "addTag" to "Hinzufügen",
        "addTagTooltip" to "Schlagwort zur Liste hinzufügen",
        "removeTagTooltip" to "Schlagwort entfernen",

        // History modal
        "historyTitle" to "Bestellhistorie",
        "loadingHistory" to "Lade Historie...",
        "noOrders" to "Keine Bestellungen gefunden.",
        "orders" to "Bestellungen",
        "historyMonthToggle" to "Klicken, um die Bestellungen für diesen Monat ein-/auszublenden",

        // Menu item labels
        "available" to "Verfügbar",
        "soldOut" to "Ausverkauft",
        "ordered" to "Bestellt",
        "orderButton" to "Bestellen",
        "orderAgainTooltip" to "nochmal bestellen",
        "orderTooltip" to "bestellen",
        "cancelOrder" to "Bestellung stornieren",
        "cancelOneOrder" to "Eine Bestellung stornieren",
        "flagActivate" to "Benachrichtigen wenn verfügbar",
        "flagDeactivate" to "Benachrichtigung deaktivieren",

        // Alarm bell
        "alarmTooltipNone" to "Keine beobachteten Menüs",
        "alarmLastChecked" to "Zuletzt geprüft",

        // Version modal
        "versionsTitle" to "📦 Versionen",
        "currentVersion" to "Aktuell",
        "devModeLabel" to "Dev-Mode (alle Tags anzeigen)",
        "loadingVersions" to "Lade Versionen...",
        "noVersions" to "Keine Versionen gefunden.",
        "installed" to "✓ Installiert",
        "newVersion" to "⬆ Neu!",
        "installLink" to "Installieren",
        "reportBug" to "Fehler melden",
        "reportBugTooltip" to "Melde einen Fehler auf GitHub",
        "featureRequest" to "Feature vorschlagen",
        "featureRequestTooltip" to "Schlage ein neues Feature auf GitHub vor",
        "clearCache" to "Lokalen Cache leeren",
        "clearCacheTooltip" to "Löscht alle lokalen Daten & erzwingt einen Neuladen",
        "clearCacheConfirm" to "Möchtest du wirklich alle lokalen Daten (inkl. Login-Session, Cache und Einstellungen) löschen? Die Seite wird danach neu geladen.",
        "versionMenuTooltip" to "Klick für Versionsmenü",

        // Progress modal
        "progressTitle" to "Menüdaten aktualisieren",
        "progressInit" to "Initialisierung...",

        // Empty state
        "noMenuData" to "Keine Menüdaten für KW",
        "noMenuDataHint" to "Versuchen Sie eine andere Woche oder schauen Sie später vorbei.",

        // Countdown
        "orderDeadline" to "Bestellschluss",

        // Toast messages
        "flagRemoved" to "Flag entfernt für",
        "flagActivated" to "Benachrichtigung aktiviert für",
        "menuChecked" to "geprüft",
        "menuSingular" to "Menü",
        "menuPlural" to "Menüs",
        "newMenuDataAvailable" to "Neue Menüdaten für nächste Woche verfügbar!",
        "orderSuccess" to "Bestellt",
        "cancelSuccess" to "Storniert",
        "bgSyncFailed" to "Hintergrund-Synchronisation fehlgeschlagen",
        "historyLoadError" to "Fehler beim Laden der Historie.",
        "historyLoadingFull" to "Lade Bestellhistorie...",
        "historyLoadingDelta" to "Suche nach neuen Bestellungen...",
        "historyLoadingItem" to "Lade Bestellung",
        "historyLoadingOf" to "von",
        "historyLoadingNew" to "neue/geänderte Bestellungen gefunden...",

        // Badge tooltip parts
        "badgeOrdered" to "bestellt",
        "badgeOrderable" to "bestellbar",
        "badgeTotal" to "gesamt",
        "badgeHighlights" to "Highlights gefunden",

        // History item states
        "stateCancelled" to "Storniert",
        "stateCompleted" to "Abgeschlossen",
        "stateTransferred" to "Übertragen",

        // Close button
        "close" to "Schließen",

        // Error modal
        "noConnection" to "Keine Verbindung",
        "toOriginalPage" to "Zur Original-Seite",

        // Misc
        "loggedIn" to "Angemeldet",
    )
}

object EnTranslations {
    val map: Map<String, String> = mapOf(
        // Navigation
        "thisWeek" to "This Week",
        "nextWeek" to "Next Week",
        "nextWeekTooltipDefault" to "Show next week's menu",
        "thisWeekTooltip" to "Show this week's menu",

        // Header
        "appTitle" to "Canteen Overview",
        "updatedAt" to "Updated",
        "langTooltip" to "Menu description language",
        "weekLabel" to "Week",

        // Action buttons
        "refresh" to "Reload menu data",
        "history" to "Order history",
        "highlights" to "Manage personal highlights",
        "themeTooltip" to "Toggle appearance (Light/Dark)",
        "login" to "Sign in",
        "loginTooltip" to "Sign in with Bessa.app account",
        "logout" to "Sign out",
        "logoutTooltip" to "Sign out from Bessa.app",

        // Login modal
        "loginTitle" to "Login",
        "employeeId" to "Employee ID",
        "employeeIdPlaceholder" to "e.g. 2041",
        "employeeIdHelp" to "Your official Knapp employee number.",
        "password" to "Password",
        "passwordPlaceholder" to "Bessa password",
        "passwordHelp" to "The password for your Bessa account.",
        "loginButton" to "Log in",
        "loggingIn" to "Logging in...",

        // Highlights modal
        "highlightsTitle" to "My Highlights",
        "highlightsDesc" to "Automatically highlight menus containing these keywords.",
        "tagInputPlaceholder" to "e.g. Schnitzel, Vegetarian...",
        "tagInputTooltip" to "Enter new keyword to highlight",
        "addTag" to "Add",
        "addTagTooltip" to "Add keyword to list",
        "removeTagTooltip" to "Remove keyword",

        // History modal
        "historyTitle" to "Order History",
        "loadingHistory" to "Loading history...",
        "noOrders" to "No orders found.",
        "orders" to "Orders",
        "historyMonthToggle" to "Click to expand/collapse orders for this month",

        // Menu item labels
        "available" to "Available",
        "soldOut" to "Sold out",
        "ordered" to "Ordered",
        "orderButton" to "Order",
        "orderAgainTooltip" to "order again",
        "orderTooltip" to "order",
        "cancelOrder" to "Cancel order",
        "cancelOneOrder" to "Cancel one order",
        "flagActivate" to "Notify when available",
        "flagDeactivate" to "Deactivate notification",

        // Alarm bell
        "alarmTooltipNone" to "No flagged menus",
        "alarmLastChecked" to "Last checked",

        // Version modal
        "versionsTitle" to "📦 Versions",
        "currentVersion" to "Current",
        "devModeLabel" to "Dev mode (show all tags)",
        "loadingVersions" to "Loading versions...",
        "noVersions" to "No versions found.",
        "installed" to "✓ Installed",
        "newVersion" to "⬆ New!",
        "installLink" to "Install",
        "reportBug" to "Report a bug",
        "reportBugTooltip" to "Report a bug on GitHub",
        "featureRequest" to "Request a feature",
        "featureRequestTooltip" to "Suggest a new feature on GitHub",
        "clearCache" to "Clear local cache",
        "clearCacheTooltip" to "Deletes all local data & forces a reload",
        "clearCacheConfirm" to "Do you really want to delete all local data (including login session, cache, and settings)? The page will reload afterwards.",
        "versionMenuTooltip" to "Click for version menu",

        // Progress modal
        "progressTitle" to "Updating menu data",
        "progressInit" to "Initializing...",

        // Empty state
        "noMenuData" to "No menu data for CW",
        "noMenuDataHint" to "Try another week or check back later.",

        // Countdown
        "orderDeadline" to "Order deadline",

        // Toast messages
        "flagRemoved" to "Flag removed for",
        "flagActivated" to "Notification activated for",
        "menuChecked" to "checked",
        "menuSingular" to "menu",
        "menuPlural" to "menus",
        "newMenuDataAvailable" to "New menu data available for next week!",
        "orderSuccess" to "Ordered",
        "cancelSuccess" to "Cancelled",
        "bgSyncFailed" to "Background synchronisation failed",
        "historyLoadError" to "Error loading history.",
        "historyLoadingFull" to "Loading order history...",
        "historyLoadingDelta" to "Checking for new orders...",
        "historyLoadingItem" to "Loading order",
        "historyLoadingOf" to "of",
        "historyLoadingNew" to "new/updated orders found...",

        // Badge tooltip parts
        "badgeOrdered" to "ordered",
        "badgeOrderable" to "orderable",
        "badgeTotal" to "total",
        "badgeHighlights" to "highlights found",

        // History item states
        "stateCancelled" to "Cancelled",
        "stateCompleted" to "Completed",
        "stateTransferred" to "Transferred",

        // Close button
        "close" to "Close",

        // Error modal
        "noConnection" to "No connection",
        "toOriginalPage" to "Go to original page",

        // Misc
        "loggedIn" to "Logged in",
    )
}
