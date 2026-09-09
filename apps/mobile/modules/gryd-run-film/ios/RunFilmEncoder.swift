import Foundation
import AVFoundation
import CoreGraphics
import CoreText
import CoreVideo

// Shared by the iOS Expo wrapper and the macOS command-line encoder verification.
struct RunFilmScene: Decodable {
  struct Label: Decodable { let text: String; let x, y, size: Double; let color: String; let maxWidth: Double; let weight: String }
  struct Logo: Decodable { let contours: [[Double]]; let x, y, height: Double; let color: String }
  let version, width, height, fps, frames, revealStartFrame, revealEndFrame: Int
  let background, traceColor: String
  let traceWidth: Double
  let logo: Logo
  let texts: [Label]
  let segments: [[Double]]

  func validate() throws {
    guard version == 1, width == 1080, [1080, 1350, 1920].contains(height), fps == 30, frames == 240,
      revealStartFrame == 15, revealEndFrame == 150, texts.count <= 12, segments.count <= 10000,
      segments.reduce(0, { $0 + $1.count }) <= 40000,
      logo.contours.reduce(0, { $0 + $1.count }) <= 10000 else { throw RunFilmFailure.invalidInput }
    for path in segments + logo.contours {
      guard path.count >= 4, path.count % 2 == 0, path.allSatisfy({ $0.isFinite && abs($0) <= 10000 }) else { throw RunFilmFailure.invalidInput }
    }
    guard [traceWidth, logo.x, logo.y, logo.height].allSatisfy({ $0.isFinite && abs($0) <= 2000 }), traceWidth > 0 else { throw RunFilmFailure.invalidInput }
    for text in texts {
      guard text.text.count <= 100, [text.x, text.y, text.size, text.maxWidth].allSatisfy({ $0.isFinite && abs($0) <= 4000 }), text.size > 0, text.maxWidth > 0 else { throw RunFilmFailure.invalidInput }
    }
  }
}
enum RunFilmFailure: Error { case invalidInput, cancelled, unavailable, timeout, encodingFailed }

final class RunFilmEncoder {
  static func color(_ hex: String) -> CGColor {
    let value = UInt32(hex.replacingOccurrences(of: "#", with: ""), radix: 16) ?? 0
    return CGColor(red: CGFloat((value >> 16) & 255) / 255, green: CGFloat((value >> 8) & 255) / 255, blue: CGFloat(value & 255) / 255, alpha: 1)
  }

  static func draw(_ scene: RunFilmScene, frame: Int, context: CGContext) {
    context.saveGState()
    context.translateBy(x: 0, y: CGFloat(scene.height))
    context.scaleBy(x: 1, y: -1)
    context.setFillColor(color(scene.background))
    context.fill(CGRect(x: 0, y: 0, width: scene.width, height: scene.height))
    context.saveGState()
    context.translateBy(x: scene.logo.x, y: scene.logo.y)
    context.scaleBy(x: scene.logo.height / 100, y: scene.logo.height / 100)
    context.beginPath()
    for contour in scene.logo.contours {
      context.move(to: CGPoint(x: contour[0], y: contour[1]))
      for i in stride(from: 2, to: contour.count, by: 2) { context.addLine(to: CGPoint(x: contour[i], y: contour[i + 1])) }
      context.closePath()
    }
    context.setFillColor(color(scene.logo.color))
    context.drawPath(using: .eoFill)
    context.restoreGState()
    for label in scene.texts {
      let fontName = label.weight == "medium" ? "HelveticaNeue-Medium" : "HelveticaNeue"
      func line(_ size: Double) -> CTLine {
        let attributes: [NSAttributedString.Key: Any] = [
          NSAttributedString.Key(kCTFontAttributeName as String): CTFontCreateWithName(fontName as CFString, size, nil),
          NSAttributedString.Key(kCTForegroundColorAttributeName as String): color(label.color)
        ]
        return CTLineCreateWithAttributedString(NSAttributedString(string: label.text, attributes: attributes))
      }
      var textLine = line(label.size)
      let length = CTLineGetTypographicBounds(textLine, nil, nil, nil)
      if length > label.maxWidth { textLine = line(label.size * label.maxWidth / length) }
      context.saveGState()
      context.translateBy(x: label.x, y: label.y)
      context.scaleBy(x: 1, y: -1)
      context.textMatrix = .identity
      context.textPosition = .zero
      CTLineDraw(textLine, context)
      context.restoreGState()
    }
    var total = 0.0
    for segment in scene.segments {
      for i in stride(from: 2, to: segment.count, by: 2) {
        total += hypot(segment[i] - segment[i - 2], segment[i + 1] - segment[i - 1])
      }
    }
    let progress = min(1.0, max(0.0, Double(frame - scene.revealStartFrame) / Double(scene.revealEndFrame - scene.revealStartFrame)))
    var remaining = total * progress
    context.setStrokeColor(color(scene.traceColor))
    context.setLineWidth(scene.traceWidth)
    context.setLineCap(.round)
    context.setLineJoin(.round)
    // A separate path for each retained segment: never bridge a pause or a privacy gap.
    for segment in scene.segments where remaining > 0 {
      context.beginPath()
      context.move(to: CGPoint(x: segment[0], y: segment[1]))
      for i in stride(from: 2, to: segment.count, by: 2) {
        if remaining <= 0 { break }
        let distance = hypot(segment[i] - segment[i - 2], segment[i + 1] - segment[i - 1])
        let fraction = distance > 0 ? min(1, remaining / distance) : 1
        context.addLine(to: CGPoint(x: segment[i - 2] + (segment[i] - segment[i - 2]) * fraction, y: segment[i - 1] + (segment[i + 1] - segment[i - 1]) * fraction))
        remaining -= distance
      }
      context.strokePath()
    }
    context.restoreGState()
  }

