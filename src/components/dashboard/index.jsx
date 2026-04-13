import { forwardRef } from 'react';
import { clsx } from 'clsx';
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  Mic,
  MicOff,
  Phone,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Upload,
  Video,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button, Badge, Card, Spinner, Alert } from '../common';
import { DECISION_LABELS, DECISION_ICONS, DECISION_STATUS, ID_ALIGNMENT_LABELS } from '../../lib/constants';

/**
 * Voice Visualizer Component
 * Animated audio level indicator
 */
export const VoiceVisualizer = ({ isActive, isSpeaking, className }) => {
  return (
    <div className={clsx('voice-visualizer', className)}>
      {[0, 1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={clsx(
            'voice-bar',
            (isActive || isSpeaking) && 'active'
          )}
          style={{ animationDelay: `${bar * 0.1}s` }}
        />
      ))}
    </div>
  );
};

/**
 * Connection Status Badge
 */
export const ConnectionStatus = ({ state, onConnect, onDisconnect, sessionLocked, onReset, demoMode }) => {
  if (sessionLocked) {
    return (
      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw size={14} />
        Next Visitor
      </Button>
    );
  }

  if (state === 'connected') {
    return (
      <Button variant="ghost" size="sm" onClick={onDisconnect}>
        <Wifi size={14} className="text-green" />
        Connected
      </Button>
    );
  }

  if (state === 'connecting') {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Spinner size="sm" />
        Connecting...
      </Button>
    );
  }

  if (state === 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {demoMode && <Badge variant="warning">Demo</Badge>}
        <Button variant="ghost" size="sm" onClick={onConnect}>
          <WifiOff size={14} style={{ color: 'var(--status-error)' }} />
          Retry
        </Button>
      </div>
    );
  }

  // Show demo badge alongside connect button in demo mode
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {demoMode && <Badge variant="warning">Demo</Badge>}
      <Button variant="success" size="sm" onClick={onConnect}>
        <Mic size={14} />
        Voice
      </Button>
    </div>
  );
};

/**
 * Transcript Message Bubble
 */
export const TranscriptBubble = ({ message, isPartial }) => {
  const isAgent = message.role === 'agent';
  
  return (
    <div className={clsx(
      'transcript-bubble',
      isAgent ? 'agent' : 'visitor',
      isPartial && 'partial'
    )}>
      <div className="transcript-meta">
        <span className="transcript-sender">
          {isAgent ? 'DoorWise' : 'Visitor'}
        </span>
        {isPartial && (
          <Badge variant="default" className="transcript-status">
            <Activity size={10} />
            Listening
          </Badge>
        )}
      </div>
      <div className="transcript-text">{message.text}</div>
    </div>
  );
};

/**
 * Decision Card Component
 * Displays the current verification verdict with dramatic styling
 */
export const DecisionCard = ({ status, claim, playbook, confidence }) => {
  const Icon = DECISION_ICONS[status] || ShieldAlert;
  const label = DECISION_LABELS[status] || status;
  
  const getVariant = () => {
    switch (status) {
      case DECISION_STATUS.PROCEED_AFTER_ID_CHECK:
        return 'success';
      case DECISION_STATUS.DO_NOT_OPEN:
        return 'danger';
      case DECISION_STATUS.CALL_TO_CONFIRM:
      case DECISION_STATUS.UNKNOWN:
        return 'warning';
      case DECISION_STATUS.VERIFYING:
        return 'verifying';
      default:
        return 'idle';
    }
  };

  return (
    <div className={clsx('decision-card', getVariant())}>
      <div className={clsx(
        'decision-icon',
        status === DECISION_STATUS.VERIFYING && 'animate-pulse-glow'
      )}>
        <Icon size={48} />
      </div>
      <h2 className="decision-label">{label}</h2>
      <p className="decision-claim">
        {claim || 'Waiting for a visitor claim...'}
      </p>
      <div className="decision-meta">
        <Badge variant="default">{playbook || 'manual-review'}</Badge>
        <Badge variant="default">{confidence || 'pending'} confidence</Badge>
      </div>
    </div>
  );
};

/**
 * Action Grid
 * Displays the recommended actions
 */
export const ActionGrid = ({ reasoning, script, action, contact }) => {
  const actions = [
    { title: 'Why', value: reasoning, placeholder: 'Submit a claim to see the reasoning.' },
    { title: 'What To Say', value: script, placeholder: 'DoorWise will suggest a short script.' },
    { title: 'What To Do', value: action, placeholder: 'DoorWise will tell you the next action.' },
    { title: 'Who To Call', value: contact, placeholder: 'No callback number configured.' },
  ];

  return (
    <div className="action-grid">
      {actions.map(item => (
        <div key={item.title} className="action-item">
          <strong>{item.title}</strong>
          <p>{item.value || item.placeholder}</p>
        </div>
      ))}
    </div>
  );
};

/**
 * ID Review Card
 * Handles ID capture and review display
 */
