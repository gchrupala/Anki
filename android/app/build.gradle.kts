import java.util.Properties

plugins {
    id("com.android.application")
}

// The web app lives in the repository root, one level up.
val webRoot: File = rootProject.projectDir.parentFile

// Signing key details, kept out of git (see README). Without them the
// release APK is built unsigned.
val keystoreProperties = Properties().apply {
    val file = rootProject.file("keystore.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

// Each commit raises the version, so a new APK installs over the old one.
val commitCount: Int = providers.exec {
    commandLine("git", "rev-list", "--count", "HEAD")
    workingDir = webRoot
    isIgnoreExitValue = true
}.standardOutput.asText.get().trim().toIntOrNull() ?: 1

val webAssets = layout.buildDirectory.dir("generated/web")

android {
    namespace = "io.github.gchrupala.tabliczka"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.github.gchrupala.tabliczka"
        minSdk = 24
        targetSdk = 35
        versionCode = commitCount
        versionName = "1.0.$commitCount"
    }

    signingConfigs {
        if (keystoreProperties.isNotEmpty()) {
            create("release") {
                storeFile = rootProject.file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.findByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    sourceSets["main"].assets.srcDir(webAssets.get().asFile)
}

// Copies the web app into the APK. The service worker and manifest are left
// out: the APK has its own offline copy and launcher icon.
val copyWebApp by tasks.registering(Sync::class) {
    from(webRoot) {
        include("index.html", "srs.js", "i18n.js", "i18n-capitals.js", "i18n-chemistry.js", "i18n-literature.js", "i18n-languages.js", "countries.js", "chemistry.js", "literature.js", "languages.js", "fonts/*.css", "fonts/*.woff2")
    }
    into(webAssets)
}

tasks.named("preBuild") {
    dependsOn(copyWebApp)
}
