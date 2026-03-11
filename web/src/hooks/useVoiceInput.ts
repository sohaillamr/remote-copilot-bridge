import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Universal voice-to-text hook using Web Speech API.
 * Works in:
 *  - Chrome, Edge, Opera, Brave (native SpeechRecognition)
 *  - VS Code Simple Browser (Chromium/Electron)
 *  - Cursor IDE (Chromium/Electron)
 *  - Any Chromium-based webview
 *
 * Falls back gracefully — `isSupported` will be false in Firefox/Safari.
 */

interface UseVoiceInputOptions {
  /** Language code, e.g. 'en-US', 'ar-EG'. Defaults to browser locale. */
  lang?: string
  /** Keep listening after pauses (true) or stop after one phrase (false). */
  continuous?: boolean
  /** Append transcript to existing text instead of replacing it. */
  appendMode?: boolean
  /** Called with the final transcript when recognition ends or a final result arrives. */
  onResult?: (transcript: string) => void
  /** Called when an error occurs. */
  onError?: (error: string) => void
}

interface UseVoiceInputReturn {
  /** Whether the browser supports speech recognition. */
  isSupported: boolean
  /** Whether the microphone is currently listening. */
  isListening: boolean
  /** The current (possibly interim) transcript text. */
  transcript: string
  /** Start listening. */
  startListening: () => void
  /** Stop listening. */
  stopListening: () => void
  /** Toggle listening on/off. */
  toggleListening: () => void
  /** Clear the transcript. */
  clearTranscript: () => void
}

// Detect support once
const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    lang,
    continuous = false,
    onResult,
    onError,
  } = options

  const SpeechRecognitionClass = getSpeechRecognition()
  const isSupported = SpeechRecognitionClass !== null

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const accumulatedRef = useRef('')
  const firedFinalRef = useRef(false)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ignore */ }
        recognitionRef.current = null
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!SpeechRecognitionClass || isListening) return

    const recognition = new SpeechRecognitionClass()
    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    if (lang) {
      recognition.lang = lang
    }

    accumulatedRef.current = ''
    firedFinalRef.current = false

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      if (finalTranscript) {
        accumulatedRef.current += (accumulatedRef.current ? ' ' : '') + finalTranscript.trim()
        setTranscript(accumulatedRef.current)
        firedFinalRef.current = true
        onResult?.(accumulatedRef.current)
      } else if (interimTranscript) {
        // Show interim text while still speaking
        const preview = accumulatedRef.current
          ? accumulatedRef.current + ' ' + interimTranscript
          : interimTranscript
        setTranscript(preview)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'aborted' is expected when we call stop()
      if (event.error !== 'aborted') {
        const msg =
          event.error === 'not-allowed'
            ? 'Microphone access denied. Please allow microphone permission.'
            : event.error === 'no-speech'
              ? 'No speech detected. Try again.'
              : event.error === 'network'
                ? 'Network error. Speech recognition requires an internet connection.'
                : `Speech error: ${event.error}`
        onError?.(msg)
      }
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
      // Fire final result on end ONLY if we haven't already fired via isFinal
      if (accumulatedRef.current && !firedFinalRef.current) {
        onResult?.(accumulatedRef.current)
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (err) {
      onError?.('Failed to start speech recognition.')
      setIsListening(false)
      recognitionRef.current = null
    }
  }, [SpeechRecognitionClass, isListening, continuous, lang, onResult, onError])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
    }
    setIsListening(false)
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    accumulatedRef.current = ''
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  }
}
