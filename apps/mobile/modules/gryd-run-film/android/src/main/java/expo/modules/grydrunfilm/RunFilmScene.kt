package expo.modules.grydrunfilm

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Typeface
import org.json.JSONObject
import kotlin.math.hypot
import kotlin.math.min

internal class FilmFailure(val reason: String) : Exception(reason)
internal class RunFilmScene(json: String) {
  private val source = JSONObject(json)
  val width = source.getInt("width")
  val height = source.getInt("height")
  val fps = source.getInt("fps")
  val frames = source.getInt("frames")
  val start = source.getInt("revealStartFrame")
  val end = source.getInt("revealEndFrame")
  private val background = Color.parseColor(source.getString("background"))
  private val traceColor = Color.parseColor(source.getString("traceColor"))
  private val traceWidth = source.getDouble("traceWidth").toFloat()
  private val logo = source.getJSONObject("logo")
  private val texts = source.getJSONArray("texts")
  private fun arrays(key: String, obj: JSONObject = source): List<FloatArray> {
    val array = obj.getJSONArray(key)
    return (0 until array.length()).map { i ->
      val values = array.getJSONArray(i)
      FloatArray(values.length()) { values.getDouble(it).toFloat() }
    }
  }
  private val segments = arrays("segments")
  private val contours = arrays("contours", logo)
  private val totalLength = segments.sumOf { segment ->
    (2 until segment.size step 2).sumOf { i -> hypot((segment[i] - segment[i - 2]).toDouble(), (segment[i + 1] - segment[i - 1]).toDouble()) }
  }
  init {
    if (source.getInt("version") != 1 || width != 1080 || height !in listOf(1080, 1350, 1920) || fps != 30 || frames != 240 || start != 15 || end != 150 ||
      texts.length() > 12 || segments.sumOf { it.size } > 40000 || contours.sumOf { it.size } > 10000 || !traceWidth.isFinite() || traceWidth <= 0 || traceWidth > 2000) throw FilmFailure("invalid_input")
    (segments + contours).forEach { path -> if (path.size < 4 || path.size % 2 != 0 || path.any { !it.isFinite() || kotlin.math.abs(it) > 10000 }) throw FilmFailure("invalid_input") }
    listOf("x", "y", "height").forEach { key -> if (!logo.getDouble(key).isFinite() || kotlin.math.abs(logo.getDouble(key)) > 2000) throw FilmFailure("invalid_input") }
    for (i in 0 until texts.length()) {
      val text = texts.getJSONObject(i)
      if (text.getString("text").length > 100) throw FilmFailure("invalid_input")
      listOf("x", "y", "size", "maxWidth").forEach { key -> if (!text.getDouble(key).isFinite() || kotlin.math.abs(text.getDouble(key)) > 4000) throw FilmFailure("invalid_input") }
      if (text.getDouble("size") <= 0 || text.getDouble("maxWidth") <= 0) throw FilmFailure("invalid_input")
    }
  }
  fun draw(canvas: Canvas, frame: Int) {
    canvas.drawColor(background)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    val path = Path()
    path.fillType = Path.FillType.EVEN_ODD
    contours.forEach { contour ->
      path.moveTo(contour[0], contour[1])
      for (i in 2 until contour.size step 2) path.lineTo(contour[i], contour[i + 1])
      path.close()
    }
    canvas.save()
    canvas.translate(logo.getDouble("x").toFloat(), logo.getDouble("y").toFloat())
    val scale = logo.getDouble("height").toFloat() / 100f
    canvas.scale(scale, scale)
    paint.color = Color.parseColor(logo.getString("color"))
    canvas.drawPath(path, paint)
    canvas.restore()
    for (i in 0 until texts.length()) {
      val text = texts.getJSONObject(i)
      val value = text.getString("text")
      paint.color = Color.parseColor(text.getString("color"))
      paint.typeface = Typeface.create(if (text.getString("weight") == "medium") "sans-serif-medium" else "sans-serif", Typeface.NORMAL)
      paint.textSize = text.getDouble("size").toFloat()
      val maxWidth = text.getDouble("maxWidth").toFloat()
      val measured = paint.measureText(value)
      if (measured > maxWidth) paint.textSize *= maxWidth / measured
      canvas.drawText(value, text.getDouble("x").toFloat(), text.getDouble("y").toFloat(), paint)
    }
    var remaining = totalLength * ((frame - start).toDouble() / (end - start)).coerceIn(0.0, 1.0)
    paint.color = traceColor
    paint.style = Paint.Style.STROKE
    paint.strokeWidth = traceWidth
    paint.strokeCap = Paint.Cap.ROUND
    paint.strokeJoin = Paint.Join.ROUND
    for (segment in segments) {
      if (remaining <= 0) break
      path.reset()
      path.moveTo(segment[0], segment[1])
      for (i in 2 until segment.size step 2) {
        if (remaining <= 0) break
        val length = hypot((segment[i] - segment[i - 2]).toDouble(), (segment[i + 1] - segment[i - 1]).toDouble())
        val portion = if (length > 0) min(1.0, remaining / length).toFloat() else 1f
        path.lineTo(segment[i - 2] + (segment[i] - segment[i - 2]) * portion, segment[i - 1] + (segment[i + 1] - segment[i - 1]) * portion)
        remaining -= length
      }
      canvas.drawPath(path, paint)
    }
  }
}
