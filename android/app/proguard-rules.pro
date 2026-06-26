# Moshi DTOs
-keep class at.kaufi.kantine.network.dto.** { *; }

# Room entities
-keep class at.kaufi.kantine.data.local.** { *; }

# Hilt
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }

# Tink / error_prone annotations (transitive dependency, missing at runtime)
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
