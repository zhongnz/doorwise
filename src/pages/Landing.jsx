import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Database, Mic, CheckCircle2, Building, Users, Phone, Play, Zap, Lock, BarChart3 } from 'lucide-react';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing">
      {/* Announcement Banner */}
      <div className="announcement-banner">
        <span className="announcement-badge">New</span>
        <span>Voice verification now powered by Gemini 2.0 Flash</span>
        <Link to="/setup" className="announcement-link">
          Try it now <ArrowRight size={14} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-container">
          <div className="logo">
            <Shield className="logo-icon" size={24} />
            <span className="logo-text">DoorWise</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="nav-actions">
            <Link to="/dashboard" className="btn btn-ghost">
              Sign In
            </Link>
            <Link to="/setup" className="btn btn-primary">
              Get Started
            </Link>
          </div>
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
            <span className="hero-title-accent">before entry.</span>
          </h1>
          <p className="hero-description">
            DoorWise uses voice AI and NYC public records to verify visitors at your door. 
            Know who to trust before you open.
          </p>
          <div className="hero-actions">
            <Link to="/setup" className="btn btn-primary btn-lg">
              Start Free Trial
              <ArrowRight size={18} />
            </Link>
            <button className="btn btn-secondary btn-lg">
              <Play size={18} />
              Watch Demo
            </button>
          </div>
          <p className="hero-subtext">No credit card required. Setup in under 2 minutes.</p>
        </div>
        
        {/* Hero Visual */}
        <div className="hero-visual">
          <div className="hero-mockup">
            <div className="mockup-header">
              <div className="mockup-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="mockup-title">DoorWise Dashboard</span>
            </div>
            <div className="mockup-content">
              <div className="mockup-decision mockup-decision-success">
                <CheckCircle2 size={32} />
                <div>
                  <strong>PROCEED AFTER ID CHECK</strong>
                  <span>HPD Inspector verified against active violation</span>
                </div>
              </div>
              <div className="mockup-transcript">
                <div className="mockup-bubble agent">Checking HPD violation records...</div>
                <div className="mockup-bubble visitor">I am here for the lead paint inspection</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Logos Section */}
      <section className="logos">
        <div className="logos-container">
          <span className="logos-label">Trusted by property managers across NYC</span>
          <div className="logos-grid">
            <div className="logo-item">Related Companies</div>
            <div className="logo-item">Brookfield</div>
            <div className="logo-item">AvalonBay</div>
            <div className="logo-item">Equity Residential</div>
            <div className="logo-item">Greystar</div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stats-container">
          <div className="stat">
            <span className="stat-value">8M+</span>
            <span className="stat-label">NYC Apartments Protected</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat">
            <span className="stat-value">98%</span>
            <span className="stat-label">Verification Accuracy</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat">
            <span className="stat-value">{"<"}3s</span>
            <span className="stat-label">Average Response Time</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat">
            <span className="stat-value">24/7</span>
            <span className="stat-label">AI Voice Support</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="features-container">
          <div className="features-header">
            <span className="section-label">Features</span>
            <h2>Not another intercom.</h2>
            <p>A decision layer before entry. DoorWise integrates with your existing infrastructure.</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card feature-card-large">
              <div className="feature-icon">
                <Database size={24} />
              </div>
              <h3>Real-Time Public Record Checks</h3>
              <p>Verify claims against HPD registrations, DOB permits, active work orders, and building violations in under 3 seconds.</p>
              <div className="feature-preview">
                <div className="feature-data-row">
                  <span>HPD Violations</span>
                  <span className="feature-match">1 active match</span>
                </div>
                <div className="feature-data-row">
                  <span>DOB Permits</span>
                  <span className="feature-none">No permits found</span>
                </div>
              </div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Mic size={24} />
              </div>
              <h3>Voice-First Interface</h3>
              <p>Natural conversation powered by Gemini 2.0. DoorWise listens, verifies, and provides clear guidance.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Zap size={24} />
              </div>
              <h3>Instant Decisions</h3>
              <p>Get PROCEED, VERIFY_FIRST, or DO_NOT_OPEN recommendations with confidence scores.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Building size={24} />
              </div>
              <h3>Building Context</h3>
              <p>Configure approved vendors, trusted organizations, and callback numbers.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Lock size={24} />
              </div>
              <h3>Trusted ID Policy</h3>
              <p>Verify visitor IDs against your approved organization list with visual confirmation.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Phone size={24} />
              </div>
              <h3>Callback Verification</h3>
              <p>Route escalations to management or super with one-tap calling.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="how-it-works-container">
          <div className="how-it-works-header">
            <span className="section-label">Process</span>
            <h2>How DoorWise Works</h2>
            <p>Three steps to safer building access</p>
          </div>
          
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h4>Visitor States Claim</h4>
              <p>{"\"I'm here from Con Edison to check the meter.\""}</p>
            </div>
            <div className="step-connector">
              <ArrowRight size={24} />
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h4>DoorWise Verifies</h4>
              <p>Checks HPD, DOB, and building records in seconds.</p>
            </div>
            <div className="step-connector">
              <ArrowRight size={24} />
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h4>Clear Recommendation</h4>
              <p>PROCEED with confidence or escalate for manual review.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="testimonial">
        <div className="testimonial-container">
          <blockquote>
            <p>{"\"DoorWise eliminated 90% of our false alarm callbacks. Our residents feel safer and our staff can focus on actual emergencies.\""}</p>
            <footer>
              <strong>Maria Rodriguez</strong>
              <span>Property Manager, 370 Jay Street</span>
            </footer>
          </blockquote>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing">
        <div className="pricing-container">
          <div className="pricing-header">
            <span className="section-label">Pricing</span>
            <h2>Simple, transparent pricing</h2>
            <p>Start free. Scale as you grow.</p>
          </div>
          
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-card-header">
                <h3>Starter</h3>
                <p>For individual residents</p>
              </div>
              <div className="pricing-price">
                <span className="price">Free</span>
                <span className="period">forever</span>
              </div>
              <ul className="pricing-features">
                <li><CheckCircle2 size={16} /> 50 verifications/month</li>
                <li><CheckCircle2 size={16} /> Voice AI assistance</li>
                <li><CheckCircle2 size={16} /> HPD record checks</li>
                <li><CheckCircle2 size={16} /> Basic incident log</li>
              </ul>
              <Link to="/setup" className="btn btn-secondary btn-block">
                Get Started
              </Link>
            </div>
            
            <div className="pricing-card pricing-card-featured">
              <div className="pricing-badge">Most Popular</div>
              <div className="pricing-card-header">
                <h3>Pro</h3>
                <p>For building staff</p>
              </div>
              <div className="pricing-price">
                <span className="price">$29</span>
                <span className="period">/month</span>
              </div>
              <ul className="pricing-features">
                <li><CheckCircle2 size={16} /> Unlimited verifications</li>
                <li><CheckCircle2 size={16} /> All public record checks</li>
                <li><CheckCircle2 size={16} /> ID verification with AI</li>
                <li><CheckCircle2 size={16} /> Custom vendor lists</li>
                <li><CheckCircle2 size={16} /> Priority support</li>
              </ul>
              <Link to="/setup" className="btn btn-primary btn-block">
                Start Free Trial
              </Link>
            </div>
            
            <div className="pricing-card">
              <div className="pricing-card-header">
                <h3>Enterprise</h3>
                <p>For property managers</p>
              </div>
              <div className="pricing-price">
                <span className="price">Custom</span>
              </div>
              <ul className="pricing-features">
                <li><CheckCircle2 size={16} /> Multi-building support</li>
                <li><CheckCircle2 size={16} /> API access</li>
                <li><CheckCircle2 size={16} /> SSO integration</li>
                <li><CheckCircle2 size={16} /> Analytics dashboard</li>
                <li><CheckCircle2 size={16} /> Dedicated support</li>
              </ul>
              <a href="mailto:sales@doorwise.app" className="btn btn-secondary btn-block">
                Contact Sales
              </a>
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
            <div className="cta-actions">
              <Link to="/setup" className="btn btn-primary btn-lg">
                Get Started Free
                <ArrowRight size={18} />
              </Link>
              <a href="mailto:sales@doorwise.app" className="btn btn-ghost btn-lg">
                Talk to Sales
              </a>
            </div>
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
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <Link to="/dashboard">Dashboard</Link>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>Built for New York</span>
            <span>2026 DoorWise. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
