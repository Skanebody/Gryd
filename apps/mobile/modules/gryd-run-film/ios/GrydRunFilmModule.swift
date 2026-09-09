import ExpoModulesCore
import Foundation
import AVFoundation

public final class GrydRunFilmModule: Module {
  private let lock = NSLock()
  private var activeJob: String?
  private var cancelledJobs = Set<String>()
  private let encoderQueue = DispatchQueue(label: "gryd.film.encoder", qos: .userInitiated)
  private var directory: URL { FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("gryd-films", isDirectory: true) }

  public func definition() -> ModuleDefinition {
    Name("GrydRunFilm")
    AsyncFunction("isAvailableAsync") { (width: Int, height: Int) -> Bool in
      guard width == 1080, [1080, 1350, 1920].contains(height) else { return false }
      let destination = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".mp4")
      guard let writer = try? AVAssetWriter(outputURL: destination, fileType: .mp4) else { return false }
      return writer.canApply(outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height], forMediaType: .video)
    }
    Function("cancel") { (job: String) in
      self.lock.lock(); self.cancelledJobs.insert(job); self.lock.unlock()
    }
    AsyncFunction("generateAsync") { (job: String, json: String) -> [String: Any] in
      guard job.range(of: "^[a-zA-Z0-9-]{1,80}$", options: .regularExpression) != nil, json.utf8.count <= 2_000_000 else { return ["ok": false, "reason": "invalid_input"] }
      self.lock.lock()
      if self.activeJob != nil { self.lock.unlock(); return ["ok": false, "reason": "busy"] }
      self.activeJob = job
      self.lock.unlock()
      defer { self.lock.lock(); self.activeJob = nil; self.cancelledJobs.remove(job); self.lock.unlock() }
      let output = self.directory.appendingPathComponent("gryd-film-\(job).mp4")
      do {
        try FileManager.default.createDirectory(at: self.directory, withIntermediateDirectories: true)
        self.removeExpiredFiles()
        let scene = try JSONDecoder().decode(RunFilmScene.self, from: Data(json.utf8))
        try RunFilmEncoder.encode(scene: scene, output: output) {
          self.lock.lock(); defer { self.lock.unlock() }; return self.cancelledJobs.contains(job)
        }
        return ["ok": true, "uri": output.absoluteString, "width": scene.width, "height": scene.height, "durationMs": 8000, "mimeType": "video/mp4"]
      } catch {
        try? FileManager.default.removeItem(at: output)
        let reason: String
        switch error {
        case RunFilmFailure.cancelled: reason = "cancelled"
        case RunFilmFailure.invalidInput: reason = "invalid_input"
        case RunFilmFailure.unavailable: reason = "encoder_unavailable"
        case RunFilmFailure.timeout: reason = "timeout"
        default: reason = "encoding_failed"
        }
        return ["ok": false, "reason": reason]
      }
    }.runOnQueue(encoderQueue)
    AsyncFunction("releaseAsync") { (uri: String) in
      guard let url = URL(string: uri), url.isFileURL,
        url.standardizedFileURL.deletingLastPathComponent() == self.directory.standardizedFileURL,
        url.lastPathComponent.hasPrefix("gryd-film-"), url.pathExtension == "mp4" else { return }
      try? FileManager.default.removeItem(at: url)
    }
  }
  private func removeExpiredFiles() {
    let cutoff = Date().addingTimeInterval(-86400)
    for file in (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.contentModificationDateKey])) ?? [] {
      if file.lastPathComponent.hasPrefix("gryd-film-"), let date = try? file.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate, date < cutoff { try? FileManager.default.removeItem(at: file) }
    }
  }
}
