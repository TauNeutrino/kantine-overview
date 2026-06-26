# Google Play Developer Account & Play Console Setup Guide

**Stand: Juni 2026**

Diese Anleitung beschreibt Schritt fuer Schritt, wie du ein Google Play Developer Account erstellst, die Play Console konfigurierst und die Kantine-App fuer den Release vorbereitest. Jeder Schritt erklaert nicht nur das "Was", sondern auch das "Warum".

> **Wichtig:** Die Account-Erstellung ist ein manueller Prozess. Du musst persoenliche Daten und eine Zahlungsmethode angeben. Es gibt keine automatische Einrichtung.

---

## Inhalt

1. [Schritt 1: Developer Account erstellen](#schritt-1-developer-account-erstellen)
2. [Schritt 2: Identitaetsverifizierung](#schritt-2-identitaetsverifizierung)
3. [Schritt 3: App in Play Console erstellen](#schritt-3-app-in-play-console-erstellen)
4. [Schritt 4: Internal Testing Track](#schritt-4-internal-testing-track)
5. [Schritt 5: Closed Testing Track](#schritt-5-closed-testing-track)
6. [Schritt 6: Open Testing Track (optional)](#schritt-6-open-testing-track-optional)
7. [Kritische Warnungen](#kritische-warnungen)
8. [Nuetzliche Links](#nuetzliche-links)

---

## Schritt 1: Developer Account erstellen

**Warum das noetig ist:** Ohne einen Developer Account kannst du keine Apps auf Google Play veroeffentlichen. Der Account ist dein Zugang zur Play Console, wo du Apps verwaltest, Releases hochlaedst und Nutzerrezensionen siehst.

**URL:** [https://play.google.com/console](https://play.google.com/console)

### Ablauf

1. **Google-Konto waehlen oder erstellen**
   - Melde dich mit einem bestehenden Google-Konto an, oder erstelle ein neues.
   - Empfehlung: Verwende ein dediziertes Konto (z.B. `kantine.dev@gmail.com`), nicht dein privates Gmail. Das vereinfacht spaetere Team-Zugaenge.

2. **Developer Distribution Agreement akzeptieren**
   - Du siehst eine lange Seite mit den Nutzungsbedingungen.
   - Lies sie kurz durch, setze das Haekchen und klicke auf "Weiter".

3. **Registrierungsgebuehr bezahlen**
   - Die einmalige Gebuehr betraegt **25 USD**.
   - Zahlung per Kreditkarte oder Google Pay.
   - **Wichtig:** Diese Gebuehr ist **nicht rueckerstattungsfaehig**, auch wenn die Verifizierung scheitert.

4. **Account-Typ waehlen**
   - **Personal:** Fuer Einzelentwickler. Einfacher, aber spaetere Verifizierungspflichten (siehe Schritt 2).
   - **Organization:** Fuer Unternehmen. Benoetigt D-U-N-S-Nummer und mehr Dokumentation.
   - Fuer Kantine waehle **Personal**, da es sich um eine Einzelentwicklung handelt.

5. **Kontaktinformationen eingeben**
   - Vollstaendiger Name (wie im Personalausweis)
   - Adresse
   - Telefonnummer
   - E-Mail-Adresse

### Was du nach der Anmeldung siehst

Nach der Zahlung landest du auf einem Bildschirm mit der Meldung:

> "Vielen Dank fuer deine Registrierung. Wir pruefen jetzt deine Angaben."

Die Verifizierung dauert in der Regel **24 bis 48 Stunden**. In manchen Faellen kann es laenger dauern. Du erhaelst eine E-Mail, sobald der Account freigeschaltet ist.

---

## Schritt 2: Identitaetsverifizierung

**Warum das noetig ist:** Google will sicherstellen, dass echte Personen Apps veroeffentlichen. Das schuetzt Nutzer vor Malware und schaedlichen Apps. Seit November 2023 ist diese Verifizierung fuer alle neuen Personal Accounts Pflicht.

### Benoetigte Dokumente

- **Personalausweis oder Reisepass** (gueltiges amtliches Ausweisdokument)
- **Handynummer** (fuer SMS-Verifizierung)
- **Adresse** (muss mit dem Ausweisdokument uebereinstimmen)

### Ablauf

1. **E-Mail von Google erhalten**
   - Du bekommst eine E-Mail mit dem Betreff "Verifiziere deine Identitaet als Google Play-Entwickler".
   - Klicke auf den Link in der E-Mail.

2. **Ausweisdokument hochladen**
   - Waehle "Personalausweis" oder "Reisepass".
   - Mache ein Foto oder lade ein Scan hoch.
   - Stelle sicher, dass alle Details (Name, Geburtsdatum, Nummer) gut lesbar sind.

3. **Selfie-Video oder Foto**
   - Google fordert dich auf, ein Live-Selfie aufzunehmen.
   - Folge den Anweisungen auf dem Bildschirm (z.B. Kopf drehen, blinzeln).
   - Das dient dazu, zu pruefen, dass du die Person auf dem Ausweis bist.

4. **Telefonnummer verifizieren**
   - Gib deine Handynummer ein.
   - Du erhaelst einen SMS-Code, den du eingeben musst.

5. **Warten auf Freigabe**
   - Die Pruefung kann **bis zu 5 Tage** dauern.
   - Du erhaelst eine weitere E-Mail, sobald die Verifizierung abgeschlossen ist.

> **Hinweis:** Wenn die Angaben nicht uebereinstimmen (z.B. abweichender Name auf Kreditkarte und Ausweis), kann der Account abgelehnt werden. Die 25 USD werden in diesem Fall **nicht** zurueckerstattet.

---

## Schritt 3: App in Play Console erstellen

**Warum das noetig ist:** Bevor du eine App hochladen kannst, musst du sie in der Play Console als Projekt anlegen. Hier definierst du grundlegende Metadaten, die spaeter onboarding-relevant sind.

### Ablauf

1. **Play Console oeffnen**
   - Gehe zu [https://play.google.com/console](https://play.google.com/console).
   - Klicke auf "App erstellen" oder "App erstellen" (grosser blauer Button).

2. **App-Details eingeben**

   | Feld | Wert | Erklaerung |
   |---|---|---|
   | **App-Name** | `Kantine` | Der Name, der im Play Store angezeigt wird. |
   | **Standardsprache** | `Deutsch (de-DE)` | Die primaere Sprache der App. |
   | **App oder Spiel** | `App` | Kantine ist eine Utility-App, kein Spiel. |
   | **Kostenpflichtig oder kostenlos** | `Kostenlos` | Die App ist kostenlos, ohne In-App-Kaeufe. |

3. **Erklaerungen akzeptieren**
   - Lies die Erklaerungen zu den Programmrichtlinien und den Exportgesetzen.
   - Setze die Haekchen und klicke auf "App erstellen".

### Was du danach siehst

Du landest auf dem Dashboard der neuen App. Links siehst du ein Navigationsmenue mit Punkten wie "Dashboard", "Produktion", "Testing", "Store-Eintrag", usw. Der App-Status ist jetzt "Entwurf".

---

## Schritt 4: Internal Testing Track

**Warum das noetig ist:** Der Internal Testing Track erlaubt es, die App sofort auf bis zu 100 Geraeten zu testen, ohne dass die App oeffentlich sichtbar ist. Das ist ideal fuer die ersten Smoke-Tests direkt nach dem Build.

**Unterschied der Testing Tracks:**

| Track | Sichtbarkeit | Wer kann testen | Nutzung fuer Kantine |
|---|---|---|---|
| **Internal** | Nur eingeladene E-Mails | Bis zu 100 Nutzer | Erste Tests nach jedem Build |
| **Closed** | Nur eingeladene E-Mails | Bis zu 10.000 Nutzer | Beta-Tests mit Freunden |
| **Open** | Oeffentlich, aber opt-in | Unbegrenzt | Soft-Launch vor Produktion |
| **Production** | Oeffentlich, fuer alle | Alle Play Store Nutzer | Finaler Release |

### Ablauf

1. **Navigiere zu "Testing" > "Internal Testing"**
   - Im linken Menue klicke auf "Testing".
   - Waehle "Internal Testing".

2. **Tester hinzufuegen**
   - Klicke auf "Tester hinzufuegen".
   - Gib die E-Mail-Adressen der Tester ein (max. 100).
   - Die Tester muessen ein Google-Konto haben.

3. **Tester-Einladung versenden**
   - Klicke auf "Einladung senden".
   - Die Tester erhalten eine E-Mail mit einem Link zum Opt-in.

4. **App hochladen**
   - Klicke auf "Neue Version erstellen".
   - Lade die AAB-Datei hoch (`app-release.aab`).
   - Fuege Release-Notes hinzu (z.B. "Erste interne Testversion").
   - Klicke auf "Zum internen Test starten".

5. **Warte auf Verarbeitung**
   - Google verarbeitet die AAB (ca. 15-30 Minuten).
   - Danach erhalten die Tester eine Benachrichtigung.

---

## Schritt 5: Closed Testing Track

**Warum das noetig ist:** Der Closed Testing Track ist fuer eine groessere Gruppe von Beta-Testern gedacht. Das ist der richtige Ort, um Feedback von Freunden oder einer kleinen Community zu sammeln, bevor die App oeffentlich wird.

### Ablauf

1. **Navigiere zu "Testing" > "Closed Testing"**
   - Im linken Menue unter "Testing" waehle "Closed Testing".

2. **Neue Testgruppe erstellen**
   - Klicke auf "Testgruppe erstellen".
   - Gib einen Namen ein, z.B. "Kantine Beta".
   - Waehle "E-Mail-Liste" als Einladungsmethode.

3. **Tester hinzufuegen**
   - Gib die E-Mail-Adressen der Beta-Tester ein (bis zu 10.000).
   - Speichere die Gruppe.

4. **App hochladen**
   - Klicke auf "Neue Version erstellen".
   - Lade die AAB-Datei hoch.
   - Fuege Release-Notes hinzu (z.B. "Beta-Version mit verbessertem Flagging").
   - Klicke auf "Zum geschlossenen Test starten".

5. **Tester einladen**
   - Nach der Verarbeitung klicke auf "Tester einladen".
   - Die Tester erhalten eine E-Mail mit dem Opt-in-Link.

---
- **Wichtig:** Fuer den Closed Track gibt es seit 2023 eine Pflicht: Du musst mindestens 20 Tester haben, die die App aktiv testen, bevor du zur Produktion freigeben kannst. Plane das bei der Tester-Akquise ein.

## Schritt 6: Open Testing Track (optional)

**Warum das noetig ist:** Der Open Testing Track erlaubt es, die App oeffentlich, aber ohne volle Produktions-Sichtbarkeit zu testen. Nutzer finden die App im Play Store, aber sie erscheint nicht in den Top-Listen. Das ist nuetzlich fuer einen Soft-Launch.

### Ablauf

1. **Navigiere zu "Testing" > "Open Testing"**
   - Im linken Menue unter "Testing" waehle "Open Testing".

2. **Test konfigurieren**
   - Klicke auf "Neue Version erstellen".
   - Lade die AAB-Datei hoch.
   - Fuege Release-Notes hinzu.

3. **Starte den offenen Test**
   - Klicke auf "Zum offenen Test starten".
   - Die App ist jetzt im Play Store auffindbar, aber markiert als "Open Beta".

---

## Kritische Warnungen

### Keystore-Backup ist lebenswichtig

Der Keystore (`android/keystore/release.jks`) und seine Passwoerter sind **unersetzlich**. Wenn du ihn verlierst, kannst du die App nie wieder unter dem gleichen Paketnamen (`at.kaufi.kantine`) aktualisieren.

**Was du tun musst:**

1. Kopiere `release.jks` an einen sicheren Ort (verschluesselter USB-Stick, Passwort-Manager wie 1Password oder Passbolt).
2. Speichere die Passwoerter aus `keystore.properties` separat und sicher.
3. Nie in Git committen (bereits in `.gitignore`).
4. Mache regelmaessige Backups.

### Google Play App Signing

Seit August 2021 verwaltet Google den **Signing-Key** fuer neue Apps. Das bedeutet:

- **Upload-Key:** Der Key, mit dem du die AAB signierst (dein `release.jks`).
- **Signing-Key:** Der Key, mit dem Google die App final signiert (von Google verwaltet).

**Warum das wichtig ist:** Wenn du deinen Upload-Key verlierst, kannst du einen neuen bei Google registrieren. Aber das ist ein komplizierter Prozess. Bewahre den Upload-Key trotzdem sicher auf.

### App Bundle (AAB) ist Pflicht

Fuer alle neuen Apps auf Google Play ist das **Android App Bundle (AAB)**-Format verpflichtend. APKs werden fuer neue Apps nicht mehr akzeptiert.

- **AAB:** Enthaelt alle Ressourcen fuer verschiedene Geraetekonfigurationen. Google generiert daraus optimierte APKs.
- **APK:** Wird nur noch fuer interne Tests oder sideloading verwendet.

**Fuer Kantine:** Stelle sicher, dass `gradle assembleRelease` ein AAB erzeugt (nicht nur APK). Der korrekte Gradle-Task ist `bundleRelease`.

### Noch einmal: Keine automatische Einrichtung

Diese Anleitung beschreibt einen **manuellen Prozess**. Du musst persoenlich:

- Die 25 USD bezahlen
- Deinen Ausweis hochladen
- Die Telefonnummer prompt verifizieren
- Jeden Schritt in der Play Console selbst durchfuehren

Es gibt kein Skript oder Tool, das diesen Prozess fuer dich abkuerzt.

---

## Nuetzliche Links

| Ressource | URL |
|---|---|
| Play Console | [https://play.google.com/console](https://play.google.com/console) |
| Play Console Hilfe | [https://support.google.com/googleplay/android-developer](https://support.google.com/googleplay/android-developer) |
| Developer Distribution Agreement | [https://play.google.com/about/developer-distribution-agreement.html](https://play.google.com/about/developer-distribution-agreement.html) |
| Android App Bundle | [https://developer.android.com/guide/app-bundle](https://developer.android.com/guide/app-bundle) |
| App Signing by Google Play | [https://developer.android.com/studio/publish/app-signing#google-play-signing](https://developer.android.com/studio/publish/app-signing#google-play-signing) |

---

*Diese Anleitung wurde fuer das Kantine-Projekt erstellt. Bei Aenderungen bei Google Play pruefe die offizielle Dokumentation unter [support.google.com/googleplay/android-developer](https://support.google.com/googleplay/android-developer).*
