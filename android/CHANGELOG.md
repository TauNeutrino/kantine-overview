# Android Changelog

All notable changes to the Android app (native Kotlin client) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-06-26

### Added
- Android native app with Jetpack Compose + Material 3.
- Login screen with Bessa API authentication.
- Weekly menu overview with DE/EN language detection.
- Week navigation (swipe or arrow buttons).
- Hilt dependency injection.
- Room local database for menu caching.
- Retrofit + OkHttp networking with TLS 1.3.
- Moshi JSON parsing with KSP code generation.
- EncryptedSharedPreferences for secure token storage.
- RTL/language support (DE/EN).
- ProGuard/R8 minification and resource shrinking.
- Fastlane metadata for Play Store listing.
