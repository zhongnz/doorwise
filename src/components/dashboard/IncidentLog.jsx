import { useState, useMemo } from 'react';
import {
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Phone,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
} from 'lucide-react';
import { DECISION_OUTCOMES } from '../../lib/constants';

const formatTimeAgo = (timestamp) => {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const DecisionIcon = ({ decision }) => {
  switch (decision) {
    case 'PROCEED_AFTER_ID_CHECK':
      return <ShieldCheck className="incident-icon proceed" />;
    case 'CALL_TO_CONFIRM':
      return <Phone className="incident-icon call" />;
    case 'DO_NOT_OPEN':
      return <ShieldAlert className="incident-icon block" />;
    case 'TRUSTED_ID':
      return <BadgeCheck className="incident-icon trusted" />;
    default:
      return <Shield className="incident-icon" />;
  }
};

const DecisionBadge = ({ decision }) => {
  const config = DECISION_OUTCOMES[decision] || {
    label: 'Unknown',
    color: 'var(--text-muted)',
  };

  return (
    <span
      className="decision-badge"
      style={{ '--badge-color': config.color }}
    >
      {config.label}
    </span>
  );
};

const IncidentCard = ({ incident, isExpanded, onToggle, onDelete }) => {
  const { claim, decision, timestamp, transcript, matchedRecords, playbook } = incident;

  return (
    <div className={`incident-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="incident-header" onClick={onToggle}>
        <div className="incident-left">
          <DecisionIcon decision={decision} />
          <div className="incident-info">
            <span className="incident-claim">{claim || 'Unknown Visitor'}</span>
            <span className="incident-time">
              <Clock size={12} />
              {formatTimeAgo(timestamp)}
            </span>
          </div>
        </div>
        <div className="incident-right">
          <DecisionBadge decision={decision} />
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {isExpanded && (
        <div className="incident-details">
          <div className="detail-row">
            <span className="detail-label">Time</span>
            <span className="detail-value">{formatDate(timestamp)}</span>
          </div>

          {playbook && (
            <div className="detail-row">
              <span className="detail-label">Playbook</span>
              <span className="detail-value playbook-tag">{playbook}</span>
            </div>
          )}

          {matchedRecords && matchedRecords.length > 0 && (
            <div className="detail-section">
              <span className="detail-label">Matched Records</span>
              <div className="matched-records">
                {matchedRecords.map((record, idx) => (
                  <div key={idx} className="record-item">
                    <CheckCircle size={14} className="record-icon match" />
                    <span>{record.type}: {record.summary}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transcript && transcript.length > 0 && (
            <div className="detail-section">
              <span className="detail-label">Conversation</span>
              <div className="transcript-preview">
                {transcript.slice(0, 4).map((msg, idx) => (
                  <div key={idx} className={`transcript-msg ${msg.role}`}>
                    <User size={12} />
                    <span>{msg.text}</span>
                  </div>
                ))}
                {transcript.length > 4 && (
                  <span className="transcript-more">
                    +{transcript.length - 4} more messages
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="incident-actions">
            <button
              className="incident-action-btn delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(incident.id);
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Analytics = ({ incidents }) => {
  const stats = useMemo(() => {
    const total = incidents.length;
    const byDecision = {};
    const byPlaybook = {};
    const byHour = Array(24).fill(0);

    incidents.forEach((incident) => {
      byDecision[incident.decision] = (byDecision[incident.decision] || 0) + 1;
      if (incident.playbook) {
        byPlaybook[incident.playbook] = (byPlaybook[incident.playbook] || 0) + 1;
      }
      const hour = new Date(incident.timestamp).getHours();
      byHour[hour]++;
    });

    const blocked = byDecision['DO_NOT_OPEN'] || 0;
    const verified = byDecision['PROCEED_AFTER_ID_CHECK'] || 0;
    const callConfirm = byDecision['CALL_TO_CONFIRM'] || 0;
    const trusted = byDecision['TRUSTED_ID'] || 0;

    return {
      total,
      blocked,
      verified,
      callConfirm,
      trusted,
      byPlaybook,
      byHour,
      threatRate: total > 0 ? ((blocked / total) * 100).toFixed(1) : 0,
    };
  }, [incidents]);

  const maxHourValue = Math.max(...stats.byHour, 1);

  return (
    <div className="analytics-panel">
      <h3 className="analytics-title">Analytics</h3>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Checks</div>
        </div>
        <div className="stat-card proceed">
          <div className="stat-value">{stats.verified}</div>
          <div className="stat-label">Verified</div>
        </div>
        <div className="stat-card block">
          <div className="stat-value">{stats.blocked}</div>
          <div className="stat-label">Blocked</div>
        </div>
        <div className="stat-card call">
          <div className="stat-value">{stats.callConfirm}</div>
          <div className="stat-label">Call Confirm</div>
        </div>
      </div>

      {stats.total > 0 && (
        <>
          <div className="threat-indicator">
            <div className="threat-header">
              <AlertTriangle size={16} />
              <span>Threat Detection Rate</span>
            </div>
            <div className="threat-bar">
              <div
                className="threat-fill"
                style={{ width: `${stats.threatRate}%` }}
              />
            </div>
            <span className="threat-value">{stats.threatRate}%</span>
          </div>

          <div className="activity-chart">
            <div className="chart-header">Activity by Hour</div>
            <div className="hour-bars">
              {stats.byHour.map((count, hour) => (
                <div key={hour} className="hour-bar-container">
                  <div
                    className="hour-bar"
                    style={{ height: `${(count / maxHourValue) * 100}%` }}
                    title={`${hour}:00 - ${count} checks`}
                  />
                  {hour % 6 === 0 && (
                    <span className="hour-label">{hour}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default function IncidentLog({ incidents = [], onDeleteIncident, onClearAll }) {
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDecision, setFilterDecision] = useState('all');
  const [showAnalytics, setShowAnalytics] = useState(false);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesSearch =
        !searchQuery ||
        incident.claim?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.playbook?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterDecision === 'all' || incident.decision === filterDecision;

      return matchesSearch && matchesFilter;
    });
  }, [incidents, searchQuery, filterDecision]);

  const handleExport = () => {
    const data = JSON.stringify(incidents, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doorwise-incidents-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (incidents.length === 0) {
    return (
      <div className="incident-log empty">
        <div className="empty-state">
          <Shield size={48} className="empty-icon" />
          <h3>No Incidents Yet</h3>
          <p>Verification history will appear here after your first check.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="incident-log">
      <div className="log-header">
        <h3>Incident History</h3>
        <div className="log-actions">
          <button
            className={`log-action-btn ${showAnalytics ? 'active' : ''}`}
            onClick={() => setShowAnalytics(!showAnalytics)}
            title="Toggle Analytics"
          >
            <Filter size={16} />
          </button>
          <button
            className="log-action-btn"
            onClick={handleExport}
            title="Export Data"
          >
            <Download size={16} />
          </button>
          {onClearAll && (
            <button
              className="log-action-btn danger"
              onClick={onClearAll}
              title="Clear All"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {showAnalytics && <Analytics incidents={incidents} />}

      <div className="log-filters">
        <div className="search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={filterDecision}
          onChange={(e) => setFilterDecision(e.target.value)}
        >
          <option value="all">All Decisions</option>
          <option value="PROCEED_AFTER_ID_CHECK">Verified</option>
          <option value="CALL_TO_CONFIRM">Call to Confirm</option>
          <option value="DO_NOT_OPEN">Blocked</option>
          <option value="TRUSTED_ID">Trusted ID</option>
        </select>
      </div>

      <div className="incidents-list">
        {filteredIncidents.length === 0 ? (
          <div className="no-results">
            <XCircle size={24} />
            <span>No matching incidents found</span>
          </div>
        ) : (
          filteredIncidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              isExpanded={expandedId === incident.id}
              onToggle={() =>
                setExpandedId(expandedId === incident.id ? null : incident.id)
              }
              onDelete={onDeleteIncident}
            />
          ))
        )}
      </div>
    </div>
  );
}
