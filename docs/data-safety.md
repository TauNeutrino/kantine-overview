# Google Play Data Safety Declaration — Kantine

> **Package:** `at.kaufi.kantine`  
> **Form language:** English (Play Console UI)  
> **Last updated:** 2026-06-26  
> **Purpose:** Copy-paste reference for every field in the Play Console Data Safety form.

---

## 1. Overview / App-Level Questions

### Does your app collect or share any of the required user data types?

**Answer:** Yes

> The app collects a minimal set of user data required for authentication and basic app functionality.

---

## 2. Data Types — Collected or Shared

For each category below, indicate whether the app **collects** or **shares** the data type.

| Data Category | Data Type | Collected? | Shared? | Notes |
|:---|:---|:---:|:---:|:---|
| **Location** | Approximate location | No | No | Not collected |
| | Precise location | No | No | Not collected |
| **Personal info** | Name | **Yes** | No | Optional, from Bessa API |
| | Email address | **Yes** | No | Required for login |
| | User IDs | No | No | Not collected |
| | Address | No | No | Not collected |
| | Phone number | No | No | Not collected |
| | Race and ethnicity | No | No | Not collected |
| | Political or religious beliefs | No | No | Not collected |
| | Sexual orientation | No | No | Not collected |
| | Other info | No | No | Not collected |
| **Financial info** | Purchase history | No | No | Not collected |
| | Credit cards | No | No | Not collected |
| | Other financial info | No | No | Not collected |
| **Health and fitness** | Health info | No | No | Not collected |
| | Fitness info | No | No | Not collected |
| **Messages** | Emails | No | No | Not collected |
| | SMS or MMS | No | No | collected |
| | Other in-app messages | No | No | Not collected |
| **Photos and videos** | Photos | No | No | Not collected |
| | Videos | No | No | Not collected |
| **Audio files** | Voice or sound recordings | No | No | Not collected |
| | Music files | No | No | Not collected |
| | Other audio files | No | No | Not collected |
| **Files and docs** | Files and docs | No | No | Not collected |
| **Calendar** | Calendar events | No | No | Not collected |
| **Contacts** | Contacts | No | No | Not collected |
| **App activity** | App interactions | **Yes** | No | Ephemeral UI state only, not persisted |
| | In-app search history | No | No | Not collected |
| | Installed apps | No | No | Not collected |
| | Other user-generated content | No | No | Not collected |
| | Other actions | No | No | Not collected |
| **Web browsing** | Web browsing history | No | No | Not collected |
| **App info and performance** | Crash logs | No | No | No crash reporting in MVP |
| | Diagnostics | No | No | Not collected |
| | Other app performance data | No | No | Not collected |
| **Device or other identifiers** | Device or other identifiers | No | No | **No Advertising ID, no device IDs collected** |

---

## 3. Detailed Answers per Data Type

### 3.1 Email Address

| Question | Answer |
|:---|:---|
| **Is this data collected, shared, or both?** | Collected |
| **Is this data processed ephemerally?** | No |
| **Is this data required or optional?** | Required |
| **Purpose(s)** | App functionality, Account management |

**Play Console text to select:**
- [x] App functionality
- [x] Account management
- [ ] Analytics
- [ ] Developer communications
- [ ] Advertising or marketing
- [ ] Fraud prevention, security, and compliance
- [ ] Personalization

**Internal note:** Email is used for login via the Bessa API. The auth token is stored in `EncryptedSharedPreferences`. Email itself is not stored separately; only the token is persisted locally.

---

### 3.2 Name

| Question | Answer |
|:---|:---|
| **Is this data collected, shared, or both?** | Collected |
| **Is this data processed ephemerally?** | No |
| **Is this data required or optional?** | Optional |
| **Purpose(s)** | App functionality |

**Play Console text to select:**
- [x] App functionality
- [ ] Account management
- [ ] Analytics
- [ ] Developer communications
- [ ] Advertising or marketing
- [ ] Fraud prevention, security, and compliance
- [ ] Personalization

**Internal note:** Name is returned by the Bessa API if the user has provided it, but it is **not separately persisted** by the Kantine app. It is only displayed ephemerally in the UI during the active session.

---

### 3.3 App Interactions (Device/App Interactions)

| Question | Answer |
|:---|:---|
| **Is this data collected, shared, or both?** | Collected |
| **Is this data processed ephemerally?** | **Yes** |
| **Is this data required or optional?** | Required (inherent to app use) |
| **Purpose(s)** | App functionality |

