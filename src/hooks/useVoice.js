import { useCallback, useEffect, useRef, useState } from 'react';

function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws/chat`;
}

export function useVoice(onEvent, options = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionState, setConnectionState] = useState('idle');
  const [lastError, setLastError] = useState(null);

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const wsRef = useRef(null);

  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const pauseInputRef = useRef(Boolean(options.pauseInput));
  const onEventRef = useRef(onEvent);
  const noiseFloorRef = useRef(0.0035);
  const speechHangoverRef = useRef(0);

  useEffect(() => {
    pauseInputRef.current = Boolean(options.pauseInput);
  }, [options.pauseInput]);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

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
    noiseFloorRef.current = 0.0035;
    speechHangoverRef.current = 0;
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
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
      noiseFloorRef.current = 0.0035;
      speechHangoverRef.current = 0;

      const ws = new WebSocket(getWebSocketUrl());
      ws.binaryType = 'blob';
      wsRef.current = ws;

      ws.onopen = () => {
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
        setIsConnected(false);
        setConnectionState('idle');
        stopMic();
      };

      ws.onerror = () => {
        setLastError('Voice websocket failed to connect.');
        setConnectionState('error');
      };

      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) {
          return;
        }

        if (pauseInputRef.current) {
          return;
        }

        if (isPlayingRef.current) {
          return;
        }

        const inputData = event.inputBuffer.getChannelData(0);
        let energy = 0;
        for (let index = 0; index < inputData.length; index += 1) {
          energy += inputData[index] * inputData[index];
        }

        const rms = Math.sqrt(energy / inputData.length);
        const openThreshold = Math.max(0.0075, noiseFloorRef.current * 2.2);
        const closeThreshold = Math.max(0.0045, noiseFloorRef.current * 1.4);

        if (rms >= openThreshold) {
          speechHangoverRef.current = 6;
        } else if (speechHangoverRef.current > 0) {
          if (rms >= closeThreshold) {
            speechHangoverRef.current = 6;
          } else {
            speechHangoverRef.current -= 1;
          }
        } else {
          noiseFloorRef.current = (noiseFloorRef.current * 0.94) + (rms * 0.06);
          return;
        }

        const pcm16 = new Int16Array(inputData.length);

        for (let index = 0; index < inputData.length; index += 1) {
          const sample = Math.max(-1, Math.min(1, inputData[index]));
          pcm16[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        ws.send(pcm16.buffer);
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
    connectionState,
    lastError,
  };
}
