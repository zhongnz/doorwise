import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle2,
  Database,
  MapPin,
  Mic,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Video,
} from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import {
  agentRequestedVerification,
  buildVisitorClaimSummary,
  inferClaimFromVisitorTranscript,
  normalizeConversationText,
  terminalDecisions,
} from '../lib/claimIntake';
import './Dashboard.css';

const defaultTranscript = [{ role: 'agent', text: 'DoorWise is ready. Tell me who is here and why they need building access.' }];

const emptyBuildingContext = {
  building_name: '',
  management_phone: '',
  super_phone: '',
  approved_vendors: [],
};

const storageKeys = {
  address: 'doorwise_address',
  addressValidation: 'doorwise_address_validation',
  buildingContext: 'doorwise_building_context',
  incidents: 'doorwise_incidents',
};

const verdictIcons = {
  LISTENING: ShieldCheck,
  VERIFYING: Database,
  PROCEED_AFTER_ID_CHECK: ShieldCheck,
  CALL_TO_CONFIRM: ShieldAlert,
  DO_NOT_OPEN: ShieldX,
  UNKNOWN: ShieldAlert,
};

const decisionLabels = {
  LISTENING: 'Waiting',
  VERIFYING: 'Checking',
  PROCEED_AFTER_ID_CHECK: 'Proceed After ID Check',
  CALL_TO_CONFIRM: 'Call To Confirm',
  DO_NOT_OPEN: 'Do Not Open',
  UNKNOWN: 'Manual Review',
};

const mergeTranscriptText = (previousText, nextText) => {
  const current = previousText || '';
  const incoming = nextText || '';

  if (!current) {
    return incoming;
  }

  if (!incoming) {
    return current;
  }

  if (incoming.startsWith(current) || current.startsWith(incoming)) {
    return incoming.length >= current.length ? incoming : current;
  }

  if (current.endsWith(incoming)) {
    return current;
  }

  return `${current}${incoming}`;
};

const finalizeTranscriptMessages = (messages) => messages.map((message) => {
  if (message.finished === false) {
    return {
      ...message,
      finished: true,
    };
  }

  return message;
});

