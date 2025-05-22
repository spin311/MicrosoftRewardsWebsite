import com.android.build.gradle.LibraryExtension
import org.gradle.kotlin.dsl.getByType


allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory = rootProject.layout.buildDirectory.dir("../../build").get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

subprojects {
    // As soon as the Android library plugin is applied…
    plugins.withId("com.android.library") {
        // If this is the flutter_native_timezone module…
        if (project.name == "flutter_native_timezone") {
            // Grab its LibraryExtension and set the namespace
            extensions.getByType<LibraryExtension>().namespace =
                "com.lyokone.flutter_native_timezone"
        }
    }
}