import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BellRing,
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
import { Button, Badge, Alert, Spinner } from '../components/common';
import {
  VoiceVisualizer,
  ConnectionStatus,
  TranscriptBubble,
  DecisionCard,
  ActionGrid,
  IdReviewCard,
  DataChecks,
  CameraPanel,
} from '../components/dashboard';
import IncidentLog from '../components/dashboard/IncidentLog';
import '../components/dashboard/IncidentLog.css';
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

// Check if we're in demo mode (no backend available)
const isDemoMode = !import.meta.env.VITE_ENABLE_PROXY;

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

  // Voice hook - speakResponse is used in browser speech mode to speak responses aloud
  const voiceCallbackRef = useRef(null);
  const { connect, disconnect, sendText, speakResponse, isConnected, isSpeaking, connectionState, lastError } = useVoice(
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
      // Handle voice claims from browser speech recognition
      if (event.kind === 'visitor_claim' && event.text) {
        voiceCallbackRef.current?.(event.text);
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

  // Demo mode mock responses based on claim keywords
  const getDemoResponse = useCallback((claim) => {
    const lowerClaim = claim.toLowerCase().trim();
    
    // Greetings - ask for more information (return null to indicate conversational response)
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'yo', 'sup'];
    if (greetings.some(g => lowerClaim === g || lowerClaim.startsWith(g + ' ') || lowerClaim.startsWith(g + ','))) {
      return {
        isConversational: true,
        response: 'Hello! Who are you here to see, or what is the purpose of your visit?',
      };
    }
    
    // Vague responses - ask for clarification
    const vague = ['i need to get in', 'let me in', 'open the door', 'buzz me in', 'i live here', 'resident'];
    if (vague.some(v => lowerClaim.includes(v))) {
      return {
        isConversational: true,
        response: 'I need more details to verify. What apartment are you visiting, or what is your name if you are a resident?',
      };
    }
    
    // Delivery claims - common and should work
    if (lowerClaim.includes('delivery') || lowerClaim.includes('package') || lowerClaim.includes('amazon') || lowerClaim.includes('ups') || lowerClaim.includes('fedex') || lowerClaim.includes('usps') || lowerClaim.includes('doordash') || lowerClaim.includes('uber eats') || lowerClaim.includes('grubhub')) {
      return {
        decision: DECISION_STATUS.PROCEED,
        reasoning: 'Delivery service recognized. Standard delivery protocol applies.',
        recommended_action: 'Allow delivery person to leave package in lobby or designated area.',
        recommended_script: 'You can leave the package in the lobby by the mailboxes. Thank you!',
        escalation_contact: buildingContext?.management_phone || '(212) 555-0100',
        confidence: 'high',
        playbook: 'delivery',
        datasets: [
          { name: 'Delivery Services', status: 'match', records: 1 },
        ],
        matched_records: [
          { type: 'policy', description: 'Standard delivery acceptance policy', date: 'Active' }
        ],
      };
    }
    
    // HPD inspector claims - verify against mock violations
    if (lowerClaim.includes('hpd') || lowerClaim.includes('inspector') || lowerClaim.includes('lead paint') || lowerClaim.includes('violation') || lowerClaim.includes('inspection')) {
      return {
        decision: DECISION_STATUS.PROCEED_AFTER_ID_CHECK,
        reasoning: 'Found matching HPD violation for lead paint inspection scheduled this month.',
        recommended_action: 'Ask the inspector to show their HPD badge and verify the badge number.',
        recommended_script: 'Please hold your HPD inspector badge up to the camera so I can verify.',
        escalation_contact: buildingContext?.management_phone || '(212) 555-0100',
        confidence: 'high',
        playbook: 'inspector',
        datasets: [
          { name: 'HPD Violations', status: 'match', records: 1 },
          { name: 'DOB Permits', status: 'no_match', records: 0 },
        ],
        matched_records: [
          { type: 'violation', description: 'Lead paint inspection required', date: '2026-04-01' }
        ],
      };
    }
    
    // Contractor/repair claims
    if (lowerClaim.includes('contractor') || lowerClaim.includes('repair') || lowerClaim.includes('plumber') || lowerClaim.includes('electrician') || lowerClaim.includes('maintenance') || lowerClaim.includes('fix')) {
      return {
        decision: DECISION_STATUS.CALL_TO_CONFIRM,
        reasoning: 'No matching work order or permit found for this contractor visit.',
        recommended_action: 'Call building management to confirm this work was scheduled.',
        recommended_script: 'I need to verify this with building management. Please wait one moment.',
        escalation_contact: buildingContext?.management_phone || '(212) 555-0100',
        confidence: 'medium',
        playbook: 'contractor',
        datasets: [
          { name: 'DOB Permits', status: 'no_match', records: 0 },
          { name: 'Approved Vendors', status: 'no_match', records: 0 },
        ],
        matched_records: [],
      };
    }
    
    // Management/building staff claims
    if (lowerClaim.includes('management') || lowerClaim.includes('landlord') || lowerClaim.includes('super') || lowerClaim.includes('building staff')) {
      return {
        decision: DECISION_STATUS.CALL_TO_CONFIRM,
        reasoning: 'Management visit requires phone verification.',
        recommended_action: 'Call the building super to confirm this visit.',
        recommended_script: 'Let me verify this with building staff. One moment please.',
        escalation_contact: buildingContext?.super_phone || buildingContext?.management_phone || '(212) 555-0100',
        confidence: 'medium',
        playbook: 'management',
        datasets: [],
        matched_records: [],
      };
    }
    
    // Visitor for a specific apartment
    if (lowerClaim.includes('visiting') || lowerClaim.includes('guest') || lowerClaim.includes('friend') || lowerClaim.includes('family') || lowerClaim.match(/apt|apartment|unit|#?\d+[a-z]?/i)) {
      return {
        decision: DECISION_STATUS.CALL_TO_CONFIRM,
        reasoning: 'Personal visitor. Resident confirmation required.',
        recommended_action: 'Call the resident to confirm they are expecting this visitor.',
        recommended_script: 'Let me contact the resident to confirm your visit. One moment.',
        escalation_contact: 'Resident intercom',
        confidence: 'medium',
        playbook: 'visitor',
        datasets: [],
        matched_records: [],
      };
    }
    
    // Unknown/unclear - ask for more info instead of rejecting
    return {
      isConversational: true,
      response: 'I didn\'t catch that. Could you tell me who you\'re here to see or the purpose of your visit? For example: "Delivery for apartment 5A" or "HPD inspector for lead paint inspection".',
    };
  }, [buildingContext]);

  // Verification
  const triggerVerification = useCallback(async (claim) => {
    if (!address) return;

    // In demo mode, check for conversational responses first (no "Checking records" message)
    if (isDemoMode) {
      const data = getDemoResponse(claim);
      
      // Handle conversational responses (greetings, vague claims, etc.)
      if (data.isConversational) {
        await new Promise(resolve => setTimeout(resolve, 500));
        appendTranscript({ role: 'agent', text: data.response });
        speakResponse?.(data.response);
        return;
      }
      
      // It's a real claim - show verification flow
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
      const checkingMsg = 'Let me check our building records.';
      appendTranscript({ role: 'agent', text: checkingMsg });
      speakResponse?.(checkingMsg);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStatus(data.decision);
      setDatasetResults(data.datasets || []);
      setDecisionReasoning(data.reasoning || '');
      setRecommendedScript(data.recommended_script || '');
      setRecommendedAction(data.recommended_action || '');
      setEscalationContact(data.escalation_contact || '');
      setMatchedRecords(data.matched_records || []);
      setConfidence(data.confidence || '');
      setPlaybook(data.playbook || '');
      const responseText = data.recommended_script || data.recommended_action;
      appendTranscript({ role: 'agent', text: responseText });
      speakResponse?.(responseText);

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
      return;
    }

    // Non-demo mode - use real API
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
  }, [address, buildingContext, appendTranscript, getDemoResponse, speakResponse]);

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

  // Set up voice callback to trigger verification from speech recognition
  useEffect(() => {
    voiceCallbackRef.current = (claim) => {
      if (!sessionLocked && claim.trim()) {
        triggerVerification(claim.trim());
      }
    };
  }, [sessionLocked, triggerVerification]);

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
      <header className="dashboard-header">
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
          <div className="camera-card">
            <CameraPanel
              ref={videoRef}
              cameraReady={cameraReady}
              cameraError={cameraError}
              onResume={resumeCamera}
            />
          </div>

          <div className="conversation-card">
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
                demoMode={isDemoMode}
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
                placeholder={isDemoMode ? "Type a claim (e.g., 'HPD inspector for lead paint')..." : "Type visitor claim or use voice..."}
                disabled={sessionLocked}
                className="input"
              />
              <Button type="submit" disabled={sessionLocked || !claimInput.trim()}>
                <Send size={16} />
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: Decision + Actions */}
        <div className="dashboard-right">
          <div className="decision-card-wrapper">
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
          </div>

          <div className="id-review-wrapper">
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
          </div>

          <div className="data-card">
            <DataChecks
              datasets={datasetResults}
              records={matchedRecords}
            />
          </div>

          <div className="incident-card">
            <IncidentLog
              incidents={incidentLog.map((inc, idx) => ({ ...inc, id: inc.id || `${inc.timestamp}-${idx}` }))}
              onDeleteIncident={(id) => {
                setIncidentLog((prev) => {
                  const next = prev.filter((inc, idx) => (inc.id || `${inc.timestamp}-${idx}`) !== id);
                  localStorage.setItem(STORAGE_KEYS.incidents, JSON.stringify(next));
                  return next;
                });
              }}
              onClearAll={() => {
                setIncidentLog([]);
                localStorage.removeItem(STORAGE_KEYS.incidents);
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