const loadStoredJson = (key, fallback) => {
  try {
    const keys = Array.isArray(key) ? key : [key];
    for (const candidate of keys) {
      const raw = localStorage.getItem(candidate);
      if (raw) {
        return JSON.parse(raw);
      }
    }
    return fallback;
  } catch (error) {
    return fallback;
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const lastAutoClaimSignatureRef = useRef('');
  const autoVerifyTimeoutRef = useRef(null);
  const terminalVoiceNoticeRef = useRef(false);

  const [address, setAddress] = useState(null);
  const [addressValidation, setAddressValidation] = useState(null);
  const [buildingContext, setBuildingContext] = useState(emptyBuildingContext);
  const [status, setStatus] = useState('LISTENING');
  const [transcript, setTranscript] = useState(defaultTranscript);
  const [currentClaim, setCurrentClaim] = useState('');
  const [claimInput, setClaimInput] = useState('');
  const [datasetResults, setDatasetResults] = useState([]);
  const [decisionReasoning, setDecisionReasoning] = useState('');
  const [recommendedScript, setRecommendedScript] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('');
  const [escalationContact, setEscalationContact] = useState('');
  const [matchedRecords, setMatchedRecords] = useState([]);
  const [confidence, setConfidence] = useState('');
  const [playbook, setPlaybook] = useState('');
  const [incidentLog, setIncidentLog] = useState([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const sessionLocked = terminalDecisions.includes(status);

  const appendTranscript = (message) => {
    setTranscript((previous) => {
      const isPartial = message.finished === false;
      const lastMessage = previous[previous.length - 1];

      if (isPartial && lastMessage && lastMessage.role === message.role && lastMessage.finished === false) {
        const updated = [...previous];
        updated[updated.length - 1] = {
          ...lastMessage,
          text: mergeTranscriptText(lastMessage.text, message.text),
          finished: false,
        };
        return updated;
      }

      if (
        message.finished === true
        && lastMessage
        && lastMessage.role === message.role
        && lastMessage.finished === false
      ) {
        const updated = [...previous];
        updated[updated.length - 1] = {
          ...lastMessage,
          text: mergeTranscriptText(lastMessage.text, message.text),
          finished: true,
        };
        return updated;
      }

      if (lastMessage && lastMessage.role === message.role && lastMessage.text === message.text) {
        return previous;
      }

      return [...previous, message];
    });
  };

  const { connect, disconnect, sendText, isConnected, isSpeaking, connectionState, lastError } = useVoice((event) => {
    if (event.kind === 'transcript') {
      if (sessionLocked && event.message.role === 'visitor') {
        return;
      }
      appendTranscript(event.message);
    }

    if (event.kind === 'error') {
      appendTranscript({ role: 'agent', text: `Voice error: ${event.text}` });
    }

    if (event.kind === 'turn_complete') {
      setTranscript((previous) => finalizeTranscriptMessages(previous));
    }
  }, { pauseInput: status === 'VERIFYING' || sessionLocked });

  const clearDecisionOutcome = () => {
    setStatus('LISTENING');
    setCurrentClaim('');
    setDatasetResults([]);
    setDecisionReasoning('');
    setRecommendedScript('');
    setRecommendedAction('');
    setEscalationContact('');
    setMatchedRecords([]);
    setConfidence('');
    setPlaybook('');
  };

  const resetSession = () => {
    if (autoVerifyTimeoutRef.current) {
      window.clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }

    lastAutoClaimSignatureRef.current = '';
    terminalVoiceNoticeRef.current = false;
    disconnect();
    setTranscript(defaultTranscript);
    setClaimInput('');
    clearDecisionOutcome();
  };

  useEffect(() => {
    const savedAddress = loadStoredJson(storageKeys.address, null);
    const savedValidation = loadStoredJson(storageKeys.addressValidation, null);

    if (!savedAddress) {
      navigate('/setup');
      return undefined;
    }

    setAddress(savedAddress);
    if (savedValidation) {
      setAddressValidation(savedValidation);
    }

    setBuildingContext(loadStoredJson(storageKeys.buildingContext, emptyBuildingContext));
    setIncidentLog(loadStoredJson(storageKeys.incidents, []));

    return () => {
      if (autoVerifyTimeoutRef.current) {
        window.clearTimeout(autoVerifyTimeoutRef.current);
      }
      disconnect();
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [disconnect, navigate]);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
        setCameraError('');
      } catch (error) {
        setCameraReady(false);
        setCameraError('Camera preview is unavailable. You can still verify visitors manually.');
      }
    };

    startCamera();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!cameraStreamRef.current || !videoRef.current) {
      return;
    }

    if (videoRef.current.srcObject !== cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }

    videoRef.current.play().catch(() => {
      setCameraError('Camera is connected, but the browser blocked autoplay. Tap the video area to resume it.');
    });
  }, [address, cameraReady]);

  useEffect(() => {
    if (!lastError) {
      return;
    }

    appendTranscript({ role: 'agent', text: `Voice connection issue: ${lastError}` });
  }, [lastError]);

  useEffect(() => {
    if (!sessionLocked) {
      terminalVoiceNoticeRef.current = false;
      return;
    }

    if (autoVerifyTimeoutRef.current) {
      window.clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }

    if (!isConnected) {
      return;
    }

    if (!terminalVoiceNoticeRef.current) {
      appendTranscript({
        role: 'agent',
        text: 'Final decision reached. Reset for the next visitor to resume intake.',
      });
      terminalVoiceNoticeRef.current = true;
    }

    disconnect();
  }, [disconnect, isConnected, sessionLocked]);

  useEffect(() => {
    if (!currentClaim || !terminalDecisions.includes(status)) {
      return;
    }

    if (typeof Notification === 'undefined' || notificationPermission !== 'granted') {
      return;
    }

    const title = `DoorWise ${decisionLabels[status] || status}`;
    const body = `${currentClaim} at ${address?.label || 'your door'}`;
    const notification = new Notification(title, { body });

    return () => notification.close();
  }, [address?.label, currentClaim, notificationPermission, status]);

  const saveIncident = (claim, response) => {
    const nextEntry = {
      timestamp: new Date().toISOString(),
      claim,
      decision: response.decision,
      playbook: response.playbook,
      reasoning: response.reasoning,
    };

    setIncidentLog((previous) => {
      const nextLog = [nextEntry, ...previous].slice(0, 6);
      localStorage.setItem(storageKeys.incidents[0], JSON.stringify(nextLog));
      return nextLog;
    });
  };

  const triggerVerification = async (claim) => {
    if (!address) {
      return;
    }

    setCurrentClaim(claim);
    setStatus('VERIFYING');
    setDatasetResults([]);
    setDecisionReasoning('');
    setRecommendedScript('');
    setRecommendedAction('');
    setEscalationContact('');
    setMatchedRecords([]);
    setConfidence('');
    setPlaybook('');
    appendTranscript({ role: 'agent', text: 'Checking building records and playbook steps now.' });

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          visitor_claim: claim,
          building_context: buildingContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Verification failed.');
      }

      const data = await response.json();
      setStatus(data.decision);
      setDatasetResults(data.datasets || []);
      setDecisionReasoning(data.reasoning || '');
      setRecommendedScript(data.recommended_script || '');
      setRecommendedAction(data.recommended_action || '');
      setEscalationContact(data.escalation_contact || '');
      setMatchedRecords(data.matched_records || []);
      setConfidence(data.confidence || '');
      setPlaybook(data.playbook || '');
      appendTranscript({ role: 'agent', text: data.recommended_action || data.reasoning });
      saveIncident(claim, data);
    } catch (error) {
      console.error('Backend API error:', error);
      setStatus('DO_NOT_OPEN');
      setDatasetResults([]);
      setDecisionReasoning('DoorWise could not reach the backend verification service.');
      setRecommendedScript('Please wait while I switch to manual review.');
      setRecommendedAction('Do not open until you verify the visitor by phone or visual ID.');
      setEscalationContact('No building callback number is configured.');
      setMatchedRecords([]);
      setConfidence('low');
      setPlaybook('manual-review');
      appendTranscript({ role: 'agent', text: 'DoorWise could not complete the verification request.' });
    }
  };

  useEffect(() => {
    if (!address || status !== 'LISTENING') {
      return;
    }

    const finalizedMessages = transcript.filter((message) => message.text && message.finished !== false);
    const visitorMessages = finalizedMessages
      .filter((message) => message.role === 'visitor')
      .map((message) => message.text);
    const visitorClaimSummary = buildVisitorClaimSummary(visitorMessages);
    const lastAgentMessage = [...finalizedMessages]
      .reverse()
      .find((message) => message.role === 'agent');

    const inferredClaim = inferClaimFromVisitorTranscript(visitorMessages);
    const voiceCompletionFingerprint = visitorClaimSummary
      ? `voice:${normalizeConversationText(visitorClaimSummary)}`
      : '';
    const shouldVerifyVoiceClaim = Boolean(
      lastAgentMessage
      && agentRequestedVerification(lastAgentMessage.text)
      && voiceCompletionFingerprint
      && lastAutoClaimSignatureRef.current !== voiceCompletionFingerprint,
    );
    const autoFingerprint = inferredClaim?.fingerprint;

    if (!shouldVerifyVoiceClaim && !inferredClaim) {
      return;
    }

    if (!shouldVerifyVoiceClaim && autoFingerprint && lastAutoClaimSignatureRef.current === autoFingerprint) {
      return;
    }

    if (autoVerifyTimeoutRef.current) {
      window.clearTimeout(autoVerifyTimeoutRef.current);
    }

    autoVerifyTimeoutRef.current = window.setTimeout(() => {
      if (shouldVerifyVoiceClaim) {
        lastAutoClaimSignatureRef.current = voiceCompletionFingerprint;
        setClaimInput(visitorClaimSummary);
        void triggerVerification(visitorClaimSummary);
        return;
      }

      if (inferredClaim) {
        lastAutoClaimSignatureRef.current = inferredClaim.fingerprint;
        setClaimInput(inferredClaim.claim);
        void triggerVerification(inferredClaim.claim);
      }
    }, 900);

    return () => {
      if (autoVerifyTimeoutRef.current) {
        window.clearTimeout(autoVerifyTimeoutRef.current);
      }
    };
  }, [address, status, transcript]);

  const handleClaimSubmit = async (event) => {
    event.preventDefault();
    if (sessionLocked) {
      return;
    }
    const claim = claimInput.trim();
    if (!claim) {
      return;
    }

    const visitorMessages = [
      ...transcript
        .filter((message) => message.role === 'visitor' && message.text && message.finished !== false)
        .map((message) => message.text),
      claim,
    ];
    const inferredClaim = inferClaimFromVisitorTranscript(visitorMessages);

    appendTranscript({ role: 'visitor', text: claim });
    lastAutoClaimSignatureRef.current = inferredClaim?.fingerprint || `manual:${normalizeConversationText(claim)}`;
    sendText(claim);
    setClaimInput('');
    await triggerVerification(claim);
  };

  const requestBrowserAlerts = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const resumeCameraPlayback = () => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.play().then(() => {
      setCameraError('');
    }).catch(() => {
      setCameraError('Camera playback is still blocked by the browser.');
    });
  };

  if (!address) {
    return null;
  }

  const VerdictIcon = verdictIcons[status] || ShieldAlert;
  const hasWeakAddressSignal = addressValidation && !addressValidation.is_valid;
  const hasCallbackContext = Boolean(
    buildingContext.management_phone
    || buildingContext.super_phone
    || buildingContext.approved_vendors?.length,
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header glass-panel">
        <div className="logo cursor-pointer" onClick={() => navigate('/')}>
          <ShieldCheck className="logo-icon" size={24} />
          <span className="logo-text">DoorWise</span>
        </div>

        <div className="address-badge">
          <MapPin size={16} className="text-blue-400" />
          {address.label || `${address.houseNumber} ${address.street}, ${address.borough}`}
        </div>

        <div className="system-status">
          <span className="pulse-dot green"></span>
          {connectionState === 'connected' ? 'Voice Linked' : 'Voice-First Verification'}
        </div>
      </div>

      {hasWeakAddressSignal ? (
        <div className="dashboard-banner warning">
          <AlertTriangle size={16} />
          <span>No matching city record was found during setup, so this address is running in manual-review mode.</span>
        </div>
      ) : null}

      {!hasCallbackContext ? (
        <div className="dashboard-banner">
          <Database size={16} />
          <span>Add management or super phone numbers in setup if you want callback-based decisions instead of public-data-only review.</span>
        </div>
      ) : null}

      {addressValidation?.datasets?.some((dataset) => dataset.status === 'unavailable') ? (
        <div className="dashboard-banner">
          <Database size={16} />
          <span>Some NYC datasets are temporarily unavailable, so decisions may use fewer data sources.</span>
        </div>
      ) : null}

      <div className="dashboard-main">
        <div className="panel camera-panel glass-panel">
          <div className="panel-header">
            <Video size={18} />
            <span>Door Camera Preview</span>
            {cameraReady ? <span className="badge-analyzing">Live</span> : null}
          </div>
          <div className="camera-feed" onClick={resumeCameraPlayback}>
            {cameraReady ? <video ref={videoRef} autoPlay muted playsInline className="camera-video" /> : <div className="camera-bg"></div>}
            <div className="vision-overlay">
              <div className="bounding-box">
                <span className="label">{cameraReady ? 'Visitor detected' : 'Camera offline'}</span>
              </div>
            </div>
            <div className="feed-timestamp">{new Date().toLocaleTimeString()} • Front Door</div>
          </div>
          {cameraError ? <div className="panel-note">{cameraError}</div> : null}
        </div>

        <div className="panel transcript-panel glass-panel">
          <div className="panel-header split-header">
            <div className="header-title">
              <Mic size={18} />
              <span>Conversation + Claim Intake</span>
            </div>
            <div className="header-actions">
              {sessionLocked ? (
                <button onClick={resetSession} className="status-button ghost">
                  <RotateCcw size={14} />
                  Next Visitor
                </button>
              ) : !isConnected ? (
                <button onClick={connect} className="status-button success">
                  Connect Voice
                </button>
              ) : (
                <button onClick={disconnect} className="status-button ghost">
                  Disconnect Voice
                </button>
              )}
            </div>
          </div>

          <div className="transcript-area">
            {transcript.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`msg-bubble ${message.role}`}>
                <div className="msg-sender">{message.role === 'agent' ? 'DoorWise' : 'Visitor'}</div>
                <div className="msg-text">{message.text}</div>
              </div>
            ))}
          </div>

          <div className="audio-visualizer">
            {[0, 1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                className={`bar ${isConnected || isSpeaking ? 'active' : ''}`}
                style={{ animationDelay: `${bar * 0.1}s` }}
              ></div>
            ))}
          </div>

          <form className="claim-form" onSubmit={handleClaimSubmit}>
            <label htmlFor="claimInput">Visitor claim</label>
            <div className="claim-input-row">
              <input
                id="claimInput"
                value={claimInput}
                onChange={(event) => setClaimInput(event.target.value)}
                placeholder="e.g. Management is here for an apartment inspection"
                disabled={sessionLocked}
              />
              <button type="submit" className="btn-primary" disabled={sessionLocked}>
                {sessionLocked ? 'Reset First' : 'Verify'} {!sessionLocked ? <Send size={16} /> : null}
              </button>
            </div>
            <div className="claim-helper">
              {sessionLocked
                ? 'This session is complete. Reset for the next visitor before collecting a new claim.'
                : 'Voice is the primary DoorWise experience. Text stays available when the mic is unavailable, the room is noisy, or the live connection drops.'}
            </div>
          </form>
        </div>

        <div className="panel verdict-panel glass-panel">
          <div className="panel-header">
            <Activity size={18} />
            <span>Decision + Next Action</span>
          </div>

          <div className="verdict-content">
            <div className={`verdict-card ${status.toLowerCase()}`}>
              <div className={`verdict-icon ${status === 'VERIFYING' ? 'pulse' : ''}`}>
                <VerdictIcon size={48} />
              </div>
              <h2>{decisionLabels[status] || status}</h2>
              {currentClaim ? <p>Claim: {currentClaim}</p> : <p>Waiting for a supported building-access claim.</p>}
            </div>

            <div className="decision-meta">
              <span className="meta-pill">{playbook || 'manual-review'}</span>
              <span className="meta-pill">{confidence || 'pending'} confidence</span>
            </div>

            <div className="alert-controls">
              <button onClick={requestBrowserAlerts} className="btn-secondary">
                {notificationPermission === 'granted' ? <BellRing size={16} /> : <Bell size={16} />}
                {notificationPermission === 'granted' ? 'Browser Alerts Enabled' : 'Enable Browser Alerts'}
              </button>
            </div>

            <div className="action-grid">
              <div className="action-card">
                <strong>Why</strong>
                <p>{decisionReasoning || 'Submit a claim to see the reasoning.'}</p>
              </div>

              <div className="action-card">
                <strong>What To Say</strong>
                <p>{recommendedScript || 'DoorWise will suggest a short script after verification.'}</p>
              </div>

              <div className="action-card">
                <strong>What To Do</strong>
                <p>{recommendedAction || 'DoorWise will tell you the next action after verification.'}</p>
              </div>

              <div className="action-card">
                <strong>Who To Call</strong>
                <p>{escalationContact || 'No building callback number is configured yet.'}</p>
              </div>
            </div>

            <div className="nyc-data-section">
              <h3>Supporting Records</h3>
              {matchedRecords.length ? (
                <div className="detail-stack">
                  {matchedRecords.map((record, index) => (
                    <div className="detail-card" key={`${record.dataset}-${index}`}>
                      <strong>{record.dataset}</strong>
                      <div className="detail-inline">
                        {Object.entries(record.fields || {}).map(([key, value]) => (
                          <span key={key}>{key}: {String(value)}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No matching records were attached to the latest decision.</div>
              )}
            </div>

            <div className="nyc-data-section">
              <h3>NYC Open Data Checks</h3>
              {datasetResults.length ? (
                datasetResults.map((dataset) => (
                  <div className="data-row" key={dataset.key}>
                    <div className="data-label">{dataset.label}</div>
                    <div className={`data-status ${dataset.status === 'ok' ? 'done' : 'alert'}`}>
                      {dataset.status === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      {dataset.status === 'ok' ? `${dataset.count} record(s)` : dataset.error || 'Unavailable'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">Submit a claim to populate the city data checks.</div>
              )}
            </div>

            <div className="nyc-data-section">
              <h3>Recent Incidents</h3>
              {incidentLog.length ? (
                <div className="detail-stack">
                  {incidentLog.map((item, index) => (
                    <div className="detail-card" key={`${item.timestamp}-${index}`}>
                      <strong>{decisionLabels[item.decision] || item.decision}</strong>
                      <p>{item.claim}</p>
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">The incident log will start after the first verification run.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
