# Android Signing & Keystore Backup

## Keystore Location
- `android/keystore/release.jks`
- `android/keystore.properties`

## Backup Instructions

1. **Copy the keystore file** to a secure offline location (e.g., encrypted USB drive, password manager vault, or secure cloud storage).
2. **Store the keystore password and key password** in your password manager or another secure location.
3. **Never commit the keystore or passwords** to version control. Both are already listed in `.gitignore`.
4. **If the keystore is ever lost**, you will NOT be able to update the app on the Play Store under the same package name. Treat it as irreplaceable.

## Recovery
To restore or use the keystore on a new machine, copy `release.jks` and `keystore.properties` back into the `android/keystore/` directory and ensure `keystore.properties` is at `android/keystore.properties`.
