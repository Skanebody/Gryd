import Foundation
import AVFoundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

@main struct FilmSmoke {
  static func main() async throws {
    let scene = try JSONDecoder().decode(RunFilmScene.self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
    let output = URL(fileURLWithPath: CommandLine.arguments[2])
    try? FileManager.default.removeItem(at: output)
    let started = Date()
    try RunFilmEncoder.encode(scene: scene, output: output, cancelled: { false })
    let asset = AVURLAsset(url: output)
    let duration = try await asset.load(.duration)
    let tracks = try await asset.loadTracks(withMediaType: .video)
    guard let track = tracks.first else { fatalError("Missing video track") }
    let dimensions = try await track.load(.naturalSize)
    let formats = try await track.load(.formatDescriptions)
    let codec = CMFormatDescriptionGetMediaSubType(formats[0])
    let audio = try await asset.loadTracks(withMediaType: .audio)
    let metadata = try await asset.load(.metadata)
    let generator = AVAssetImageGenerator(asset: asset)
    generator.requestedTimeToleranceBefore = .zero; generator.requestedTimeToleranceAfter = .zero
    for second in [0, 3, 7] {
      let image = try await generator.image(at: CMTime(value: Int64(second), timescale: 1)).image
      let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: output.deletingPathExtension().path + "-frame-\(second).png") as CFURL, UTType.png.identifier as CFString, 1, nil)!
      CGImageDestinationAddImage(destination, image, nil); precondition(CGImageDestinationFinalize(destination))
    }
    let reader = try AVAssetReader(asset: asset)
    let readerOutput = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    reader.add(readerOutput); precondition(reader.startReading())
    var count = 0
    while readerOutput.copyNextSampleBuffer() != nil { count += 1 }
    FileHandle.standardError.write(Data("reader=\(reader.status.rawValue) duration=\(CMTimeGetSeconds(duration)) dimensions=\(dimensions) codec=\(codec) audio=\(audio.count) metadata=\(metadata.count) count=\(count)\n".utf8))
    precondition(reader.status == .completed)
    precondition(abs(CMTimeGetSeconds(duration) - 8) < 0.001)
    precondition(dimensions == CGSize(width: scene.width, height: scene.height))
    precondition(codec == kCMVideoCodecType_H264)
    precondition(audio.isEmpty && metadata.isEmpty)
    precondition(count == 240)
    let cancelledOutput = output.deletingLastPathComponent().appendingPathComponent("cancelled-" + output.lastPathComponent)
    var checks = 0
    do {
      try RunFilmEncoder.encode(scene: scene, output: cancelledOutput) { checks += 1; return checks > 30 }
      fatalError("Cancellation did not stop the encoder")
    } catch RunFilmFailure.cancelled {
      precondition(!FileManager.default.fileExists(atPath: cancelledOutput.path), "Cancelled export left a partial file")
    }
    print("PASS: H.264 MP4, \(dimensions), duration \(CMTimeGetSeconds(duration))s, \(count) frames, no audio, no asset metadata; cancellation removes partial output. Encoded in \(Date().timeIntervalSince(started))s. \(output.path)")
  }
}
