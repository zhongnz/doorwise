import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BellRing,
  ChevronDown,
  Database,
  MapPin,
  Mic,
  Send,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import {
  agentRequestedIdReview,
  agentRequestedVerification,
  buildVisitorClaimSummary,
  inferClaimFromVisitorTranscript,
  normalizeConversationText,
  terminalDecisions,
} from '../lib/claimIntake';
import {
  DECISION_STATUS,
  DECISION_LABELS,
  DECISION_ICONS,
  DEFAULT_TRANSCRIPT,
  EMPTY_BUILDING_CONTEXT,
  STORAGE_KEYS,
  API_ENDPOINTS,
} from '../lib/constants';
import { Button, Badge, Card, Alert, Spinner } from '../components/common';
import {
  VoiceVisualizer,
  ConnectionStatus,
  TranscriptBubble,
  DecisionCard,
  ActionGrid,
  IdReviewCard,
  DataChecks,
  IncidentItem,
  CameraPanel,
} from '../components/dashboard';
import './Dashboard.css';

// Helper functions
const loadStoredJson = (key, fallback) => {
  try {
    const keys = Array.isArray(key) ? key : [key];
    for (const candidate of keys) {
      const raw = localStorage.getItem(candidate);
      if (raw) return JSON.parse(raw);
    }
    return fallback;
  } catch {
    return fallback;
  }
};

const abbreviationForText = (value = '') =>
  normalizeConversationText(value)
    .split(' ')
    .filter((word) => word && !['of', 'the', 'and'].includes(word))
    .map((word) => word[0])
    .join('');

const findTrustedOrganizationCandidate = (claimText, organizations = []) => {
  const normalizedClaim = normalizeConversationText(claimText);
  if (!normalizedClaim) return '';

  for (const org of organizations) {
    const normalizedOrg = normalizeConversationText(org);
    const orgAbbrev = abbreviationForText(org);
    if (
      (normalizedOrg && normalizedClaim.includes(normalizedOrg)) ||
      (orgAbbrev && normalizedClaim.includes(orgAbbrev))
    ) {
      return org;
    }
  }
  return '';
};

const mergeTranscriptText = (prev, next) => {
  if (!prev) return next || '';
  if (!next) return prev;
  if (next.startsWith(prev) || prev.startsWith(next)) {
    return next.length >= prev.length ? next : prev;
  }
  if (prev.endsWith(next)) return prev;
  return `${prev}${next}`;
};

const finalizeTranscriptMessages = (messages) =>
  messages.map((msg) =>
    msg.finished === false ? { ...msg, finished: true } : msg
  );

const buildVoiceContext = (address, buildingContext) => {
  const trustedOrgs = (buildingContext?.trusted_id_organizations || []).filter(Boolean);
  const approvedVendors = (buildingContext?.approved_vendors || []).filter(Boolean);
  const parts = ['System note for DoorWise only. Use this silently and do not read it aloud.'];

  if (address?.label) parts.push(`Building address: ${address.label}.`);
  if (buildingContext?.building_name) parts.push(`Building name: ${buildingContext.building_name}.`);
  if (trustedOrgs.length) {
    parts.push(`Trusted organizations allowed by visible ID policy: ${trustedOrgs.join(', ')}.`);
    parts.push('If a visitor says they are from one of those organizations, ask them to hold that ID to the camera.');
  }
  if (approvedVendors.length) {
    parts.push(`Approved vendors on file: ${approvedVendors.join(', ')}.`);
  }

  return parts.join(' ');
};

