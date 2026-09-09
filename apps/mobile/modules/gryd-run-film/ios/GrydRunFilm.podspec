Pod::Spec.new do |s|
  s.name = 'GrydRunFilm'
  s.version = '1.0.0'
  s.summary = 'GRYD local activity-film encoder'
  s.description = 'Silent H.264 exports rendered from protected pixel-only activity scenes.'
  s.license = { :type => 'Proprietary' }
  s.author = 'GRYD'
  s.homepage = 'https://expo.dev'
  s.source = { :path => '.' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.4'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'CoreGraphics', 'CoreText', 'CoreVideo'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
