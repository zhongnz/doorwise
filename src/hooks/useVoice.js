import { useCallback, useEffect, useRef, useState } from 'react';

function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws/chat`;
}

export function useVoice(onEvent, options = {}) {
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

      // Connection timeout - fail fast if backend is unavailable
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          setLastError('Voice server unavailable. Running in demo mode - use text input instead.');
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
        setLastError('Voice server unavailable. Use text input in demo mode.');
        setConnectionState('error');
        stopMic();
      };

      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) {
          return;
        }

        if (pauseInputRef.current) {
          speechHangoverRef.current = 0;
          preRollFramesRef.current = [];
          return;
        }

        if (isPlayingRef.current) {
          speechHangoverRef.current = 0;
          preRollFramesRef.current = [];
          return;
        }

        const inputData = event.inputBuffer.getChannelData(0);
        let energy = 0;
        for (let index = 0; index < inputData.length; index += 1) {
          energy += inputData[index] * inputData[index];
        }

        const rms = Math.sqrt(energy / inputData.length);
        
        // Smooth audio level for UI visualization
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
  }, [onEvent, playNextAudio, stopMic]);

  const sendText = useCallback((text) => {
    const payload = text.trim();
    if (!payload) {
      return false;
    }

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
    isConnected,
    isSpeaking,
    isUserSpeaking,
    connectionState,
    lastError,
    audioLevel,
  };
}
