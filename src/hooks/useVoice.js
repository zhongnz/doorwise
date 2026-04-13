import { useCallback, useEffect, useRef, useState } from 'react';

// Check if we should use WebSocket backend or browser Speech API
const USE_BROWSER_SPEECH = !import.meta.env.VITE_ENABLE_PROXY;

function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws/chat`;
}

/**
 * Browser-based voice using Web Speech API
 */
function useBrowserVoice(onEvent) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [connectionState, setConnectionState] = useState('idle');
  const [lastError, setLastError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const onEventRef = useRef(onEvent);
  const isListeningRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Debouncing for final transcripts - accumulate and wait for pause
  const pendingTranscriptRef = useRef('');
  const debounceTimerRef = useRef(null);
  const DEBOUNCE_MS = 1200; // Wait 1.2 seconds of silence before processing

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // Speak text using Web Speech Synthesis
  const speak = useCallback((text) => {
    if (!text || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to use a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Samantha') || 
      v.name.includes('Google') || 
      v.name.includes('Microsoft') ||
      v.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    // Pause recognition while speaking to prevent echo
    utterance.onstart = () => {
      setIsSpeaking(true);
      // Stop recognition to prevent picking up our own voice
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      // Resume recognition after speaking
      if (isListeningRef.current && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // Already started
          }
        }, 300); // Small delay to avoid catching tail end of speech
      }
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      // Resume recognition on error too
      if (isListeningRef.current && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // Already started
          }
        }, 300);
      }
    };
    
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Monitor audio levels for visualization
  const startAudioMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(1, average / 128);
        setAudioLevel(normalized);
        
        if (normalized > 0.15) {
          setIsUserSpeaking(true);
        } else {
          setIsUserSpeaking(false);
        }
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (err) {
      console.error('Audio monitoring failed:', err);
    }
  }, []);

  const stopAudioMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const disconnect = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingTranscriptRef.current = '';
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    window.speechSynthesis?.cancel();
    stopAudioMonitoring();
    isListeningRef.current = false;
    setIsConnected(false);
    setConnectionState('idle');
    setIsSpeaking(false);
    setIsUserSpeaking(false);
  }, [stopAudioMonitoring]);

  const connect = useCallback(async () => {
    setConnectionState('connecting');
    setLastError(null);

    // Check for Speech Recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setLastError('Speech recognition not supported in this browser. Try Chrome or Edge.');
      setConnectionState('error');
      return;
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start audio monitoring for visualization
      await startAudioMonitoring();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsConnected(true);
        setConnectionState('connected');
        
        // Welcome message
        onEventRef.current?.({ 
          kind: 'transcript', 
          message: { role: 'agent', text: 'Voice connected! I\'m listening. Tell me who is at the door.' }
        });
        speak('Voice connected. Tell me who is at the door.');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Show current state (pending + interim)
        const displayText = (pendingTranscriptRef.current + ' ' + (interimTranscript || finalTranscript)).trim();
        if (displayText) {
          onEventRef.current?.({ 
            kind: 'transcript', 
            message: { role: 'visitor', text: displayText, isPartial: true }
          });
        }

        // Accumulate final results
        if (finalTranscript) {
          pendingTranscriptRef.current = (pendingTranscriptRef.current + ' ' + finalTranscript).trim();
          
          // Clear any existing debounce timer
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          
          // Start debounce timer - process claim after silence
          debounceTimerRef.current = setTimeout(() => {
            const fullClaim = pendingTranscriptRef.current.trim();
            if (fullClaim) {
              // Show final transcript
              onEventRef.current?.({ 
                kind: 'transcript', 
                message: { role: 'visitor', text: fullClaim }
              });
              // Send as claim for verification
              onEventRef.current?.({ 
                kind: 'visitor_claim', 
                text: fullClaim 
              });
              // Clear pending
              pendingTranscriptRef.current = '';
            }
            debounceTimerRef.current = null;
          }, DEBOUNCE_MS);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setLastError('Microphone access denied. Please allow microphone access.');
          setConnectionState('error');
          disconnect();
        } else if (event.error === 'no-speech') {
          // Restart recognition if no speech detected
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // Already started
            }
          }
        }
      };

      recognition.onend = () => {
        // Auto-restart if still connected
        if (isListeningRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Already started or stopped
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err) {
      console.error('Voice connection failed:', err);
      setLastError(err.message || 'Could not access microphone.');
      setConnectionState('error');
      disconnect();
    }
  }, [disconnect, speak, startAudioMonitoring]);

  // Expose speak function for external use
  const speakResponse = useCallback((text) => {
    speak(text);
  }, [speak]);

  return {
    connect,
    disconnect,
    sendText: () => false, // Not used in browser mode - claims go through recognition
    speakResponse,
    isConnected,
    isSpeaking,
    isUserSpeaking,
    connectionState,
    lastError,
    audioLevel,
  };
}

/**
 * WebSocket-based voice for backend connection
 */
function useWebSocketVoice(onEvent, options = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [connectionState, setConnectionState] = useState('idle');
  const [lastError, setLastError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const wsRef = useRef(null);

  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const pauseInputRef = useRef(Boolean(options.pauseInput));
  const onEventRef = useRef(onEvent);
  const initialContextRef = useRef(options.initialContext || '');
  const noiseFloorRef = useRef(0.0025);
  const speechHangoverRef = useRef(0);
  const preRollFramesRef = useRef([]);
  const warmupFramesRef = useRef(0);
  const audioLevelSmoothRef = useRef(0);

  useEffect(() => {
    pauseInputRef.current = Boolean(options.pauseInput);
  }, [options.pauseInput]);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    initialContextRef.current = options.initialContext || '';
  }, [options.initialContext]);

  const stopMic = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
  }, []);

  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext) {
      audioQueueRef.current = [];
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);

    const arrayBuffer = audioQueueRef.current.shift();

    try {
      const int16 = new Int16Array(arrayBuffer);
      const float32 = new Float32Array(int16.length);

      for (let index = 0; index < int16.length; index += 1) {
        float32[index] = int16[index] / 32768.0;
      }

      const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        isPlayingRef.current = false;
        setIsSpeaking(false);
        playNextAudio();
      };
      source.start();
    } catch (error) {
      console.error('Playback error', error);
      isPlayingRef.current = false;
      setIsSpeaking(false);
      playNextAudio();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    noiseFloorRef.current = 0.0025;
    speechHangoverRef.current = 0;
    preRollFramesRef.current = [];
    warmupFramesRef.current = 0;
    setIsSpeaking(false);
    setIsConnected(false);
    setConnectionState('idle');
    stopMic();
  }, [stopMic]);

  const connect = useCallback(async () => {
    setConnectionState('connecting');
    setLastError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      await audioContext.resume().catch(() => {});
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;
      noiseFloorRef.current = 0.0025;
      speechHangoverRef.current = 0;
      preRollFramesRef.current = [];
      warmupFramesRef.current = 24;

      const ws = new WebSocket(getWebSocketUrl());
      ws.binaryType = 'blob';
      wsRef.current = ws;

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          setLastError('Voice server unavailable.');
          setConnectionState('error');
          stopMic();
        }
      }, 3000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        const initialContext = initialContextRef.current.trim();
        if (initialContext) {
          ws.send(JSON.stringify({ type: 'init', text: initialContext }));
        }
        setIsConnected(true);
        setConnectionState('connected');
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data);

          if (data.type === 'text') {
            onEventRef.current?.({ kind: 'transcript', message: data });
          } else if (data.type === 'error') {
            setLastError(data.text);
            setConnectionState('error');
            onEventRef.current?.({ kind: 'error', text: data.text });
          } else if (data.type === 'turn_complete') {
            onEventRef.current?.({ kind: 'turn_complete' });
          }
          return;
        }

        const arrayBuffer = await event.data.arrayBuffer();
        audioQueueRef.current.push(arrayBuffer);
        playNextAudio();
      };

      ws.onclose = () => {
        clearTimeout(connectionTimeout);
        setIsConnected(false);
        setConnectionState('idle');
        stopMic();
      };

      ws.onerror = () => {
        clearTimeout(connectionTimeout);
        setLastError('Voice server unavailable.');
        setConnectionState('error');
        stopMic();
      };

      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        if (pauseInputRef.current) return;
        if (isPlayingRef.current) return;

        const inputData = event.inputBuffer.getChannelData(0);
        let energy = 0;
        for (let index = 0; index < inputData.length; index += 1) {
          energy += inputData[index] * inputData[index];
        }

        const rms = Math.sqrt(energy / inputData.length);
        
        audioLevelSmoothRef.current = (audioLevelSmoothRef.current * 0.7) + (rms * 0.3);
        const normalizedLevel = Math.min(1, audioLevelSmoothRef.current / 0.15);
        setAudioLevel(normalizedLevel);
        
        const pcm16 = new Int16Array(inputData.length);

        for (let index = 0; index < inputData.length; index += 1) {
          const sample = Math.max(-1, Math.min(1, inputData[index]));
          pcm16[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        const frameBuffer = pcm16.buffer.slice(0);
        const warmupActive = warmupFramesRef.current > 0;
        const openThreshold = Math.max(warmupActive ? 0.0038 : 0.0052, noiseFloorRef.current * (warmupActive ? 1.55 : 1.95));
        const closeThreshold = Math.max(warmupActive ? 0.0026 : 0.0036, noiseFloorRef.current * (warmupActive ? 1.12 : 1.28));
        const enteringSpeech = rms >= openThreshold && speechHangoverRef.current === 0;

        if (rms >= openThreshold) {
          speechHangoverRef.current = warmupActive ? 10 : 8;
          setIsUserSpeaking(true);
        } else if (speechHangoverRef.current > 0) {
          if (rms >= closeThreshold) {
            speechHangoverRef.current = warmupActive ? 10 : 8;
          } else {
            speechHangoverRef.current -= 1;
          }
        } else {
          noiseFloorRef.current = (noiseFloorRef.current * 0.92) + (rms * 0.08);
          preRollFramesRef.current.push(frameBuffer);
          if (preRollFramesRef.current.length > 5) {
            preRollFramesRef.current.shift();
          }
          if (warmupFramesRef.current > 0) {
            warmupFramesRef.current -= 1;
          }
          setIsUserSpeaking(false);
          return;
        }

        if (enteringSpeech && preRollFramesRef.current.length) {
          preRollFramesRef.current.forEach((buffer) => ws.send(buffer));
        }
        preRollFramesRef.current = [];
        ws.send(frameBuffer);

        if (warmupFramesRef.current > 0) {
          warmupFramesRef.current -= 1;
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (error) {
      console.error('Voice connection failed:', error);
      setLastError(error.message || 'Microphone access failed.');
      setConnectionState('error');
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      stopMic();
      setIsConnected(false);
      setIsSpeaking(false);
    }
  }, [playNextAudio, stopMic]);

  const sendText = useCallback((text) => {
    const payload = text.trim();
    if (!payload) return false;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'visitor_claim', text: payload }));
      return true;
    }
    return false;
  }, []);

  return {
    connect,
    disconnect,
    sendText,
    speakResponse: () => {}, // No-op for WebSocket mode
    isConnected,
    isSpeaking,
    isUserSpeaking,
    connectionState,
    lastError,
    audioLevel,
  };
}

/**
 * Main voice hook - automatically selects browser or WebSocket implementation
 */
export function useVoice(onEvent, options = {}) {
  if (USE_BROWSER_SPEECH) {
    return useBrowserVoice(onEvent);
  }
  return useWebSocketVoice(onEvent, options);
}
