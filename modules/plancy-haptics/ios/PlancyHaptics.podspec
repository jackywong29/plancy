Pod::Spec.new do |s|
  s.name           = 'PlancyHaptics'
  s.version        = '1.0.0'
  s.summary        = 'Core Haptics patterns for plancy'
  s.description    = 'Plays plancy haptic patterns through Core Haptics'
  s.author         = 'Clancy'
  s.homepage       = 'https://clancyhq.com'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
