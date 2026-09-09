package expo.modules.grydrunfilm

import android.graphics.Bitmap
import android.graphics.Canvas
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaCodecList
import android.media.MediaFormat
import android.media.MediaMuxer
import android.os.SystemClock
import android.view.Surface
import java.io.File

internal object RunFilmEncoder {
  private fun format(width: Int, height: Int) = MediaFormat.createVideoFormat("video/avc", width, height).apply {
    setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface)
    setInteger(MediaFormat.KEY_BIT_RATE, 8_000_000)
    setInteger(MediaFormat.KEY_FRAME_RATE, 30)
    setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1)
  }
  fun isAvailable(width: Int, height: Int): Boolean = try {
    width == 1080 && height in listOf(1080, 1350, 1920) && MediaCodecList(MediaCodecList.ALL_CODECS).findEncoderForFormat(format(width, height)) != null
  } catch (_: Exception) { false }

  fun encode(scene: RunFilmScene, output: File, cancelled: () -> Boolean) {
    val config = format(scene.width, scene.height)
    val name = MediaCodecList(MediaCodecList.ALL_CODECS).findEncoderForFormat(config) ?: throw FilmFailure("encoder_unavailable")
    var codec: MediaCodec? = null
    var muxer: MediaMuxer? = null
    var surface: Surface? = null
    var egl: FilmEglSurface? = null
    var bitmap: Bitmap? = null
    var started = false
    var muxerStarted = false
    var complete = false
    val deadline = SystemClock.elapsedRealtime() + 180_000
    fun checkpoint() {
      if (cancelled()) throw FilmFailure("cancelled")
      if (SystemClock.elapsedRealtime() > deadline) throw FilmFailure("timeout")
    }
    try {
      checkpoint()
      val encoder = MediaCodec.createByCodecName(name); codec = encoder
      val writer = MediaMuxer(output.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4); muxer = writer
      // No audio track, source metadata, GPS setLocation or orientation metadata.
      encoder.configure(config, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
      val inputSurface = encoder.createInputSurface(); surface = inputSurface
      encoder.start(); started = true
      val renderer = FilmEglSurface(inputSurface, scene.width, scene.height); egl = renderer
      val pixels = Bitmap.createBitmap(scene.width, scene.height, Bitmap.Config.ARGB_8888); bitmap = pixels
      val canvas = Canvas(pixels)
      val info = MediaCodec.BufferInfo()
      var track = -1
      var samples = 0
      fun drain(end: Boolean) {
        while (true) {
          checkpoint()
          val index = encoder.dequeueOutputBuffer(info, if (end) 10000 else 0)
          if (index == MediaCodec.INFO_TRY_AGAIN_LATER) { if (!end) return; continue }
          if (index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
            if (muxerStarted) throw FilmFailure("encoding_failed")
            track = writer.addTrack(encoder.outputFormat); writer.start(); muxerStarted = true
          } else if (index >= 0) {
            val buffer = encoder.getOutputBuffer(index) ?: throw FilmFailure("encoding_failed")
            try {
              if ((info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) info.size = 0
              if (info.size > 0) {
                if (!muxerStarted) throw FilmFailure("encoding_failed")
                buffer.position(info.offset); buffer.limit(info.offset + info.size)
                writer.writeSampleData(track, buffer, info); samples++
              }
            } finally { encoder.releaseOutputBuffer(index, false) }
            if ((info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) return
          }
        }
      }
      for (frame in 0 until scene.frames) {
        checkpoint(); drain(false)
        scene.draw(canvas, frame)
        renderer.frame(pixels, frame * 1_000_000_000L / scene.fps)
        drain(false)
      }
      encoder.signalEndOfInputStream()
      drain(true)
      checkpoint()
      if (!muxerStarted || samples != scene.frames) throw FilmFailure("encoding_failed")
      writer.stop(); muxerStarted = false
      if (output.length() < 1024) throw FilmFailure("encoding_failed")
      complete = true
    } finally {
      try { egl?.release() } catch (_: Exception) { }
      bitmap?.recycle()
      try { if (started) codec?.stop() } catch (_: Exception) { }
      try { codec?.release() } catch (_: Exception) { }
      try { surface?.release() } catch (_: Exception) { }
      try { if (muxerStarted) muxer?.stop() } catch (_: Exception) { }
      try { muxer?.release() } catch (_: Exception) { }
      if (!complete) output.delete()
    }
  }
}
