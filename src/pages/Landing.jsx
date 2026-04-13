import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Database, Mic, CheckCircle2, Building, Users, Phone } from 'lucide-react';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-container">
          <div className="logo">
            <Shield className="logo-icon" size={24} />
            <span className="logo-text">DoorWise</span>
          </div>
          <Link to="/setup" className="btn btn-primary">
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero">
        <div className="hero-container">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            NYC-First Building Access Verification
          </div>
          <h1 className="hero-title">
            The verification layer
            <br />
            before entry.
          </h1>
          <p className="hero-description">
            DoorWise helps residents and building staff verify claimed management, 
            inspection, repair, and trusted-ID access before they open the door.
          </p>
          <div className="hero-actions">
            <Link to="/setup" className="btn btn-primary btn-lg">
              Open Live Product
              <ArrowRight size={18} />
            </Link>
            <Link to="/dashboard" className="btn btn-secondary btn-lg">
              View Demo
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="stats">
        <div className="stats-container">
          <div className="stat">
            <span className="stat-value">8M+</span>
            <span className="stat-label">NYC Apartments</span>
          </div>
          <div className="stat">
            <span className="stat-value">98%</span>
            <span className="stat-label">Accuracy Rate</span>
          </div>
          <div className="stat">
            <span className="stat-value">{"<"}3s</span>
            <span className="stat-label">Verification Time</span>
          </div>
          <div className="stat">
            <span className="stat-value">24/7</span>
            <span className="stat-label">Voice AI Support</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features-container">
          <div className="features-header">
            <h2>Not another intercom.</h2>
            <p>A decision layer before entry. DoorWise fits as software on top of already-validated access infrastructure.</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Database size={24} />
              </div>
              <h3>Public Record Checks</h3>
              <p>Verify claims against HPD registrations, DOB permits, and active work orders in real-time.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Mic size={24} />
              </div>
              <h3>Voice-First Interface</h3>
              <p>Natural conversation with visitors. DoorWise listens, verifies, and provides clear guidance.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <CheckCircle2 size={24} />
              </div>
              <h3>Instant Decisions</h3>
              <p>Get PROCEED, VERIFY_FIRST, or DO_NOT_OPEN recommendations with confidence scores.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Building size={24} />
              </div>
              <h3>Building Context</h3>
              <p>Configure approved vendors, trusted organizations, and callback numbers for your building.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Users size={24} />
              </div>
              <h3>Trusted ID Policy</h3>
              <p>Verify visitor IDs against your approved organization list with visual confirmation.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Phone size={24} />
              </div>
              <h3>Callback Verification</h3>
              <p>Route escalations to management or super with one-tap calling from the dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="how-it-works-container">
          <div className="how-it-works-header">
            <h2>How DoorWise Works</h2>
            <p>Three steps to safer building access</p>
          </div>
          
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h4>Visitor States Claim</h4>
              <p>{"\"I'm here from Con Edison to check the meter.\""}</p>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-number">2</div>
              <h4>DoorWise Verifies</h4>
              <p>Checks HPD, DOB, and building records in seconds.</p>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-number">3</div>
              <h4>Clear Recommendation</h4>
              <p>PROCEED with confidence or escalate for manual review.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-container">
          <div className="cta-content">
            <h2>Ready to secure your building?</h2>
            <p>Start verifying visitors with DoorWise today. No hardware required.</p>
            <Link to="/setup" className="btn btn-primary btn-lg">
              Get Started Free
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="logo">
              <Shield className="logo-icon" size={20} />
              <span className="logo-text">DoorWise</span>
            </div>
            <p>NYC-first building access verification</p>
          </div>
          <div className="footer-links">
            <span>Built for New York</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
