let audioContext = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}

function tone(context, frequency, startsAt, duration, type = 'sine', gain = 0.045) {
  const oscillator = context.createOscillator()
  const volume = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startsAt)
  volume.gain.setValueAtTime(0.0001, startsAt)
  volume.gain.exponentialRampToValueAtTime(gain, startsAt + 0.025)
  volume.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration)
  oscillator.connect(volume)
  volume.connect(context.destination)
  oscillator.start(startsAt)
  oscillator.stop(startsAt + duration + 0.03)
}

export function playAscendaSound(kind = 'reward', settings = {}) {
  if (!settings.sounds_enabled) return
  try {
    const context = getAudioContext()
    if (!context) return
    if (context.state === 'suspended') context.resume()
    const now = context.currentTime + 0.015
    if (kind === 'rank') {
      ;[392, 523, 659, 784].forEach((frequency, index) => tone(context, frequency, now + index * 0.1, 0.32, 'triangle', 0.052))
      return
    }
    if (kind === 'level') {
      ;[330, 440, 554, 659].forEach((frequency, index) => tone(context, frequency, now + index * 0.085, 0.26, 'sine', 0.047))
      return
    }
    if (kind === 'title') {
      ;[262, 392, 523, 784].forEach((frequency, index) => tone(context, frequency, now + index * 0.11, 0.34, 'triangle', 0.05))
      return
    }
    tone(context, 523, now, 0.2, 'sine', 0.035)
    tone(context, 659, now + 0.085, 0.24, 'triangle', 0.037)
  } catch {
    // El sonido es decorativo. Una restricción del navegador no debe bloquear acciones.
  }
}
