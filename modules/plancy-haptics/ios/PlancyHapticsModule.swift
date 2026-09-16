import CoreHaptics
import ExpoModulesCore
import UIKit

/// Plays plancy's haptic patterns.
///
/// expo-haptics creates window-less UIFeedbackGenerators, which play nothing
/// in an app built against the iOS 27 SDK with the scene life cycle. Core
/// Haptics has no such dependency, and it lets a celebration be a pattern
/// timed to its animation instead of a few preset taps.
///
/// A pattern arrives from JS as rows of [seconds, intensity, sharpness] for a
/// tap, or [seconds, intensity, sharpness, duration] for a sustained buzz.
public class PlancyHapticsModule: Module {
  private var engine: CHHapticEngine?

  private lazy var supportsHaptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics

  public func definition() -> ModuleDefinition {
    Name("PlancyHaptics")

    Function("isSupported") { () -> Bool in
      self.supportsHaptics
    }

    AsyncFunction("play") { (rows: [[Double]]) in
      self.play(rows)
    }
    .runOnQueue(.main)

    // A running engine in the background wastes power and gets stopped by
    // the system anyway; the next play starts a fresh one.
    OnAppEntersBackground {
      self.engine?.stop()
      self.engine = nil
    }
  }

  private func play(_ rows: [[Double]]) {
    guard !rows.isEmpty else { return }
    guard supportsHaptics else {
      playWithGenerators(rows)
      return
    }
    do {
      let engine = try runningEngine()
      let events = rows.compactMap { row -> CHHapticEvent? in
        guard row.count >= 3 else { return nil }
        let parameters = [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: Float(row[1])),
          CHHapticEventParameter(parameterID: .hapticSharpness, value: Float(row[2])),
        ]
        if row.count >= 4, row[3] > 0 {
          return CHHapticEvent(eventType: .hapticContinuous, parameters: parameters, relativeTime: row[0], duration: row[3])
        }
        return CHHapticEvent(eventType: .hapticTransient, parameters: parameters, relativeTime: row[0])
      }
      let pattern = try CHHapticPattern(events: events, parameters: [])
      try engine.makePlayer(with: pattern).start(atTime: CHHapticTimeImmediate)
    } catch {
      self.engine = nil
      playWithGenerators(rows)
    }
  }

  private func runningEngine() throws -> CHHapticEngine {
    if let engine { return engine }
    let engine = try CHHapticEngine()
    engine.playsHapticsOnly = true
    engine.isAutoShutdownEnabled = true
    engine.stoppedHandler = { [weak self] _ in self?.engine = nil }
    engine.resetHandler = { [weak self] in self?.engine = nil }
    try engine.start()
    self.engine = engine
    return engine
  }

  /// Devices without Core Haptics: approximate each tap with a feedback
  /// generator tied to the key window, which is what the scene life cycle needs.
  private func playWithGenerators(_ rows: [[Double]]) {
    let window = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }
    for row in rows where row.count >= 3 {
      let intensity = CGFloat(min(max(row[1], 0), 1))
      let style: UIImpactFeedbackGenerator.FeedbackStyle = row[2] > 0.6 ? .rigid : row[2] < 0.3 ? .soft : .medium
      DispatchQueue.main.asyncAfter(deadline: .now() + row[0]) {
        let generator: UIImpactFeedbackGenerator
        if #available(iOS 17.5, *), let window {
          generator = UIImpactFeedbackGenerator(style: style, view: window)
        } else {
          generator = UIImpactFeedbackGenerator(style: style)
        }
        generator.impactOccurred(intensity: intensity)
      }
    }
  }
}