export const IdReviewCard = ({
  prompt,
  review,
  state,
  error,
  claimContext,
  cameraReady,
  onCapture,
  onUpload,
}) => {
  return (
    <div className="id-review-section">
      {prompt && (
        <Alert variant="info" icon={Camera}>
          {prompt}
        </Alert>
      )}

      <div className="id-review-header">
        <div>
          <h4>ID Review</h4>
          <p>Capture or upload a work badge or ID for verification.</p>
        </div>
        <Badge variant="default">Supporting evidence</Badge>
      </div>

      <div className="id-review-actions">
        <Button
          variant="secondary"
          onClick={onCapture}
          disabled={!cameraReady || !claimContext || state === 'reviewing'}
        >
          <Camera size={16} />
          Capture Frame
        </Button>
        <Button
          variant="secondary"
          onClick={onUpload}
          disabled={!claimContext || state === 'reviewing'}
        >
          <Upload size={16} />
          Upload Image
        </Button>
      </div>

      <p className="id-review-hint">
        {claimContext
          ? `Current claim: ${claimContext}`
          : 'Capture a visitor claim first. ID review compares the image against that claim.'}
      </p>

      {state === 'reviewing' && (
        <div className="id-review-loading">
          <Spinner size="sm" />
          <span>Analyzing document with Gemini...</span>
        </div>
      )}

      {error && (
        <Alert variant="error" icon={AlertTriangle}>
          {error}
        </Alert>
      )}

      {review && (
        <IdReviewResult review={review} />
      )}
    </div>
  );
};

/**
 * ID Review Result
 */
const IdReviewResult = ({ review }) => {
  return (
    <div className="id-review-result">
      <div className={clsx('id-alignment', review.claim_alignment)}>
        <strong>{ID_ALIGNMENT_LABELS[review.claim_alignment] || 'Review complete'}</strong>
        <span>{review.reasoning}</span>
      </div>

      {review.trusted_organization_match && (
        <Alert variant="success" icon={CheckCircle2}>
          Trusted organization match: {review.trusted_organization_match}
        </Alert>
      )}

      <div className="id-fields-grid">
        {[
          { label: 'Document type', value: review.document_type },
          { label: 'Organization', value: review.organization_name },
          { label: 'Name', value: review.person_name },
          { label: 'Badge / ID', value: review.badge_or_employee_id },
          { label: 'Image quality', value: review.evidence_quality },
          { label: 'Model', value: review.model },
        ].map(field => (
          <div key={field.label} className="id-field">
            <span>{field.label}</span>
            <strong>{field.value || 'Not readable'}</strong>
          </div>
        ))}
      </div>

      {review.recommended_action && (
        <div className="id-recommendation">
          <strong>Document review action</strong>
          <p>{review.recommended_action}</p>
        </div>
      )}

      {review.policy_action && (
        <div className="id-recommendation">
          <strong>Building policy outcome</strong>
          <p>{review.policy_action}</p>
        </div>
      )}
    </div>
  );
};

/**
 * Data Checks Section
 */
export const DataChecks = ({ datasets, records }) => {
  return (
    <div className="data-section">
      <h4>NYC Open Data Checks</h4>
      {datasets.length > 0 ? (
        <div className="data-list">
          {datasets.map(dataset => (
            <div key={dataset.key} className="data-row">
              <span className="data-label">{dataset.label}</span>
              <span className={clsx('data-value', dataset.status === 'ok' ? 'success' : 'error')}>
                {dataset.status === 'ok' ? (
                  <>
                    <CheckCircle2 size={14} />
                    {dataset.count} record(s)
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} />
                    {dataset.error || 'Unavailable'}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="data-empty">Submit a claim to check city records.</p>
      )}

      {records.length > 0 && (
        <>
          <h4>Supporting Records</h4>
          <div className="records-list">
            {records.map((record, idx) => (
              <div key={`${record.dataset}-${idx}`} className="record-item">
                <strong>{record.dataset}</strong>
                <div className="record-fields">
                  {Object.entries(record.fields || {}).map(([key, value]) => (
                    <Badge key={key} variant="default">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Incident Log Item
 */
export const IncidentItem = ({ incident }) => {
  const Icon = DECISION_ICONS[incident.decision] || ShieldAlert;
  
  return (
    <div className="incident-item">
      <div className="incident-icon">
        <Icon size={16} />
      </div>
      <div className="incident-content">
        <strong>{DECISION_LABELS[incident.decision] || incident.decision}</strong>
        <p>{incident.claim}</p>
        <span className="incident-time">
          <Clock size={12} />
          {new Date(incident.timestamp).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

/**
 * Camera Panel
 */
export const CameraPanel = forwardRef(({ 
  cameraReady, 
  cameraError, 
  onResume 
}, ref) => {
  return (
    <div className="camera-panel">
      <div className="panel-header">
        <Video size={18} />
        <span>Door Camera</span>
        {cameraReady && <Badge variant="green">Live</Badge>}
      </div>
      
      <div className="camera-feed" onClick={onResume}>
        {cameraReady ? (
          <video ref={ref} autoPlay muted playsInline className="camera-video" />
        ) : (
          <div className="camera-placeholder">
            <Camera size={48} className="text-muted" />
            <span>Camera offline</span>
          </div>
        )}
        
        <div className="camera-overlay">
          <div className="camera-frame">
            <span className="camera-label">
              {cameraReady ? 'Live preview' : 'Camera offline'}
            </span>
          </div>
        </div>
        
        <div className="camera-timestamp">
          {new Date().toLocaleTimeString()} - Front Door
        </div>
      </div>

      {cameraError && (
        <div className="camera-error">
          {cameraError}
        </div>
      )}
    </div>
  );
});

CameraPanel.displayName = 'CameraPanel';