const Dashboard = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const idFileInputRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const lastAutoClaimRef = useRef('');
  const autoVerifyTimeoutRef = useRef(null);
  const terminalNoticeRef = useRef(false);
  const transcriptEndRef = useRef(null);

  // Core state
  const [address, setAddress] = useState(null);
  const [addressValidation, setAddressValidation] = useState(null);
  const [buildingContext, setBuildingContext] = useState(EMPTY_BUILDING_CONTEXT);
  const [status, setStatus] = useState(DECISION_STATUS.LISTENING);
  const [transcript, setTranscript] = useState(DEFAULT_TRANSCRIPT);
  const [currentClaim, setCurrentClaim] = useState('');
  const [claimInput, setClaimInput] = useState('');

  // Decision state
  const [datasetResults, setDatasetResults] = useState([]);
  const [decisionReasoning, setDecisionReasoning] = useState('');
  const [recommendedScript, setRecommendedScript] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('');
  const [escalationContact, setEscalationContact] = useState('');
  const [matchedRecords, setMatchedRecords] = useState([]);
  const [confidence, setConfidence] = useState('');
  const [playbook, setPlaybook] = useState('');

  // UI state
  const [incidentLog, setIncidentLog] = useState([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [idReview, setIdReview] = useState(null);
  const [idReviewState, setIdReviewState] = useState('idle');
  const [idReviewError, setIdReviewError] = useState('');
  const [idReviewPrompt, setIdReviewPrompt] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );

  const sessionLocked = terminalDecisions.includes(status);
  const voiceContext = buildVoiceContext(address, buildingContext);

  // Transcript management
  const appendTranscript = useCallback((message) => {
    setTranscript((prev) => {
      const isPartial = message.finished === false;
      const last = prev[prev.length - 1];

      if (isPartial && last?.role === message.role && last?.finished === false) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          text: mergeTranscriptText(last.text, message.text),
          finished: false,
        };
        return updated;
      }

      if (message.finished === true && last?.role === message.role && last?.finished === false) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          text: mergeTranscriptText(last.text, message.text),
          finished: true,
        };
        return updated;
      }

      if (last?.role === message.role && last?.text === message.text) {
        return prev;
      }

      return [...prev, message];
    });
  }, []);

  // Voice hook
  const { connect, disconnect, sendText, isConnected, isSpeaking, connectionState, lastError } = useVoice(
    (event) => {
      if (event.kind === 'transcript') {
        if (sessionLocked && event.message.role === 'visitor') return;
        appendTranscript(event.message);
      }
      if (event.kind === 'error') {
        appendTranscript({ role: 'agent', text: `Voice error: ${event.text}` });
      }
      if (event.kind === 'turn_complete') {
        setTranscript((prev) => finalizeTranscriptMessages(prev));
      }
    },
    { pauseInput: status === DECISION_STATUS.VERIFYING || sessionLocked, initialContext: voiceContext }
  );

  // Reset functions
  const clearDecision = useCallback(() => {
    setStatus(DECISION_STATUS.LISTENING);
    setCurrentClaim('');
    setDatasetResults([]);
    setDecisionReasoning('');
    setRecommendedScript('');
    setRecommendedAction('');
    setEscalationContact('');
    setMatchedRecords([]);
    setConfidence('');
    setPlaybook('');
    setIdReview(null);
    setIdReviewError('');
    setIdReviewState('idle');
    setIdReviewPrompt('');
  }, []);

  const resetSession = useCallback(() => {
    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }
    lastAutoClaimRef.current = '';
    terminalNoticeRef.current = false;
    disconnect();
    setTranscript(DEFAULT_TRANSCRIPT);
    setClaimInput('');
    clearDecision();
  }, [disconnect, clearDecision]);

  // Verification
  const triggerVerification = useCallback(async (claim) => {
    if (!address) return;

    setCurrentClaim(claim);
    setStatus(DECISION_STATUS.VERIFYING);
    setDatasetResults([]);
    setDecisionReasoning('');
    setRecommendedScript('');
    setRecommendedAction('');
    setEscalationContact('');
    setMatchedRecords([]);
    setConfidence('');
    setPlaybook('');
    appendTranscript({ role: 'agent', text: 'Checking building records now.' });

    try {
      const response = await fetch(API_ENDPOINTS.VERIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          visitor_claim: claim,
          building_context: buildingContext,
        }),
      });

      if (!response.ok) throw new Error('Verification failed.');

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
      setIdReviewPrompt(
        data.playbook === 'trusted-id'
          ? 'DoorWise needs a clear ID image to complete this trusted-organization decision.'
          : ''
      );
      appendTranscript({ role: 'agent', text: data.recommended_action || data.reasoning });

      // Save incident
      const incident = {
        timestamp: new Date().toISOString(),
        claim,
        decision: data.decision,
        playbook: data.playbook,
        reasoning: data.reasoning,
      };
      setIncidentLog((prev) => {
        const next = [incident, ...prev].slice(0, 50);
        localStorage.setItem(STORAGE_KEYS.incidents, JSON.stringify(next));
        return next;
      });
    } catch (error) {
      setStatus(DECISION_STATUS.DO_NOT_OPEN);
      setDecisionReasoning('Could not reach the verification service.');
      setRecommendedScript('Please wait while I switch to manual review.');
      setRecommendedAction('Do not open until you verify by phone or visual ID.');
      setEscalationContact('No building callback number is configured.');
      setConfidence('low');
      setPlaybook('manual-review');
      appendTranscript({ role: 'agent', text: 'Verification service unavailable. Defaulting to manual review.' });
    }
  }, [address, buildingContext, appendTranscript]);

  // Effects
  useEffect(() => {
    const savedAddress = loadStoredJson(STORAGE_KEYS.address, null);
    const savedValidation = loadStoredJson(STORAGE_KEYS.addressValidation, null);

    if (!savedAddress) {
      navigate('/setup');
      return;
    }

    setAddress(savedAddress);
    if (savedValidation) setAddressValidation(savedValidation);
    setBuildingContext(loadStoredJson(STORAGE_KEYS.buildingContext, EMPTY_BUILDING_CONTEXT));
    setIncidentLog(loadStoredJson(STORAGE_KEYS.incidents, []));

    return () => {
      if (autoVerifyTimeoutRef.current) clearTimeout(autoVerifyTimeoutRef.current);
      disconnect();
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [disconnect, navigate]);

  // Camera setup
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        cameraStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraReady(true);
        setCameraError('');
      } catch {
        setCameraReady(false);
        setCameraError('Camera unavailable. You can still verify visitors manually.');
      }
    };

    startCamera();
    return () => { mounted = false; };
  }, []);

  // Sync camera stream
  useEffect(() => {
    if (!cameraStreamRef.current || !videoRef.current) return;
    if (videoRef.current.srcObject !== cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
    videoRef.current.play().catch(() => {
      setCameraError('Camera blocked by browser. Tap to resume.');
    });
  }, [address, cameraReady]);

  // Voice error handling
  useEffect(() => {
    if (lastError) {
      appendTranscript({ role: 'agent', text: `Voice issue: ${lastError}` });
    }
  }, [lastError, appendTranscript]);

  // Session lock handling
  useEffect(() => {
    if (!sessionLocked) {
      terminalNoticeRef.current = false;
      return;
    }

    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }

    if (isConnected && !terminalNoticeRef.current) {
      appendTranscript({
        role: 'agent',
        text: 'Final decision reached. Reset for the next visitor.',
      });
      terminalNoticeRef.current = true;
      disconnect();
    }
  }, [sessionLocked, isConnected, disconnect, appendTranscript]);

  // Notifications
  useEffect(() => {
    if (!currentClaim || !terminalDecisions.includes(status)) return;
    if (typeof Notification === 'undefined' || notificationPermission !== 'granted') return;

    const notification = new Notification(`DoorWise ${DECISION_LABELS[status]}`, {
      body: `${currentClaim} at ${address?.label || 'your door'}`,
    });

    return () => notification.close();
  }, [address?.label, currentClaim, notificationPermission, status]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Auto-verification logic
  useEffect(() => {
    if (!address || status !== DECISION_STATUS.LISTENING) return;

    const finalized = transcript.filter((m) => m.text && m.finished !== false);
    const visitorMessages = finalized.filter((m) => m.role === 'visitor').map((m) => m.text);
    const visitorSummary = buildVisitorClaimSummary(visitorMessages);
    const lastAgent = [...finalized].reverse().find((m) => m.role === 'agent');

    const inferredClaim = inferClaimFromVisitorTranscript(visitorMessages);
    const trustedOrg = findTrustedOrganizationCandidate(
      visitorSummary,
      buildingContext.trusted_id_organizations
    );

    const lastAgentAskedId = Boolean(lastAgent && agentRequestedIdReview(lastAgent.text));
    const voiceFingerprint = visitorSummary ? `voice:${normalizeConversationText(visitorSummary)}` : '';

    const waitingForTrustedId = Boolean(
      trustedOrg && visitorSummary && (lastAgentAskedId || playbook === 'trusted-id')
    );

    const shouldVerifyVoice = Boolean(
      lastAgent &&
      agentRequestedVerification(lastAgent.text) &&
      voiceFingerprint &&
      lastAutoClaimRef.current !== voiceFingerprint
    );

    if (waitingForTrustedId) {
      setClaimInput(visitorSummary);
      setCurrentClaim(visitorSummary);
      setPlaybook('trusted-id');
      setIdReviewPrompt(`Trusted organization detected: ${trustedOrg}. Capture the ID to continue.`);
    } else if (idReviewPrompt) {
      setIdReviewPrompt('');
    }

    if (!shouldVerifyVoice && !inferredClaim && !waitingForTrustedId) return;

    if (autoVerifyTimeoutRef.current) clearTimeout(autoVerifyTimeoutRef.current);

    autoVerifyTimeoutRef.current = setTimeout(() => {
      if (shouldVerifyVoice || (waitingForTrustedId && shouldVerifyVoice)) {
        lastAutoClaimRef.current = voiceFingerprint;
        setClaimInput(visitorSummary);
        triggerVerification(visitorSummary);
      } else if (inferredClaim && lastAutoClaimRef.current !== inferredClaim.fingerprint) {
        lastAutoClaimRef.current = inferredClaim.fingerprint;
        setClaimInput(inferredClaim.claim);
        triggerVerification(inferredClaim.claim);
      }
    }, 900);

    return () => {
      if (autoVerifyTimeoutRef.current) clearTimeout(autoVerifyTimeoutRef.current);
    };
  }, [address, buildingContext.trusted_id_organizations, idReviewPrompt, playbook, status, transcript, triggerVerification]);

  // Handlers
  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (sessionLocked) return;

    const claim = claimInput.trim();
    if (!claim) return;

    const visitorMessages = [
      ...transcript.filter((m) => m.role === 'visitor' && m.text && m.finished !== false).map((m) => m.text),
      claim,
    ];
    const inferred = inferClaimFromVisitorTranscript(visitorMessages);

    appendTranscript({ role: 'visitor', text: claim });
    lastAutoClaimRef.current = inferred?.fingerprint || `manual:${normalizeConversationText(claim)}`;
    sendText(claim);
    setClaimInput('');
    await triggerVerification(claim);
  };

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const resumeCamera = () => {
    videoRef.current?.play().then(() => setCameraError('')).catch(() => {
      setCameraError('Camera playback still blocked.');
    });
  };

  const getClaimContext = () => {
    const typed = claimInput.trim();
    if (typed) return typed;
    if (currentClaim) return currentClaim;
    return buildVisitorClaimSummary(
      transcript.filter((m) => m.role === 'visitor' && m.text && m.finished !== false).map((m) => m.text)
    );
  };

  // ID Review handlers
  const runIdReview = async ({ dataUrl, source }) => {
    const claim = getClaimContext();
    if (!claim) {
      setIdReviewError('Capture a visitor claim before reviewing an ID.');
      return;
    }

    try {
      setIdReviewState('reviewing');
      setIdReviewError('');

      const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!matches) throw new Error('Invalid image data.');

      const response = await fetch(API_ENDPOINTS.REVIEW_ID, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          visitor_claim: claim,
          building_context: buildingContext,
          mime_type: matches[1],
          image_base64: matches[2],
          source,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Could not review ID image.');
      }

      const data = await response.json();
      setIdReview(data);

      // Apply policy decision if present
      if (data.policy_decision) {
        setStatus(data.policy_decision);
        setConfidence(data.policy_confidence || confidence || 'medium');
        setRecommendedAction(data.policy_action || recommendedAction);
        setRecommendedScript(data.policy_script || recommendedScript);
        setPlaybook(data.policy_playbook || 'trusted-id');
        setIdReviewPrompt('');

        if (data.policy_decision === DECISION_STATUS.PROCEED_AFTER_ID_CHECK) {
          appendTranscript({
            role: 'agent',
            text: `ID matches trusted organization ${data.trusted_organization_match}. Proceed after visual ID check.`,
          });
        }
      }
    } catch (error) {
      setIdReview(null);
      setIdReviewError(error.message);
    } finally {
      setIdReviewState('idle');
    }
  };

  const handleIdCapture = async () => {
    if (!videoRef.current || !cameraReady) {
      setIdReviewError('Camera not available.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIdReviewError('Could not capture frame.');
      return;
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    await runIdReview({ dataUrl, source: 'camera_capture' });
  };

  const handleIdUpload = () => idFileInputRef.current?.click();

  const handleIdFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setIdReviewError('Please choose an image file.');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setIdReviewError('Image must be under 6 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => runIdReview({ dataUrl: reader.result, source: 'upload' });
    reader.onerror = () => setIdReviewError('Could not read image file.');
    reader.readAsDataURL(file);
  };

  if (!address) return null;

  const hasWeakAddress = addressValidation && !addressValidation.is_valid;
  const hasCallbackContext = Boolean(
    buildingContext.management_phone ||
    buildingContext.super_phone ||
    buildingContext.approved_vendors?.length
  );

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header glass-panel">
        <Link to="/" className="logo">
          <ShieldCheck className="logo-icon" size={22} />
          <span className="logo-text">DoorWise</span>
        </Link>

        <div className="header-address">
          <MapPin size={16} className="text-blue" />
          <span>{address.label || `${address.houseNumber} ${address.street}, ${address.borough}`}</span>
        </div>

        <div className="header-status">
          <div className="status-dot" />
          <span>{connectionState === 'connected' ? 'Voice Connected' : 'Ready'}</span>
        </div>

        <Link to="/setup" className="header-settings">
          <Settings size={18} />
        </Link>
      </header>

      {/* Alerts */}
      {hasWeakAddress && (
        <Alert variant="warning" icon={AlertTriangle} className="dashboard-alert">
          No matching city record found. Running in manual-review mode.
        </Alert>
      )}

      {!hasCallbackContext && (
        <Alert variant="info" icon={Database} className="dashboard-alert">
          Add management or super phone numbers in setup for callback-based decisions.
        </Alert>
      )}

      {/* Main Grid */}
      <main className="dashboard-main">
        {/* Left Column: Camera + Conversation */}
        <div className="dashboard-left">
          <Card className="camera-card">
            <CameraPanel
              ref={videoRef}
              cameraReady={cameraReady}
              cameraError={cameraError}
              onResume={resumeCamera}
            />
          </Card>

          <Card className="conversation-card">
            <div className="panel-header">
              <div className="header-left">
                <Mic size={18} />
                <span>Conversation</span>
              </div>
              <ConnectionStatus
                state={connectionState}
                onConnect={connect}
                onDisconnect={disconnect}
                sessionLocked={sessionLocked}
                onReset={resetSession}
              />
            </div>

            <div className="transcript-area">
              {transcript.map((msg, idx) => (
                <TranscriptBubble
                  key={`${msg.role}-${idx}`}
                  message={msg}
                  isPartial={msg.finished === false}
                />
              ))}
              <div ref={transcriptEndRef} />
            </div>

            <VoiceVisualizer
              isActive={isConnected}
              isSpeaking={isSpeaking}
              className="conversation-visualizer"
            />

            <form className="claim-form" onSubmit={handleClaimSubmit}>
              <input
                type="text"
                value={claimInput}
                onChange={(e) => setClaimInput(e.target.value)}
                placeholder="Type visitor claim or use voice..."
                disabled={sessionLocked}
                className="input"
              />
              <Button type="submit" disabled={sessionLocked || !claimInput.trim()}>
                <Send size={16} />
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Decision + Actions */}
        <div className="dashboard-right">
          <Card className="decision-card-wrapper">
            <DecisionCard
              status={status}
              claim={currentClaim}
              playbook={playbook}
              confidence={confidence}
            />

            <div className="notification-control">
              <Button
                variant="secondary"
                size="sm"
                onClick={requestNotifications}
              >
                {notificationPermission === 'granted' ? (
                  <><BellRing size={14} /> Alerts On</>
                ) : (
                  <><Bell size={14} /> Enable Alerts</>
                )}
              </Button>
            </div>

            <ActionGrid
              reasoning={decisionReasoning}
              script={recommendedScript}
              action={recommendedAction}
              contact={escalationContact}
            />
          </Card>

          <Card className="id-review-wrapper">
            <input
              ref={idFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleIdFileChange}
              className="hidden"
            />
            <IdReviewCard
              prompt={idReviewPrompt}
              review={idReview}
              state={idReviewState}
              error={idReviewError}
              claimContext={getClaimContext()}
              cameraReady={cameraReady}
              onCapture={handleIdCapture}
              onUpload={handleIdUpload}
            />
          </Card>

          <Card className="data-card">
            <DataChecks
              datasets={datasetResults}
              records={matchedRecords}
            />
          </Card>

          <Card className="incident-card">
            <h4>Recent Incidents</h4>
            {incidentLog.length > 0 ? (
              <div className="incident-list">
                {incidentLog.slice(0, 5).map((incident, idx) => (
                  <IncidentItem key={`${incident.timestamp}-${idx}`} incident={incident} />
                ))}
              </div>
            ) : (
              <p className="empty-text">No recent incidents.</p>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
