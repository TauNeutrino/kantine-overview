import { langMode } from './state.js';

export function injectUI() {
    document.title = 'Kantine Weekly Menu';

    if (document.querySelectorAll) {
        document.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove());
    }
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/png';
    favicon.href = '{{FAVICON_DATA_URI}}';
    document.head.appendChild(favicon);

    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) {
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(fontLink);
    }
    if (!document.querySelector('link[href*="Material+Icons+Round"]')) {
        const iconLink = document.createElement('link');
        iconLink.rel = 'stylesheet';
        iconLink.href = 'https://fonts.googleapis.com/icon?family=Material+Icons+Round';
        document.head.appendChild(iconLink);
    }

    const htmlContent = `
    <div id="kantine-wrapper">
        <header class="app-header">
            <div class="header-content">
                <div class="brand">
                    <img src="{{FAVICON_DATA_URI}}" alt="Logo" class="logo-img" style="height: 2em; width: 2em; object-fit: contain;">
                    <div class="header-left">
                        <h1>Kantinen Übersicht <small class="version-tag" style="font-size: 0.6em; opacity: 0.7; font-weight: 400; cursor: pointer;" title="Klick für Versionsmenü">{{VERSION}}</small></h1>
                        <div id="last-updated-subtitle" class="subtitle"></div>
                    </div>
                    <div class="nav-group" style="margin-left: 1rem;">
                        <button id="btn-this-week" class="nav-btn active" title="Menü dieser Woche anzeigen">Diese Woche</button>
                        <button id="btn-next-week" class="nav-btn" title="Menü nächster Woche anzeigen">Nächste Woche</button>
                    </div>
                    <button id="alarm-bell" class="icon-btn hidden" aria-label="Benachrichtigungen" title="Keine beobachteten Menüs" style="margin-left: -0.5rem;">
                        <span class="material-icons-round" id="alarm-bell-icon" style="color:var(--text-secondary); transition: color 0.3s;">notifications</span>
                    </button>
                </div>
                <div class="header-center-wrapper">
                    <div id="lang-toggle" class="lang-toggle" title="Sprache der Menübeschreibung">
                        <button class="lang-btn${langMode === 'de' ? ' active' : ''}" data-lang="de">DE</button>
                        <button class="lang-btn${langMode === 'en' ? ' active' : ''}" data-lang="en">EN</button>
                        <button class="lang-btn${langMode === 'all' ? ' active' : ''}" data-lang="all">ALL</button>
                    </div>
                    <div id="header-week-info" class="header-week-info"></div>
                    <div id="weekly-cost-display" class="weekly-cost hidden"></div>
                </div>
                <div class="controls">
                    <button id="btn-refresh" class="icon-btn" aria-label="Menüdaten aktualisieren" title="Menüdaten neu laden">
                        <span class="material-icons-round">refresh</span>
                    </button>
                    <button id="btn-history" class="icon-btn" aria-label="Bestellhistorie" title="Bestellhistorie">
                        <span class="material-icons-round">receipt_long</span>
                    </button>
                    <button id="btn-highlights" class="icon-btn" aria-label="Persönliche Highlights verwalten" title="Persönliche Highlights verwalten">
                        <span class="material-icons-round">label</span>
                    </button>
                    <button id="theme-toggle" class="icon-btn" aria-label="Toggle Theme" title="Erscheinungsbild (Hell/Dunkel) wechseln">
                        <span class="material-icons-round theme-icon">light_mode</span>
                    </button>
                    <button id="btn-login-open" class="user-badge-btn icon-btn-small" title="Mit Bessa.app Account anmelden">
                        <span class="material-icons-round">login</span>
                        <span>Anmelden</span>
                    </button>
                    <div id="user-info" class="user-badge hidden">
                        <span class="material-icons-round">person</span>
                        <span id="user-id-display"></span>
                        <button id="btn-logout" class="icon-btn-small" aria-label="Logout" title="Von Bessa.app abmelden">
                            <span class="material-icons-round">logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <div id="login-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Login</h2>
                    <button id="btn-login-close" class="icon-btn" aria-label="Close" title="Schließen">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <form id="login-form">
                    <div class="form-group">
                        <label for="employee-id">Mitarbeiternummer</label>
                        <input type="text" id="employee-id" name="employee-id" placeholder="z.B. 2041" required>
                        <small class="help-text">Deine offizielle Knapp Mitarbeiternummer.</small>
                    </div>
                    <div class="form-group">
                        <label for="password">Passwort</label>
                        <input type="password" id="password" name="password" placeholder="Bessa Passwort" required>
                        <small class="help-text">Das Passwort für deinen Bessa Account.</small>
                    </div>
                    <div id="login-error" class="error-msg hidden"></div>
                    <div class="modal-actions">
                        <button type="submit" class="btn-primary wide">Einloggen</button>
                    </div>
                </form>
            </div>
        </div>

        <div id="progress-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Menüdaten aktualisieren</h2>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div id="progress-fill" class="progress-fill"></div>
                        </div>
                        <div id="progress-percent" class="progress-percent">0%</div>
                    </div>
                    <p id="progress-message" class="progress-message">Initialisierung...</p>
                </div>
            </div>
        </div>

        <div id="highlights-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Meine Highlights</h2>
                    <button id="btn-highlights-close" class="icon-btn" aria-label="Close" title="Schließen">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 1rem; color: var(--text-secondary);">
                        Markiere Menüs automatisch, wenn sie diese Schlagwörter enthalten.
                    </p>
                    <div class="input-group">
                        <input type="text" id="tag-input" placeholder="z.B. Schnitzel, Vegetarisch..." title="Neues Schlagwort zum Hervorheben eingeben">
                        <button id="btn-add-tag" class="btn-primary" title="Schlagwort zur Liste hinzufügen">Hinzufügen</button>
                    </div>
                    <div id="tags-list"></div>
                </div>
            </div>
        </div>

        <div id="history-modal" class="modal hidden">
            <div class="modal-content history-modal-content">
                <div class="modal-header">
                    <h2>Bestellhistorie</h2>
                    <button id="btn-history-close" class="icon-btn" aria-label="Close" title="Schließen">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div id="history-loading" class="hidden">
                        <p id="history-progress-text" style="text-align: center; margin-bottom: 1rem; color: var(--text-secondary);">Lade Historie...</p>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div id="history-progress-fill" class="progress-fill"></div>
                            </div>
                        </div>
                    </div>
                    <div id="history-content">
                    </div>
                </div>
            </div>
        </div>

        <div id="version-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📦 Versionen</h2>
                    <button id="btn-version-close" class="icon-btn" aria-label="Close" title="Schließen">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 1rem;">
                        <strong>Aktuell:</strong> <span id="version-current">{{VERSION}}</span>
                    </div>
                    <div class="dev-toggle">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                            <input type="checkbox" id="dev-mode-toggle">
                            <span>Dev-Mode (alle Tags anzeigen)</span>
                        </label>
                    </div>
                    <div id="version-list-container" style="margin-top:1rem; max-height: 250px; overflow-y: auto;">
                        <p style="color:var(--text-secondary);">Lade Versionen...</p>
                    </div>
                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9em;">
                        <a href="https://github.com/TauNeutrino/kantine-overview/issues" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: none; display: flex; align-items: center; gap: 0.5rem;" title="Melde einen Fehler auf GitHub">
                            <span class="material-icons-round" style="font-size: 1.2em;">bug_report</span> Fehler melden
                        </a>
                        <a href="https://github.com/TauNeutrino/kantine-overview/discussions/categories/ideas" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: none; display: flex; align-items: center; gap: 0.5rem;" title="Schlage ein neues Feature auf GitHub vor">
                            <span class="material-icons-round" style="font-size: 1.2em;">lightbulb</span> Feature vorschlagen
                        </a>
                        <button id="btn-clear-cache" style="background: none; border: none; padding: 0; color: var(--error-color); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; text-align: left; font-size: inherit; font-family: inherit;" title="Löscht alle lokalen Daten & erzwingt einen Neuladen">
                            <span class="material-icons-round" style="font-size: 1.2em;">delete_forever</span> Lokalen Cache leeren
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <main class="container">
            <div id="last-updated-banner" class="banner hidden">
                <span class="material-icons-round">update</span>
                <span id="last-updated-text">Gerade aktualisiert</span>
            </div>
            <div id="loading" class="loading-state">
                <div class="spinner"></div>
                <p>Lade Menüdaten...</p>
            </div>
            <div id="menu-container" class="menu-grid"></div>
        </main>

        <footer class="app-footer">
            <p>Jetzt Bessa Einfach! &bull; Knapp-Kantine Wrapper &bull; <span id="current-year">${new Date().getFullYear()}</span> by Kaufi 😃👍 mit Hilfe von KI 🤖</p>
        </footer>
    </div>`;
    document.body.innerHTML = htmlContent;
}
