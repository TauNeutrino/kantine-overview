# Store Description Guidelines

This document describes the Play Store metadata prepared for the Kantine app.

## Files Prepared

### Text Metadata (fastlane/metadata/android/)

| File | Locale | Content |
|------|--------|---------|
| `de-DE/title.txt` | German | "Kantine" |
| `en-US/title.txt` | English | "Kantine" |
| `de-DE/short_description.txt` | German | Wochenübersicht der Kantine mit DE/EN-Menüerkennung. (52 chars) |
| `en-US/short_description.txt` | English | Weekly canteen menu with DE/EN language detection. (50 chars) |
| `de-DE/full_description.txt` | German | See file - covers features, privacy, security |
| `en-US/full_description.txt` | English | See file - covers features, privacy, security |
| `de-DE/video.txt` | German | "No video available." |
| `en-US/video.txt` | English | "No video available." |

### Feature Graphic

- **Location**: `fastlane/metadata/android/images/featureGraphic.svg`
- **Required size**: 1024 x 500 pixels
- **Format**: SVG
- **Current state**: SVG file ready at featureGraphic.svg (873 bytes, 1024×500)
- **Conversion needed**: SVG is the source format. The Play Store accepts PNG uploads — convert via Inkscape, Illustrator, or an online converter when submitting.

#### Design Specification

The feature graphic should follow Material 3 design principles:

- **Background**: Soft green gradient (#E8F5E9 to #C8E6C9) representing freshness and food
- **Primary text**: "Kantine" in bold, dark green (#1B5E20), centered
- **Tagline**: "Your digital canteen menu" in smaller text below
- **Accent**: Subtle Material 3-style rounded rectangle with low opacity green
- **Style**: Clean, modern, minimal - no clutter, no photos, no complex illustrations

## Content Guidelines Followed

### Included Information
- App name: Kantine
- Package: at.kaufi.kantine
- Category: Food & Drink / Essen & Trinken
- Content rating: PEGI 3 / USK ab 0 (no problematic content)
- Key features: Login, weekly view, DE/EN detection, Material 3 design
- Privacy: No registration needed, no ads, no tracking
- Security: HTTPS TLS 1.3 encryption

### Excluded Information
- No order history claims
- No push notification claims
- No analytics, ads, or monetization mentions
- No Chrome, Firebase, or Crashlytics mentions
- No location data collection mentions

## Character Counts

| Description | Characters |
|-------------|------------|
| DE short | 52 |
| EN short | 50 |
| DE full | 803 |
| EN full | 700 |

All descriptions are well under the 4000 character limit.
