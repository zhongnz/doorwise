import { ArrowRight, Bell, Building, Database, Eye, Mic, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Landing.css';

const datasets = [
  { name: 'HPD Violations', id: 'wvxf-dwi5', note: 'Find open and historical housing-code issues tied to the address.' },
  { name: 'Multiple Dwelling Registrations', id: 'tesw-yqqr', note: 'Confirms whether the building has an active HPD registration on file.' },
  { name: 'Registration Contacts', id: 'feu5-w2e2', note: 'Pulls owner and managing-agent contacts tied to the building registration.' },
  { name: 'DOB NOW Approved Permits', id: 'rbx6-tga4', note: 'Supports contractor and repair claims with current DOB NOW permit activity.' },
];

const Landing = () => {
  return (
    <div className="landing-container">
      <nav className="glass-panel nav-bar">
        <div className="logo">
          <ShieldCheck className="logo-icon" size={28} />
          <span className="logo-text">DoorWise</span>
        </div>
        <div className="nav-links">
          <a href="#how-it-works">How it Works</a>
          <a href="#demo">Workflow</a>
          <a href="#datasets">NYC Data</a>
          <a href="https://github.com/zhongnz/doorwise" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </nav>

	      <header className="hero">
        <div className="hero-content">
          <div className="badge">Voice-First Access Verification</div>
          <h1 className="hero-title">
            Verify building access
            <br />
            <span className="text-gradient">before you open the door.</span>
          </h1>
          <p className="hero-subtitle">
            DoorWise helps residents and building staff in NYC multifamily housing verify claimed management,
            inspection, and repair visits before granting entry.
          </p>

          <div className="cta-group">
            <Link to="/setup" className="btn-primary">
              Open DoorWise <ArrowRight size={20} />
            </Link>
            <button
              className="btn-secondary"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See Workflow
            </button>
          </div>
        </div>

	        <div className="hero-visual animate-float">
	          <div className="glass-panel mock-dashboard">
	            <div className="mock-header">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
            </div>
	            <div className="mock-content">
	              <div className="mock-camera">
	                <div className="camera-overlay">
	                  <div className="preview-card">
	                    <span className="preview-chip">Camera Preview</span>
	                    <strong>Claim captured</strong>
	                    <p>Management says they need apartment access.</p>
	                  </div>
	                  <div className="preview-bars" aria-hidden="true">
	                    <span></span>
	                    <span></span>
	                    <span></span>
	                    <span></span>
	                  </div>
	                  <span className="analyzing-text">CHECKING CITY RECORDS</span>
	                </div>
	              </div>
	              <div className="mock-verdict caution">
	                <ShieldCheck size={24} />
                <div>
                  <strong>CALL TO CONFIRM: Management Visit</strong>
                  <p>Registration exists, but the visit still needs callback confirmation.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="how-it-works" className="features">
        <h2 className="section-title">What DoorWise Does Today</h2>
        <div className="feature-grid">
          <div className="feature-card glass-panel">
            <div className="feature-icon blue">
              <Eye size={32} />
            </div>
            <h3>Preview the door camera</h3>
            <p>See a live browser camera feed when device permissions allow it, with a fallback manual mode when they do not.</p>
          </div>
          <div className="feature-card glass-panel">
            <div className="feature-icon orange">
              <Mic size={32} />
            </div>
            <h3>Keep claim intake simple</h3>
            <p>Use Gemini Live to gather the claim in real time, with text available when the mic is unavailable or the room is too noisy.</p>
          </div>
          <div className="feature-card glass-panel">
            <div className="feature-icon green">
              <Database size={32} />
            </div>
            <h3>Check the right records</h3>
            <p>Use HPD registration, HPD violations, and DOB NOW permit records to support inspector, contractor, and management claims.</p>
          </div>
          <div className="feature-card glass-panel">
            <div className="feature-icon red">
              <Bell size={32} />
            </div>
            <h3>Get an action, not just a label</h3>
            <p>Each result tells the tenant what to say, what to do, and who to call before opening the door.</p>
          </div>
        </div>
      </section>

      <section id="demo" className="demo-section">
        <div className="demo-copy">
          <h2 className="section-title">Workflow</h2>
          <p>
            Setup captures the address and optional building contacts, the dashboard captures the visitor claim, and
            DoorWise returns a scoped access decision with script and escalation steps.
          </p>
        </div>
        <div className="demo-steps">
	          <div className="glass-panel demo-step">
	            <span>1</span>
	            <h3>Set the building context</h3>
	            <p>Save the address and optional callback contacts so DoorWise can anchor the verification workflow.</p>
	          </div>
          <div className="glass-panel demo-step">
            <span>2</span>
            <h3>Capture the claim</h3>
            <p>Type or say a building-related entry request for management, inspection, or repair.</p>
          </div>
          <div className="glass-panel demo-step">
            <span>3</span>
            <h3>Take the action</h3>
            <p>See the decision, the supporting records, and the exact next step before opening the door.</p>
          </div>
        </div>
      </section>

      <section id="datasets" className="datasets-section">
        <h2 className="section-title">Records DoorWise Uses Today</h2>
        <div className="dataset-grid">
          {datasets.map((dataset) => (
            <div className="glass-panel dataset-card" key={dataset.id}>
              <div className="dataset-id">{dataset.id}</div>
              <h3>{dataset.name}</h3>
              <p>{dataset.note}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel future-work">
          <Building size={20} />
          <p>
            Next steps are stronger building rosters, scheduled maintenance imports, and better callback
            workflows for management and vendors.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Landing;
