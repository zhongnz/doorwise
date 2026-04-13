import {
  ArrowRight,
  Bell,
  Building,
  Database,
  ExternalLink,
  Eye,
  MapPin,
  Mic,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Badge, Card, Pill } from '../components/common';
import { INVESTOR_METRICS, DEMO_SCENARIOS, NYC_DATASETS } from '../lib/constants';
import './Landing.css';

const thesisCards = [
  {
    icon: ShieldAlert,
    title: 'Painful trust decision',
    body: 'Residents are asked to make a safety decision with partial information, often in real time and under pressure.',
  },
  {
    icon: Database,
    title: 'Software wedge, not hardware',
    body: 'DoorWise sits before entry. It complements intercoms and access systems instead of trying to replace them.',
  },
  {
    icon: Building,
    title: 'Operational expansion path',
    body: 'The first product is resident-side verification. The next layer is building operations, vendor coordination, and callback workflows.',
  },
];

const productFeatures = [
  {
    icon: Mic,
    title: 'Voice-first intake',
    body: "Gemini Live captures the visitor's claim quickly, while text stays available as a fallback.",
    accent: 'blue',
  },
  {
    icon: Database,
    title: 'Record-backed decisions',
    body: 'DoorWise checks NYC housing and permit records before telling the resident what to do next.',
    accent: 'amber',
  },
  {
    icon: Eye,
    title: 'Trusted-ID escalation',
    body: 'Buildings can define trusted organizations. DoorWise routes those claims into ID review.',
    accent: 'green',
  },
  {
    icon: Bell,
    title: 'Action, not analysis',
    body: 'The result is simple: what to say, what to do, and who to call before anyone gets buzzed in.',
    accent: 'blue',
  },
];

const expansionCards = [
  {
    title: 'Who pays',
    body: 'Property managers, housing operators, and other multifamily owners who need a verification layer before entry.',
  },
  {
    title: 'Why now',
    body: 'DoorWise is already narrow enough to demo cleanly and broad enough to expand into workflows around vendor scheduling.',
  },
  {
    title: 'Why it compounds',
    body: 'Building rosters, maintenance imports, trusted-ID policies, and audit trails deepen the product without changing the wedge.',
  },
];

