# AAB Upload, Testing Tracks, Review & Release

**Stand: Juni 2026**

Diese Anleitung beschreibt Schritt fuer Schritt, wie du das signierte Android App Bundle (AAB) in die Google Play Console hochlaedst, durch die verschiedenen Testing Tracks gehst und schliesslich in die Produktion veroeffentlichst. Jeder Schritt enthaelt UI-Beschreibungen, sodass du weisst, was du auf dem Bildschirm siehst.

> **Wichtig:** Diese Anleitung beschreibt den **manuellen Upload** via Play Console. Das ist der Weg fuer das MVP. Automatisierte Deployments mit Fastlane sind als optionale Erweiterung fuer spaetere Versionen dokumentiert.

---

## Inhalt

1. [Voraussetzungen](#voraussetzungen)
2. [Schritt 1: AAB Build erstellen](#schritt-1-aab-build-erstellen)
3. [Schritt 2: Internal Testing Track](#schritt-2-internal-testing-track)
4. [Schritt 3: Closed Testing Track](#schritt-3-closed-testing-track)
5. [Schritt 4: Open Testing Track (Soft-Launch)](#schritt-4-open-testing-track-soft-launch)
6. [Schritt 5: Production Release](#schritt-5-production-release)
7. [Review-Prozess](#review-prozess)
8. [Fastlane `supply` Setup (optional)](#fastlane-supply-setup-optional)
9. [Nuetzliche Links](#nuetzliche-links)

---

## Voraussetzungen

Bevor du beginnst, stelle sicher, dass:

- Der [Google Play Developer Account eingerichtet ist](docs/play-store-setup.md) und die App in der Play Console existiert.
- Das [Android Signing konfiguriert ist](docs/android-signing.md) (`android/keystore/release.jks` ist vorhanden und `keystore.properties` ist korrekt).
- Die Store-Listing-Daten (Beschreibung, Screenshots, Icon) in `fastlane/metadata/android/` bereitliegen.
- Screenshots mit Fastlane Screengrab auf dem Emulator generiert wurden (siehe [play-store-setup.md](docs/play-store-setup.md)).

---

## Schritt 1: AAB Build erstellen

**Warum das noetig ist:** Google Play akzeptiert seit August 2021 nur noch das Android App Bundle (AAB)-Format. Das AAB enthaelt alle Ressourcen fuer verschiedene Geraetekonfigurationen. Google generiert daraus optimierte APKs fuer jeden Nutzer.

### Ablauf

1. **Oeffne ein Terminal im Projekt-Root.**

2. **Fuehre den Build-Befehl aus:**

   ```bash
   cd android && ./gradlew bundleRelease
   ```

3. **Warte auf den Build.**
   - Gradle kompiliert den Code, optimiert Ressourcen und packt das Bundle.
   - Das dauert je nach Rechner 1-5 Minuten.

4. **Finde die AAB-Datei.**
   - Die Datei liegt unter:
     ```
     android/app/build/outputs/bundle/release/app-release.aab
     ```
   - Die Dateigroesse sollte typischerweise zwischen 10 und 30 MB liegen.

### Was du im Terminal siehst

```
> Task :app:bundleRelease
BUILD SUCCESSFUL in 2m 15s
```

Wenn du `BUILD FAILED` siehst, pruefe:
- Ist `release.jks` vorhanden?
- Sind die Passwoerter in `keystore.properties` korrekt?
- Ist `minSdk` und `targetSdk` in `build.gradle.kts` richtig gesetzt?

---

## Schritt 2: Internal Testing Track

**Warum das noetig ist:** Der Internal Testing Track ist der schnellste Weg, die App auf einem echten Geraet zu testen. Die App ist nicht oeffentlich sichtbar. Nur du (oder eingeladene Tester) koennen sie installieren. Das ist der erste Test nach jedem Build.

### Ablauf

1. **Oeffne die Play Console.**
   - Gehe zu [https://play.google.com/console](https://play.google.com/console).
   - Waehle die App "Kantine" aus.

2. **Navigiere zu "Testing" > "Internal Testing".**
   - Im linken Navigationsmenue klicke auf "Testing".
   - Klicke auf "Internal Testing".
   - Du siehst eine Liste der bisherigen internen Releases (falls vorhanden).

3. **Klicke auf "Neue Version erstellen" oder "Create new release".**
   - Ein Formular oeffnet sich mit dem Titel "Neue interne Testversion".

4. **Lade die AAB-Datei hoch.**
   - Klicke auf den Bereich "App bundles hinzufuegen" oder ziehe die Datei per Drag & Drop.
   - Waehle `app-release.aab` aus dem Pfad `android/app/build/outputs/bundle/release/`.
   - Du siehst einen Fortschrittsbalken. Nach dem Upload zeigt die Console:
     - Paketname: `at.kaufi.kantine`
     - Version: `1.0.0` (versionName)
     - Version Code: `1`
     - Groesse: z.B. `15,2 MB`

5. **Fuege Release-Notes hinzu.**
   - Im Feld "Was ist neu in dieser Version?" gib ein:
     ```
     Erste interne Testversion. Grundlegende Funktionalitaet implementiert.
     ```
   - Waehle als Sprache "Deutsch (de-DE)".

6. **Klicke auf "Zum internen Test starten" (oder "Start rollout to Internal testing").**
   - Die Console zeigt einen Bestaetigungsdialog:
     > "Moechtest du diese Version wirklich zum internen Test starten?"
   - Klicke auf "Starten".

7. **Warte auf die Verarbeitung.**
   - Die Console zeigt den Status "Verarbeitung" oder "Processing".
   - Das dauert ca. 15-30 Minuten.
   - Danach aendert sich der Status zu "Aktiv" (Active).

8. **Lade dich selbst als Tester ein.**
   - Klicke auf den Tab "Tester".
   - Gib deine eigene E-Mail-Adresse ein (die mit dem Google-Konto verknuepft ist).
   - Klicke auf "Tester hinzufuegen" und dann "Einladung senden".
   - Du erhaelst eine E-Mail mit dem Betreff:
     > "Du wurdest eingeladen, Kantine als Tester auszuprobieren"
   - Klicke in der E-Mail auf den Link "Tester werden".

9. **Installiere die App auf deinem Geraet.**
   - Oeffne den Play Store auf deinem Android-Geraet.
   - Suche nach "Kantine" oder oeffne den direkten Link aus der Einladungs-E-Mail.
   - Du siehst die App mit einem Badge "Internal" oder "Intern".
   - Klicke auf "Installieren".
   - Teste die App gruendlich (Navigation, Bestellung, Flagging, etc.).

### Was du auf dem Geraet siehst

- Die App erscheint im Play Store mit einem kleinen Badge "Intern" oder "Internal".
- Die Installation verlaeuft wie bei jeder anderen App aus dem Play Store.
- Updates fuer interne Versionen erscheinen automatisch im Play Store

> **Hinweis:** Der Internal Testing Track erlaubt bis zu 100 Tester. Fuer das MVP reicht es, wenn nur du selbst testest.

---

## Schritt 3: Closed Testing Track

**Warum das noetig ist:** Der Closed Testing Track ist fuer eine groessere Gruppe von Beta-Testern gedacht. Das ist der richtige Ort, um Feedback von Freunden oder einer kleinen Community zu sammeln, bevor die App oeffentlich wird.

> **Wichtig:** Google verlangt fuer den Production-Release mindestens **20 Tester** im Closed Track, die die App **ueber 14 Tage** aktiv testen. Plane das bei der Tester-Akquise ein.

### Ablauf

1. **Navigiere zu "Testing" > "Closed Testing".**
   - Im linken Menue unter "Testing" waehle "Closed Testing".

2. **Erstelle eine Testgruppe (falls noch nicht vorhanden).**
   - Klicke auf "Testgruppe erstellen".
   - Gib einen Namen ein, z.B. "Kantine Beta".
   - Waehle "E-Mail-Liste" als Einladungsmethode.
   - Klicke auf "Speichern".

3. **Fuege Tester hinzu.**
   - Klicke auf die erstellte Gruppe.
   - Gib die E-Mail-Adressen der Beta-Tester ein (bis zu 10.000).
   - Jeder Tester braucht ein Google-Konto.
   - Klicke auf "Tester hinzufuegen".

4. **Erstelle einen neuen Release.**
   - Klicke auf "Neue Version erstellen".
   - Lade die AAB-Datei hoch (wie im Internal Track).
   - Fuege Release-Notes hinzu, z.B.:
     ```
     Beta-Version mit verbesserter Performance und Bugfixes.
     ```

5. **Starte den geschlossenen Test.**
   - Klicke auf "Zum geschlossenen Test starten".
   - Bestaetige im Dialog.

6. **Lade die Tester ein.**
   - Nach der Verarbeitung (15-30 Minuten) klicke auf "Tester einladen".
   - Die Tester erhalten eine E-Mail mit einem Opt-in-Link.
   - Sie muessen den Link klicken und die App im Play Store installieren.

7. **Sammle Feedback.**
   - Frage die Tester nach ihrer Meinung.
   - Achte auf Crashes, UI-Probleme und Verstaendnisfragen.
   - Notiere alles in einem Dokument oder Issue-Tracker.

### Was die Tester sehen

- Die Tester erhalten eine E-Mail mit dem Betreff:
  > "Du wurdest eingeladen, Kantine als Beta-Tester auszuprobieren"
- Nach dem Opt-in finden sie die App im Play Store mit dem Badge "Beta" oder "Closed Beta".
- Sie koennen die App normal installieren und nutzen.
- Feedback koennen sie direkt an dich senden (per E-Mail, Chat oder einem Formular).

---

## Schritt 4: Open Testing Track (Soft-Launch)

**Warum das noetig ist:** Der Open Testing Track erlaubt es, die App oeffentlich, aber ohne volle Produktions-Sichtbarkeit zu testen. Nutzer finden die App im Play Store, aber sie erscheient nicht in den Top-Listen. Das ist nuetzlich fuer einen Soft-Launch, um die Server-Last zu testen und letztes Feedback zu sammeln.

### Ablauf

1. **Navigiere zu "Testing" > "Open Testing".**
   - Im linken Menue unter "Testing" waehle "Open Testing".

2. **Erstelle einen neuen Release.**
   - Klicke auf "Neue Version erstellen".
   - Lade die AAB-Datei hoch.
   - Fuege Release-Notes hinzu, z.B.:
     ```
     Oeffentliche Beta-Version. Soft-Launch fuer Feedback und Performance-Tests.
     ```

3. **Starte den offenen Test.**
   - Klicke auf "Zum offenen Test starten".
   - Bestaetige im Dialog.

4. **Die App ist jetzt oeffentlich sichtbar.**
   - Nutzer koennen die App im Play Store finden, wenn sie nach "Kantine" suchen.
   - Die App ，zeigt das Badge "Open Beta" oder "Offene Beta".
   - Die Anzahl der Tester ist technisch unbegrenzt, aber die Sichtbarkeit ist geringer als in der Produktion.

### Was Nutzer sehen

- Die App erscheint in Play Store-Suchergebnissen.
- Auf der App-Seite steht ein Leone "Beta" oder "Open Beta".
- Nutzer koennen die App installieren und Feedback direkt im Play Store hinterlassen (Rezensionen).

---

## Schritt 5: Production Release

**Warum das noetig ist:** Der Production Release ist der finale Schritt. Nachdem die App durch den Review-Prozess von Google gegangen ist, wird sie fuer alle Play Store Nutzer sichtbar und installierbar.

### Ablauf

1. **Navigiere zu "Produktion" > "Neue Version erstellen".**
   - Im linken Menue klicke auf "Produktion".
   - Klicke auf "Neue Version erstellen".

2. **Lade die AAB-Datei hoch.**
   - Waehle die finale, signierte `app-release.aab`.
   - Pruefe, dass Version Code und Version Name korrekt sind:
     - `versionCode`: 1
     - `versionName`: "1.0.0"

3. **Fuege Release-Notes hinzu.**
   - Beispiel:
     ```
     Erste oeffentliche Version der Kantine-App.
     - Wochenansicht der Speiseplaene
     - Bestellfunktion
     - Flagging-System fuer ausverkaufte Menues
     ```

4. **Klicke auf "Zur Pruefung senden" (oder "Send to review").**
   - Die Console zeigt einen Bestaetigungsdialog:
     > "Moechtest du diese Version zur Pruefung senden?"
   - Klicke auf "Senden".

5. **Warte auf den Review.**
   - Der Status aendert sich zu "In Pruefung" (In review).
   - Die Pruefung dauert typischerweise **1-7 Tage**.
   - Du erhaelst eine E-Mail, sobald der Review abgeschlossen ist.

6. **Nach Approval: Release zur Produktion.**
   - Wenn die App genehmigt wurde, aendert sich der Status zu "Genehmigt" (Approved).
   - Klicke auf "Zur Produktion freigeben" (oder "Release to production").
   - Die App ist jetzt live fuer alle Nutzer im Play Store.

### Was du in der Console siehst

- **In Pruefung:** Ein gelber Status-Indikator zeigt "In review".
- **Genehmigt:** Ein gruener Status-Indikator zeigt "Approved".
- **Abgelehnt:** Ein roter Status-Indikator zeigt "Rejected" mit einer Begruendung.

---

## Review-Prozess

### Was Google prueft

Google prueft jede App, die zur Produktion freigegeben wird. Das ist ein automatischer und manueller Prozess.

**Typische Pruefpunkte:**

- **Datenschutz-Infos:** Hast du eine Datenschutzerklaerung angegeben? Ist sie vollstaendig?
- **Content Rating:** Hast du den Fragebogen zum Content Rating ausgefuellt?
- **App-Titel und Beschreibung:** Sind sie korrekt und nicht irrefuehrend?
- **Berechtigungen:** Fordert die App nur noetige Berechtigungen an?
- **Malware und Sicherheit:** Enthaelt die App schaedlichen Code?
- **Store-Listing-Qualitaet:** Sind Screenshots, Icon und Beschreibung vorhanden und passend?

### Nach dem Upload: "Send to Review"

- Nachdem du auf "Zur Pruefung senden" geklickt hast, beginnt der Review.
- Die Console zeigt den Status "In Pruefung".
- Du kannst den Status jederzeit in der Play Console unter "Produktion" einsehen.

### Bei Ablehnung

- Du erhaelst eine E-Mail mit dem Betreff:
  > "Deine App wurde abgelehnt" oder "Issue found: [Grund]"
- Die E-Mail enthaelt eine detaillierte Begruendung.

**Haeufige Ablehnungsgruende:**

| Grund | Loesung |
|---|---|
| **Datenschutzerklaerung fehlt** | Fuege eine Datenschutzerklaerung im Store-Listing hinzu. |
| **Content Rating nicht ausgefuellt** | Beantworte den Content-Rating-Fragebogen in der Console. |
| **App-Titel ist irrefuehrend** | Aendere den Titel, sodass er genau beschreibt, was die App tut. |
| **Berechtigungen nicht erklaert** | Erklaere in der Beschreibung, warum z.B. Internet-Berechtigung noetig ist. |
| **Screenshots passen nicht** | Stelle sicher, dass Screenshots die aktuelle UI zeigen. |

- Behebe das Problem, erstelle einen neuen Build (erhoehe `versionCode`) und sende die App erneut zur Pruefung.

### Nach Approval

- Du erhaelst eine E-Mail:
  > "Deine App wurde genehmigt und ist bereit fuer die Produktion."
- Gehe zur Play Console, klicke auf "Zur Produktion freigeben".
- Die App ist jetzt live. Die Verbreitung im Play Store kann einige Stunden dauern.

---

## Fastlane `supply` Setup (optional)

**Wichtig:** Dieser Abschnitt ist **optional** und nur fuer zukuenftige Versionen gedacht. Das MVP verwendet den manuellen Upload via Play Console.

**Was Fastlane supply macht:** Fastlane ist ein Tool, das den Upload von AABs, Store-Listing-Daten und Screenshots automatisiert. Das spart Zeit bei regelmaessigen Releases.

### Voraussetzungen

- Fastlane ist installiert (`gem install fastlane` oder via Bundler).
- Ein Google Cloud Service Account mit API-Zugriff auf die Play Console.

### Konfiguration

1. **Erstelle die Fastlane-Konfigurationsdateien.**

   **`fastlane/Appfile`:**
   ```ruby
   json_key_file("fastlane/play-store-api-key.json") # Pfad zum API-Key
   package_name("at.kaufi.kantine")
   ```

   **`fastlane/Deliverfile`:**
   ```ruby
   default_language("de-DE")
   skip_screenshots(false)
   skip_metadata(false)
   ```

2. **Erstelle einen API-Key in der Google Play Console.**
   - Gehe zu "Einstellungen" > "API-Zugriff".
   - Klicke auf "Neues Dienstkonto erstellen".
   - Folge den Anweisungen, um ein Google Cloud Projekt zu erstellen.
   - Lade den JSON-Key herunter.
   - **Wichtig:** Speichere den Key sicher und fuege ihn NICHT in Git ein. Verwende ihn als GitHub Secret oder in einer sicheren Umgebungsvariable.

3. **Erstelle die Fastlane Lane.**

   **`fastlane/Fastfile`:**
   ```ruby
   default_platform(:android)

   platform :android do
     desc "Deploy a new version to the Google Play"
     lane :deploy do
       gradle(task: "bundleRelease")
       upload_to_play_store(
         track: 'production',
         aab: 'android/app/build/outputs/bundle/release/app-release.aab'
       )
     end
   end
   ```

4. **Fuehre die Lane aus:**
   ```bash
   fastlane deploy
   ```

### GitHub Secret

- Wenn du Fastlane in GitHub Actions verwenden moechtest, speichere den JSON-API-Key als GitHub Secret (z.B. `PLAY_STORE_API_KEY`).
- Referenziere das Secret in deiner Workflow-Datei.

> **Hinweis:** Automatisches Deployment ist fuer das MVP nicht vorgesehen. Diese Konfiguration ist eine Grundlage fuer spaetere Automatisierung.

---

## Nuetzliche Links

| Ressource | URL |
|---|---|
| Play Console | [https://play.google.com/console](https://play.google.com/console) |
| Play Console Hilfe | [https://support.google.com/googleplay/android-developer](https://support.google.com/googleplay/android-developer) |
| Android App Bundle | [https://developer.android.com/guide/app-bundle](https://developer.android.com/guide/app-bundle) |
| Fastlane Supply | [https://docs.fastlane.tools/actions/supply/](https://docs.fastlane.tools/actions/supply/) |
| Google Play Review-Prozess | [https://support.google.com/googleplay/android-developer/answer/9859750](https://support.google.com/googleplay/android-developer/answer/9859750) |

---

*Diese Anleitung wurde fuer das Kantine-Projekt erstellt. Bei Aenderungen bei Google Play pruefe die offizielle Dokumentation unter [support.google.com/googleplay/android-developer](https://support.google.com/googleplay/android-developer).*