**Play Console text to select:**
- [x] App functionality
- [ ] Analytics
- [ ] Developer communications
- [ ] Advertising or marketing
- [ ] Fraud prevention, security, and compliance
- [ ] Personalization

**Internal note:** App interactions (screen navigation, UI state) exist only in memory during the active session. They are **not persisted** to disk, not sent to any server, and not shared with third parties. This is standard Android UI behavior.

---

## 4. Data Safety

### Is all user data collected by your app encrypted in transit?

**Answer:** Yes

> All API communication uses **HTTPS with TLS 1.3**. The Bessa API endpoints are accessed exclusively over encrypted connections. No plaintext data is ever transmitted.

---

## 5. Data Sharing

### Does your app share user data with third parties?

**Answer:** No

> The app does **not** share user data with third parties. The only external communication is with the Bessa API (https://web.bessa.app) to fetch menu data. This is a service integration, not data sharing with a third party for their independent purposes.

**Play Console text to select:**
- [ ] Yes, user data is shared with third parties
- [x] No, user data is not shared with third parties

---

## 6. Data Selling

### Does your app sell user data?

**Answer:** No

> The app does **not** sell user data. There is no monetization via data, no advertising, and no data brokerage.

---

## 7. Account Deletion

### Do you provide a way for users to request that their data be deleted?

**Answer:** Yes

> **In-app deletion:** The Logout function deletes the locally stored auth token from `EncryptedSharedPreferences`. This removes all app-local data.
>
> **Full account deletion:** The Kantine app uses Bessa accounts. To fully delete a Bessa account (including all associated data on Bessa servers), users must visit the Bessa web interface: **https://web.bessa.app**
>
> The app itself does not store any user-generated content, order history, or persistent personal data beyond the auth token.

---

## 8. Data Safety Labels Summary

When Play Console asks for the **Data safety section** (the public-facing label on the store listing), the following statements apply:

| Label | Status | Explanation |
|:---|:---:|:---|
| **Data shared** | No data shared with third parties | Only Bessa API is contacted for menu data |
| **Data collected** | Email address, Name, App interactions | Minimal data for login and UI only |
| **Data encrypted in transit** | Yes | HTTPS TLS 1.3 for all API calls |
| **Data deletion** | Yes | Logout clears local token; full account deletion via https://web.bessa.app |
| **Committed to following Play Families Policy** | N/A | App is not targeted to children |

---

## 9. Negative Declarations (What the App Does NOT Do)

Use these to confidently answer "No" across the form:

| Statement | Status |
|:---|:---:|
| No Firebase services | Confirmed |
| No Google Analytics | Confirmed |
| No Crashlytics | Confirmed |
| No Advertising ID collected | Confirmed |
| No location data collected | Confirmed |
| No camera access | Confirmed |
| No microphone access | Confirmed |
| No SMS/phone access | Confirmed |
| No contacts access | Confirmed |
| No push notifications | Confirmed |
| No tracking or profiling | Confirmed |
| No ads displayed | Confirmed |
| No user-generated content stored | Confirmed |
| No order/payment history stored locally | Confirmed |

---

## 10. Quick Reference: Copy-Paste Answers

### Section: Data types

**Email address**
```
Collected: Yes
Shared: No
Ephemerally processed: No
Required/Optional: Required
Purposes: App functionality, Account management
```

**Name**
```
Collected: Yes
Shared: No
Ephemerally processed: No
Required/Optional: Optional
Purposes: App functionality
```

**App interactions**
```
Collected: Yes
Shared: No
Ephemerally processed: Yes
Required/Optional: Required
Purposes: App functionality
```

### Section: Data safety practices

```
Is all user data encrypted in transit? Yes
Does your app share user data with third parties? No
Does your app sell user data? No
Do you provide account deletion? Yes
```

---

## 11. Notes for the Person Filling the Form

1. **Form language:** The Play Console Data Safety form is in English. All answers above are in English and ready to copy-paste.
2. **Accuracy:** This document was prepared based on the current MVP implementation. If new features are added (e.g., analytics, crash reporting, location), this document must be updated before the next release.
3. **Bessa dependency:** The app is a client of the Bessa platform. User account data (email, name) is managed by Bessa. The Kantine app only acts as a viewer/client.
4. **No persistent storage of PII:** Beyond the auth token in `EncryptedSharedPreferences`, no personal data is written to local storage, databases, or files.
5. **Review cycle:** Revisit this declaration at minimum once per year or upon any data-handling change.