const Landing = () => {
  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="nav-bar glass-panel">
        <Link to="/" className="logo">
          <ShieldCheck className="logo-icon" size={26} />
          <span className="logo-text">DoorWise</span>
        </Link>
        
        <div className="nav-links">
          <a href="#thesis">Thesis</a>
          <a href="#product">Product</a>
          <a href="#demo">Demo</a>
          <a href="#moat">Moat</a>
          <a href="https://github.com/zhongnz/doorwise" target="_blank" rel="noreferrer" className="nav-link-external">
            GitHub <ExternalLink size={14} />
          </a>
        </div>

        <Link to="/setup" className="nav-cta">
          <Button size="sm">
            Launch App <ArrowRight size={16} />
          </Button>
        </Link>
      </nav>

      {/* Hero Section */}
      <header className="hero">
        <div className="hero-glow" />
        
        <div className="hero-content">
          <div className="hero-copy">
            <Badge variant="amber" className="hero-badge">
              <Sparkles size={12} />
              Investor Overview
            </Badge>
            
            <h1 className="hero-title">
              The verification layer
              <br />
              <span className="text-gradient-blue">before entry.</span>
            </h1>
            
            <p className="hero-subtitle">
              DoorWise helps residents and building staff verify claimed management, 
              inspection, repair, and trusted-ID access before they open the door. 
              One high-pressure trust decision, handled in under a minute.
            </p>

            <div className="hero-cta">
              <Link to="/setup">
                <Button size="lg">
                  Open Live Product <ArrowRight size={20} />
                </Button>
              </Link>
              <a href="#demo">
                <Button variant="secondary" size="lg">
                  <Play size={18} />
                  Watch Demo
                </Button>
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-card glass-panel">
              <div className="hero-card-header">
                <Badge variant="blue">Live Preview</Badge>
                <Badge variant="green">NYC-first wedge</Badge>
              </div>
              
              <div className="hero-card-body">
                <div className="pitch-story problem">
                  <span className="pitch-label">Problem</span>
                  <h3>Residents make trust decisions with weak signals.</h3>
                  <p>Unexpected entry requests happen in real time. Most buildings give the resident a buzzer, not a verification workflow.</p>
                </div>

                <div className="pitch-story solution">
                  <span className="pitch-label">Product</span>
                  <h3>Capture the claim, check records, return the action.</h3>
                  <p>DoorWise turns voice, records, and ID review into a simple next step before access is granted.</p>
                </div>

                <div className="outcome-strip">
                  <div className="outcome caution">
                    <span>Management</span>
                    <strong>CALL TO CONFIRM</strong>
                  </div>
                  <div className="outcome danger">
                    <span>Unverified</span>
                    <strong>DO NOT OPEN</strong>
                  </div>
                  <div className="outcome success">
                    <span>Trusted ID</span>
                    <strong>PROCEED</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="metrics-strip">
          {INVESTOR_METRICS.map((metric, index) => (
            <div key={metric.label} className="metric-item animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <span className="metric-value">{metric.value}</span>
              <span className="metric-label">{metric.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Thesis Section */}
      <section id="thesis" className="section">
        <div className="section-header">
          <Badge variant="amber">Investment Thesis</Badge>
          <h2>Not another intercom.<br />A decision layer before entry.</h2>
          <p>
            DoorWise fits as software on top of already-validated access infrastructure. 
            It&apos;s focused trust-and-safety software for a narrow, repeated, valuable decision.
          </p>
        </div>

        <div className="thesis-grid">
          <Card className="thesis-lead">
            <span className="thesis-label">The pitch in one sentence</span>
            <h3>Before a resident opens the door, DoorWise verifies the claim and tells them exactly what to do next.</h3>
            <p>
              The product starts with NYC multifamily housing because the records are available, 
              the use case is concrete, and the compliance context is real.
            </p>
            <div className="thesis-pills">
              <Pill icon={MapPin}>NYC-focused first</Pill>
              <Pill icon={Building}>Multifamily workflow</Pill>
              <Pill icon={ShieldAlert}>Safety before access</Pill>
            </div>
          </Card>

          <div className="thesis-cards">
            {thesisCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title} className="thesis-card">
                  <div className="thesis-icon">
                    <Icon size={24} />
                  </div>
                  <h4>{card.title}</h4>
                  <p>{card.body}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Product Section - Bento Grid */}
      <section id="product" className="section">
        <div className="section-header">
          <Badge variant="blue">Product</Badge>
          <h2>What the MVP already proves</h2>
          <p>
            Voice-first intake, record-backed verification, conservative decisions, 
            and a trusted-ID path for approved organizations.
          </p>
        </div>

        <div className="bento-grid">
          {productFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className={`bento-card bento-${index + 1}`}>
                <div className={`bento-icon ${feature.accent}`}>
                  <Icon size={28} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </Card>
            );
          })}
          
          {/* Feature highlight card */}
          <Card className="bento-card bento-highlight">
            <div className="bento-highlight-content">
              <Zap size={32} className="text-amber" />
              <h3>Built for speed</h3>
              <p>The entire verification flow completes in under 60 seconds, from voice intake to decision output.</p>
              <div className="bento-stats">
                <div className="bento-stat">
                  <span className="stat-value">&lt;60s</span>
                  <span className="stat-label">Average verification</span>
                </div>
                <div className="bento-stat">
                  <span className="stat-value">4</span>
                  <span className="stat-label">Data sources</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="section demo-section">
        <div className="section-header">
          <Badge variant="green">Live Demo</Badge>
          <h2>Three scenarios that tell the story</h2>
          <p>
            The investor demo shows DoorWise is conservative, operational, and capable 
            of improving confidence when the building has stronger policy signals.
          </p>
        </div>

        <div className="demo-grid">
          {DEMO_SCENARIOS.map((scenario, index) => (
            <Card key={scenario.id} className="demo-card animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <Badge variant="blue" className="demo-eyebrow">{scenario.eyebrow}</Badge>
              <h3>{scenario.title}</h3>
              <div className="demo-claim">{scenario.claim}</div>
              <Badge 
                variant={scenario.result.includes('DO NOT') ? 'red' : scenario.result.includes('PROCEED') ? 'green' : 'amber'}
                className="demo-result"
              >
                {scenario.result}
              </Badge>
              <p>{scenario.note}</p>
            </Card>
          ))}
        </div>

        <div className="demo-cta">
          <Link to="/setup">
            <Button size="lg">
              Try It Yourself <ArrowRight size={20} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Moat Section */}
      <section id="moat" className="section">
        <div className="section-header">
          <Badge variant="amber">Defensible Layer</Badge>
          <h2>Why this is more than a voice wrapper</h2>
          <p>
            DoorWise compounds through building context, structured callbacks, trusted-ID policies, 
            and public-record integration.
          </p>
        </div>

        <div className="dataset-grid">
          {NYC_DATASETS.map((dataset, index) => (
            <Card key={dataset.id} className="dataset-card animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
              <code className="dataset-id">{dataset.id}</code>
              <h4>{dataset.name}</h4>
              <p>{dataset.description}</p>
            </Card>
          ))}
        </div>

        <div className="expansion-grid">
          {expansionCards.map((card) => (
            <Card key={card.title} className="expansion-card">
              <h4>{card.title}</h4>
              <p>{card.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="section closing-section">
        <Card className="closing-card">
          <Badge variant="blue">Closing Thesis</Badge>
          <h2>The wedge is narrow on purpose.</h2>
          <p>
            DoorWise starts with one sharp question: should this person get building access right now? 
            That gives the company a credible NYC entry wedge, a clean investor demo, and a path to 
            compound into broader building operations over time.
          </p>
          <div className="closing-cta">
            <Link to="/setup">
              <Button size="lg">
                Walk The Live Demo <ArrowRight size={20} />
              </Button>
            </Link>
            <a href="https://github.com/zhongnz/doorwise" target="_blank" rel="noreferrer">
              <Button variant="secondary" size="lg">
                <ExternalLink size={18} />
                Review The Repo
              </Button>
            </a>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <ShieldCheck size={20} className="text-blue" />
            <span>DoorWise</span>
          </div>
          <div className="footer-links">
            <a href="https://github.com/zhongnz/doorwise" target="_blank" rel="noreferrer">GitHub</a>
            <span className="footer-divider" />
            <span className="footer-copy">NYC-first building access verification</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
