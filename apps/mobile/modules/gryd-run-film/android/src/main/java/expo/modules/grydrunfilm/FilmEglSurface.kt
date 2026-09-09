package expo.modules.grydrunfilm

import android.graphics.Bitmap
import android.opengl.EGL14
import android.opengl.EGLConfig
import android.opengl.EGLExt
import android.opengl.GLES20
import android.opengl.GLUtils
import android.view.Surface
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Hardware input surface. MediaCodec surfaces do not support Canvas.lockCanvas(). */
internal class FilmEglSurface(surface: Surface, private val width: Int, private val height: Int) {
  private val display = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
  private var context = EGL14.EGL_NO_CONTEXT
  private var window = EGL14.EGL_NO_SURFACE
  private var program = 0
  private var texture = 0
  private val vertices = ByteBuffer.allocateDirect(16 * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().apply {
    put(floatArrayOf(-1f, -1f, 0f, 1f, 1f, -1f, 1f, 1f, -1f, 1f, 0f, 0f, 1f, 1f, 1f, 0f)); position(0)
  }
  init {
    try {
      val version = IntArray(2)
      check(EGL14.eglInitialize(display, version, 0, version, 1))
      val configs = arrayOfNulls<EGLConfig>(1)
      val count = IntArray(1)
      val attributes = intArrayOf(EGL14.EGL_RED_SIZE, 8, EGL14.EGL_GREEN_SIZE, 8, EGL14.EGL_BLUE_SIZE, 8, EGL14.EGL_ALPHA_SIZE, 8,
        EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT, 0x3142, 1, EGL14.EGL_NONE)
      check(EGL14.eglChooseConfig(display, attributes, 0, configs, 0, 1, count, 0) && count[0] > 0)
      context = EGL14.eglCreateContext(display, configs[0], EGL14.EGL_NO_CONTEXT, intArrayOf(EGL14.EGL_CONTEXT_CLIENT_VERSION, 2, EGL14.EGL_NONE), 0)
      check(context != EGL14.EGL_NO_CONTEXT)
      window = EGL14.eglCreateWindowSurface(display, configs[0], surface, intArrayOf(EGL14.EGL_NONE), 0)
      check(window != EGL14.EGL_NO_SURFACE && EGL14.eglMakeCurrent(display, window, window, context))
      val vertex = shader(GLES20.GL_VERTEX_SHADER, "attribute vec2 position; attribute vec2 texcoord; varying vec2 uv; void main(){gl_Position=vec4(position,0.0,1.0);uv=texcoord;}")
      val fragment = shader(GLES20.GL_FRAGMENT_SHADER, "precision mediump float; varying vec2 uv; uniform sampler2D image; void main(){gl_FragColor=texture2D(image,uv);}")
      program = GLES20.glCreateProgram()
      GLES20.glAttachShader(program, vertex); GLES20.glAttachShader(program, fragment); GLES20.glLinkProgram(program)
      GLES20.glDeleteShader(vertex); GLES20.glDeleteShader(fragment)
      val linked = IntArray(1); GLES20.glGetProgramiv(program, GLES20.GL_LINK_STATUS, linked, 0); check(linked[0] == GLES20.GL_TRUE)
      val textures = IntArray(1); GLES20.glGenTextures(1, textures, 0); texture = textures[0]
      GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, texture)
      GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
      GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
      GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
      GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)
      GLES20.glTexImage2D(GLES20.GL_TEXTURE_2D, 0, GLES20.GL_RGBA, width, height, 0, GLES20.GL_RGBA, GLES20.GL_UNSIGNED_BYTE, null)
    } catch (error: Exception) { release(); throw error }
  }
  private fun shader(type: Int, code: String): Int {
    val shader = GLES20.glCreateShader(type)
    GLES20.glShaderSource(shader, code); GLES20.glCompileShader(shader)
    val compiled = IntArray(1); GLES20.glGetShaderiv(shader, GLES20.GL_COMPILE_STATUS, compiled, 0)
    if (compiled[0] != GLES20.GL_TRUE) { GLES20.glDeleteShader(shader); throw FilmFailure("encoder_unavailable") }
    return shader
  }
  fun frame(bitmap: Bitmap, presentationTimeNs: Long) {
    GLES20.glViewport(0, 0, width, height)
    GLES20.glUseProgram(program)
    GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
    GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, texture)
    GLUtils.texSubImage2D(GLES20.GL_TEXTURE_2D, 0, 0, 0, bitmap)
    GLES20.glUniform1i(GLES20.glGetUniformLocation(program, "image"), 0)
    val position = GLES20.glGetAttribLocation(program, "position")
    val coord = GLES20.glGetAttribLocation(program, "texcoord")
    vertices.position(0); GLES20.glVertexAttribPointer(position, 2, GLES20.GL_FLOAT, false, 16, vertices); GLES20.glEnableVertexAttribArray(position)
    vertices.position(2); GLES20.glVertexAttribPointer(coord, 2, GLES20.GL_FLOAT, false, 16, vertices); GLES20.glEnableVertexAttribArray(coord)
    GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
    check(GLES20.glGetError() == GLES20.GL_NO_ERROR)
    check(EGLExt.eglPresentationTimeANDROID(display, window, presentationTimeNs))
    check(EGL14.eglSwapBuffers(display, window))
  }
  fun release() {
    if (context != EGL14.EGL_NO_CONTEXT) {
      if (texture != 0) GLES20.glDeleteTextures(1, intArrayOf(texture), 0)
      if (program != 0) GLES20.glDeleteProgram(program)
      EGL14.eglMakeCurrent(display, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT)
      if (window != EGL14.EGL_NO_SURFACE) EGL14.eglDestroySurface(display, window)
      EGL14.eglDestroyContext(display, context)
    }
    EGL14.eglReleaseThread(); EGL14.eglTerminate(display)
    context = EGL14.EGL_NO_CONTEXT; window = EGL14.EGL_NO_SURFACE
  }
}
