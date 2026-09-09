package expo.modules.grydrunfilm

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.URI
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

class GrydRunFilmModule : Module() {
  private val busy = AtomicBoolean(false)
  private val cancelled = ConcurrentHashMap.newKeySet<String>()
  private fun directory(): File = File(appContext.reactContext?.cacheDir ?: throw FilmFailure("encoding_failed"), "gryd-films")
  override fun definition() = ModuleDefinition {
    Name("GrydRunFilm")
    AsyncFunction("isAvailableAsync") { width: Int, height: Int -> RunFilmEncoder.isAvailable(width, height) }
    Function("cancel") { job: String -> cancelled.add(job); Unit }
    AsyncFunction("generateAsync") { job: String, json: String ->
      if (!job.matches(Regex("^[a-zA-Z0-9-]{1,80}$")) || json.length > 2_000_000) return@AsyncFunction mapOf("ok" to false, "reason" to "invalid_input")
      if (!busy.compareAndSet(false, true)) return@AsyncFunction mapOf("ok" to false, "reason" to "busy")
      var output: File? = null
      try {
        val directory = directory()
        if (!directory.exists() && !directory.mkdirs()) throw FilmFailure("encoding_failed")
        directory.listFiles()?.filter { it.name.startsWith("gryd-film-") && it.lastModified() < System.currentTimeMillis() - 86_400_000 }?.forEach { it.delete() }
        val file = File(directory, "gryd-film-$job.mp4"); output = file
        val scene = RunFilmScene(json)
        RunFilmEncoder.encode(scene, file) { cancelled.contains(job) }
        mapOf("ok" to true, "uri" to file.toURI().toString(), "width" to scene.width, "height" to scene.height, "durationMs" to 8000, "mimeType" to "video/mp4")
      } catch (error: Exception) {
        output?.delete()
        mapOf("ok" to false, "reason" to ((error as? FilmFailure)?.reason ?: "encoding_failed"))
      } finally { busy.set(false); cancelled.remove(job) }
    }
    AsyncFunction("releaseAsync") { uri: String ->
      try {
        val address = URI(uri)
        if (address.scheme == "file") {
          val file = File(address).canonicalFile
          if (file.parentFile == directory().canonicalFile && file.name.startsWith("gryd-film-") && file.extension == "mp4") file.delete()
        }
      } catch (_: Exception) { }
      Unit
    }
  }
}
