/**
 * Internationalization (i18n) module for the Kantine Wrapper UI.
 * Provides translations for all static UI text based on the current language mode.
 * German (de) is the default; English (en) is fully supported.
 * When langMode is 'all', German labels are used for the GUI.
 */
import { langMode } from './state.js';

const TRANSLATIONS = {
    de: {
        // Navigation
        thisWeek: 'Diese Woche',
        nextWeek: 'Nächste Woche',
        nextWeekTooltipDefault: 'Menü nächster Woche anzeigen',
        thisWeekTooltip: 'Menü dieser Woche anzeigen',

        // Header
        appTitle: 'Kantinen Übersicht',
        updatedAt: 'Aktualisiert',
        langTooltip: 'Sprache der Menübeschreibung',
        weekLabel: 'Woche',

        // Action buttons
        refresh: 'Menüdaten neu laden',
        history: 'Bestellhistorie',
        highlights: 'Persönliche Highlights verwalten',
        themeTooltip: 'Erscheinungsbild (Hell/Dunkel) wechseln',
        login: 'Anmelden',
        loginTooltip: 'Mit Bessa.app Account anmelden',
        logout: 'Abmelden',
        logoutTooltip: 'Von Bessa.app abmelden',

        // Login modal
        loginTitle: 'Login',
        employeeId: 'Mitarbeiternummer',
        employeeIdPlaceholder: 'z.B. 2041',
        employeeIdHelp: 'Deine offizielle Knapp Mitarbeiternummer.',
        password: 'Passwort',
        passwordPlaceholder: 'Bessa Passwort',
        passwordHelp: 'Das Passwort für deinen Bessa Account.',
        loginButton: 'Einloggen',
        loggingIn: 'Wird eingeloggt...',

        // Highlights modal
        highlightsTitle: 'Meine Highlights',
        highlightsDesc: 'Markiere Menüs automatisch, wenn sie diese Schlagwörter enthalten.',
        tagInputPlaceholder: 'z.B. Schnitzel, Vegetarisch...',
        tagInputTooltip: 'Neues Schlagwort zum Hervorheben eingeben',
        addTag: 'Hinzufügen',
        addTagTooltip: 'Schlagwort zur Liste hinzufügen',
        removeTagTooltip: 'Schlagwort entfernen',

        // History modal
        historyTitle: 'Bestellhistorie',
        loadingHistory: 'Lade Historie...',
        noOrders: 'Keine Bestellungen gefunden.',
        orders: 'Bestellungen',
        historyMonthToggle: 'Klicken, um die Bestellungen für diesen Monat ein-/auszublenden',

        // Menu item labels
        available: 'Verfügbar',
        soldOut: 'Ausverkauft',
        ordered: 'Bestellt',
        orderButton: 'Bestellen',
        orderAgainTooltip: 'nochmal bestellen',
        orderTooltip: 'bestellen',
        cancelOrder: 'Bestellung stornieren',
        cancelOneOrder: 'Eine Bestellung stornieren',
        flagActivate: 'Benachrichtigen wenn verfügbar',
        flagDeactivate: 'Benachrichtigung deaktivieren',

        // Alarm bell
        alarmTooltipNone: 'Keine beobachteten Menüs',
        alarmLastChecked: 'Zuletzt geprüft',

        // Version modal
        versionsTitle: '📦 Versionen',
        currentVersion: 'Aktuell',
        devModeLabel: 'Dev-Mode (alle Tags anzeigen)',
        loadingVersions: 'Lade Versionen...',
        noVersions: 'Keine Versionen gefunden.',
        installed: '✓ Installiert',
        newVersion: '⬆ Neu!',
        installLink: 'Installieren',
        reportBug: 'Fehler melden',
        reportBugTooltip: 'Melde einen Fehler auf GitHub',
        featureRequest: 'Feature vorschlagen',
        featureRequestTooltip: 'Schlage ein neues Feature auf GitHub vor',
        clearCache: 'Lokalen Cache leeren',
        clearCacheTooltip: 'Löscht alle lokalen Daten & erzwingt einen Neuladen',
        clearCacheConfirm: 'Möchtest du wirklich alle lokalen Daten (inkl. Login-Session, Cache und Einstellungen) löschen? Die Seite wird danach neu geladen.',
        versionMenuTooltip: 'Klick für Versionsmenü',

        // Progress modal
        progressTitle: 'Menüdaten aktualisieren',
        progressInit: 'Initialisierung...',

        // Empty state
        noMenuData: 'Keine Menüdaten für KW',
        noMenuDataHint: 'Versuchen Sie eine andere Woche oder schauen Sie später vorbei.',

        // Weekly cost

        // Countdown
        orderDeadline: 'Bestellschluss',

        // Toast messages
        flagRemoved: 'Flag entfernt für',
        flagActivated: 'Benachrichtigung aktiviert für',
        menuChecked: 'geprüft',
        menuSingular: 'Menü',
        menuPlural: 'Menüs',
        newMenuDataAvailable: 'Neue Menüdaten für nächste Woche verfügbar!',
        orderSuccess: 'Bestellt',
        cancelSuccess: 'Storniert',
        bgSyncFailed: 'Hintergrund-Synchronisation fehlgeschlagen',
        historyLoadError: 'Fehler beim Laden der Historie.',
        historyLoadingFull: 'Lade Bestellhistorie...',
        historyLoadingDelta: 'Suche nach neuen Bestellungen...',
        historyLoadingItem: 'Lade Bestellung',
        historyLoadingOf: 'von',
        historyLoadingNew: 'neue/geänderte Bestellungen gefunden...',

        // Badge tooltip parts
        badgeOrdered: 'bestellt',
        badgeOrderable: 'bestellbar',
        badgeTotal: 'gesamt',
        badgeHighlights: 'Highlights gefunden',

        // History item states
        stateCancelled: 'Storniert',
        stateCompleted: 'Abgeschlossen',
        stateTransferred: 'Übertragen',

        // Close button
        close: 'Schließen',

        // Error modal
        noConnection: 'Keine Verbindung',
        toOriginalPage: 'Zur Original-Seite',

        // Misc
        loggedIn: 'Angemeldet',
    },
    en: {
        // Navigation
        thisWeek: 'This Week',
        nextWeek: 'Next Week',
        nextWeekTooltipDefault: 'Show next week\'s menu',
        thisWeekTooltip: 'Show this week\'s menu',

        // Header
        appTitle: 'Canteen Overview',
        updatedAt: 'Updated',
        langTooltip: 'Menu description language',
        weekLabel: 'Week',

        // Action buttons
        refresh: 'Reload menu data',
        history: 'Order history',
        highlights: 'Manage personal highlights',
        themeTooltip: 'Toggle appearance (Light/Dark)',
        login: 'Sign in',
        loginTooltip: 'Sign in with Bessa.app account',
        logout: 'Sign out',
        logoutTooltip: 'Sign out from Bessa.app',

        // Login modal
        loginTitle: 'Login',
        employeeId: 'Employee ID',
        employeeIdPlaceholder: 'e.g. 2041',
        employeeIdHelp: 'Your official Knapp employee number.',
        password: 'Password',
        passwordPlaceholder: 'Bessa password',
        passwordHelp: 'The password for your Bessa account.',
        loginButton: 'Log in',
        loggingIn: 'Logging in...',

        // Highlights modal
        highlightsTitle: 'My Highlights',
        highlightsDesc: 'Automatically highlight menus containing these keywords.',
        tagInputPlaceholder: 'e.g. Schnitzel, Vegetarian...',
        tagInputTooltip: 'Enter new keyword to highlight',
        addTag: 'Add',
        addTagTooltip: 'Add keyword to list',
        removeTagTooltip: 'Remove keyword',

        // History modal
        historyTitle: 'Order History',
        loadingHistory: 'Loading history...',
        noOrders: 'No orders found.',
        orders: 'Orders',
        historyMonthToggle: 'Click to expand/collapse orders for this month',

        // Menu item labels
        available: 'Available',
        soldOut: 'Sold out',
        ordered: 'Ordered',
        orderButton: 'Order',
        orderAgainTooltip: 'order again',
        orderTooltip: 'order',
        cancelOrder: 'Cancel order',
        cancelOneOrder: 'Cancel one order',
        flagActivate: 'Notify when available',
        flagDeactivate: 'Deactivate notification',

        // Alarm bell
        alarmTooltipNone: 'No flagged menus',
        alarmLastChecked: 'Last checked',

        // Version modal
        versionsTitle: '📦 Versions',
        currentVersion: 'Current',
        devModeLabel: 'Dev mode (show all tags)',
        loadingVersions: 'Loading versions...',
        noVersions: 'No versions found.',
        installed: '✓ Installed',
        newVersion: '⬆ New!',
        installLink: 'Install',
        reportBug: 'Report a bug',
        reportBugTooltip: 'Report a bug on GitHub',
        featureRequest: 'Request a feature',
        featureRequestTooltip: 'Suggest a new feature on GitHub',
        clearCache: 'Clear local cache',
        clearCacheTooltip: 'Deletes all local data & forces a reload',
        clearCacheConfirm: 'Do you really want to delete all local data (including login session, cache, and settings)? The page will reload afterwards.',
        versionMenuTooltip: 'Click for version menu',

        // Progress modal
        progressTitle: 'Updating menu data',
        progressInit: 'Initializing...',

        // Empty state
        noMenuData: 'No menu data for CW',
        noMenuDataHint: 'Try another week or check back later.',

        // Weekly cost

        // Countdown
        orderDeadline: 'Order deadline',

        // Toast messages
        flagRemoved: 'Flag removed for',
        flagActivated: 'Notification activated for',
        menuChecked: 'checked',
        menuSingular: 'menu',
        menuPlural: 'menus',
        newMenuDataAvailable: 'New menu data available for next week!',
        orderSuccess: 'Ordered',
        cancelSuccess: 'Cancelled',
        bgSyncFailed: 'Background synchronisation failed',
        historyLoadError: 'Error loading history.',
        historyLoadingFull: 'Loading order history...',
        historyLoadingDelta: 'Checking for new orders...',
        historyLoadingItem: 'Loading order',
        historyLoadingOf: 'of',
        historyLoadingNew: 'new/updated orders found...',

        // Badge tooltip parts
        badgeOrdered: 'ordered',
        badgeOrderable: 'orderable',
        badgeTotal: 'total',
        badgeHighlights: 'highlights found',

        // History item states
        stateCancelled: 'Cancelled',
        stateCompleted: 'Completed',
        stateTransferred: 'Transferred',

        // Close button
        close: 'Close',

        // Error modal
        noConnection: 'No connection',
        toOriginalPage: 'Go to original page',

        // Misc
        loggedIn: 'Logged in',
    }
};

/**
 * Returns the translated string for the given key.
 * Uses the current langMode (en = English, anything else = German).
 * Falls back to German if a key is missing in the target language.
 * @param {string} key - Translation key
 * @returns {string} Translated text
 */
export function t(key) {
    const lang = langMode === 'en' ? 'en' : 'de';
    return TRANSLATIONS[lang][key] || TRANSLATIONS['de'][key] || key;
}

/**
 * Returns the effective UI language code ('en' or 'de').
 * 'all' mode uses German for the GUI.
 */
export function getUILang() {
    return langMode === 'en' ? 'en' : 'de';
}