  static func encode(scene: RunFilmScene, output: URL, cancelled: () -> Bool) throws {
    try scene.validate()
    guard !cancelled() else { throw RunFilmFailure.cancelled }
    let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: scene.width, AVVideoHeightKey: scene.height,
      AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 8_000_000,
        AVVideoExpectedSourceFrameRateKey: scene.fps, AVVideoMaxKeyFrameIntervalKey: scene.fps, AVVideoAllowFrameReorderingKey: false,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]
    ])
    input.expectsMediaDataInRealTime = false
    guard writer.canAdd(input) else { throw RunFilmFailure.unavailable }
    writer.add(input)
    // No audio input and no metadata copied from the source activity or any photo.
    writer.metadata = []
    let attributes: [String: Any] = [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
      kCVPixelBufferWidthKey as String: scene.width, kCVPixelBufferHeightKey as String: scene.height,
      kCVPixelBufferCGImageCompatibilityKey as String: true,
      kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
    ]
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: attributes)
    var complete = false
    defer { if !complete { writer.cancelWriting(); try? FileManager.default.removeItem(at: output) } }
    guard writer.startWriting() else { throw writer.error ?? RunFilmFailure.encodingFailed }
    writer.startSession(atSourceTime: .zero)
    let deadline = Date().addingTimeInterval(180)
    for frame in 0..<scene.frames {
      while !input.isReadyForMoreMediaData {
        if cancelled() { throw RunFilmFailure.cancelled }
        if Date() > deadline { throw RunFilmFailure.timeout }
        if writer.status == .failed { throw writer.error ?? RunFilmFailure.encodingFailed }
        Thread.sleep(forTimeInterval: 0.003)
      }
      if cancelled() { throw RunFilmFailure.cancelled }
      if Date() > deadline { throw RunFilmFailure.timeout }
      try autoreleasepool {
        var buffer: CVPixelBuffer?
        guard let pool = adaptor.pixelBufferPool, CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer) == kCVReturnSuccess, let buffer else { throw RunFilmFailure.encodingFailed }
        CVPixelBufferLockBaseAddress(buffer, [])
        defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
        guard let context = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: scene.width, height: scene.height, bitsPerComponent: 8,
          bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: CGColorSpaceCreateDeviceRGB(),
          bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue) else { throw RunFilmFailure.encodingFailed }
        draw(scene, frame: frame, context: context)
        guard adaptor.append(buffer, withPresentationTime: CMTime(value: Int64(frame), timescale: Int32(scene.fps))) else { throw writer.error ?? RunFilmFailure.encodingFailed }
      }
    }
    writer.endSession(atSourceTime: CMTime(value: Int64(scene.frames), timescale: Int32(scene.fps)))
    input.markAsFinished()
    let done = DispatchSemaphore(value: 0)
    writer.finishWriting { done.signal() }
    guard done.wait(timeout: .now() + 30) == .success else { throw RunFilmFailure.timeout }
    if cancelled() { throw RunFilmFailure.cancelled }
    let fileSize = (try? output.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
    guard writer.status == .completed, fileSize > 1024 else { throw writer.error ?? RunFilmFailure.encodingFailed }
    complete = true
  }
}
