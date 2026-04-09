import {
  ArrowRight,
  Bell,
  Building,
  Database,
  Eye,
  MapPin,
  Mic,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './Landing.css';

const investorMetrics = [
  { value: '4', label: 'NYC datasets in the current decision engine' },
  { value: '3', label: 'Core building-access playbooks shipped today' },
  { value: '1', label: 'Action returned before the resident opens the door' },
  { value: 'NYC', label: 'Focused starting wedge with real public records' },
];

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

const productCards = [
  {
    icon: Mic,
    title: 'Voice-first intake',
    body: 'Gemini Live captures the visitor’s claim quickly, while text stays available as a fallback when a room is noisy or the mic is blocked.',
  },
  {
    icon: Database,
    title: 'Record-backed decisions',
    body: 'DoorWise checks a focused set of NYC housing and permit records before telling the resident what to do next.',
  },
  {
    icon: Eye,
    title: 'Trusted-ID escalation',
    body: 'If a building defines trusted organizations like NYU, DoorWise can ask for visible ID and route the claim into ID review.',
  },
  {
    icon: Bell,
    title: 'Action, not analysis',
    body: 'The result is simple: what to say, what to do, and who to call before anyone gets buzzed in.',
  },
];

const demoScenarios = [
  {
    eyebrow: 'Scenario 01',
    title: 'Contractor visit',
    claim: '“Hi, I’m with Ace Plumbing. I’m here for a repair.”',
    result: 'CALL TO CONFIRM',
    note: 'The vendor looks plausible, but DoorWise still requires callback confirmation before access.',
  },
  {
    eyebrow: 'Scenario 02',
    title: 'Management claim',
    claim: '“Jay Street Management is here for unit access.”',
    result: 'DO NOT OPEN',
    note: 'If management cannot be confidently matched through known records, the resident gets a conservative denial path.',
  },
  {
    eyebrow: 'Scenario 03',
    title: 'Trusted organization',
    claim: '“I’m with NYU and I’m going to class.”',
    result: 'ID REVIEW -> PROCEED AFTER ID CHECK',
    note: 'DoorWise can route trusted organizations into a badge check rather than a generic unsupported-claim loop.',
  },
];

const datasets = [
  {
    name: 'HPD Violations',
    id: 'wvxf-dwi5',
    note: 'Open and historical housing-code evidence tied to the address.',
  },
  {
    name: 'Multiple Dwelling Registrations',
    id: 'tesw-yqqr',
    note: 'Confirms whether a building has an active registration on file.',
  },
  {
    name: 'Registration Contacts',
    id: 'feu5-w2e2',
    note: 'Supports owner and managing-agent verification paths.',
  },
  {
    name: 'DOB NOW Approved Permits',
    id: 'rbx6-tga4',
    note: 'Supports contractor and repair claims with current permit activity.',
  },
];

const expansionCards = [
  {
    title: 'Who pays',
    body: 'Property managers, housing operators, and other multifamily owners who need a verification layer before entry.',
  },
  {
    title: 'Why now',
    body: 'DoorWise is already narrow enough to demo cleanly and broad enough to expand into workflows around vendor scheduling and management callbacks.',
  },
  {
    title: 'Why it can compound',
    body: 'Building rosters, scheduled maintenance imports, trusted-ID policies, and audit trails can all deepen the product without changing the core wedge.',
  },
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
          <a href="#thesis">Thesis</a>
          <a href="#product">Product</a>
          <a href="#demo">Demo</a>
          <a href="#moat">Moat</a>
          <a href="https://github.com/zhongnz/doorwise" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-copy">
          <div className="pitch-badge">Investor Overview • Voice-First Access Verification</div>
          <h1 className="hero-title">
            DoorWise is the
            <br />
            <span className="text-gradient">verification layer before entry.</span>
          </h1>
          <p className="hero-subtitle">
            DoorWise helps residents and building staff verify claimed management, inspection, repair, and trusted-ID
            access before they open the door. The wedge is intentionally narrow: one high-pressure trust decision,
            handled in under a minute.
          </p>

          <div className="cta-group">
            <Link to="/setup" className="btn-primary">
              Open Live Product <ArrowRight size={20} />
            </Link>
            <button
              className="btn-secondary"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              View Investor Demo
            </button>
          </div>

          <div className="hero-metrics">
            {investorMetrics.map((metric) => (
              <div className="glass-panel metric-card" key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-deck">
          <div className="glass-panel pitch-frame">
            <div className="pitch-frame-header">
              <span className="pitch-chip">Pitch Snapshot</span>
              <span className="pitch-status">NYC-first wedge</span>
            </div>

            <div className="pitch-frame-body">
              <div className="story-card problem">
                <span className="story-label">Problem</span>
                <h3>Residents are forced to make trust decisions with weak signals.</h3>
                <p>Unexpected entry requests happen in real time. Most buildings give the resident a buzzer, not a verification workflow.</p>
              </div>

              <div className="story-card solution">
                <span className="story-label">Product</span>
                <h3>Capture the claim, check the records, return the action.</h3>
                <p>DoorWise turns voice, records, and ID review into a simple next step before access is granted.</p>
              </div>

              <div className="story-strip">
                <div className="story-outcome caution">
                  <span>Management</span>
                  <strong>CALL TO CONFIRM</strong>
                </div>
                <div className="story-outcome danger">
                  <span>Unverified claim</span>
                  <strong>DO NOT OPEN</strong>
                </div>
                <div className="story-outcome success">
                  <span>Trusted ID</span>
                  <strong>PROCEED AFTER ID CHECK</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="thesis" className="pitch-section">
        <div className="section-header">
          <span className="section-eyebrow">Investment Thesis</span>
          <h2 className="section-title">Not another intercom. A decision layer before entry.</h2>
          <p className="section-copy">
            DoorWise fits as software on top of already-validated access infrastructure. The product is not trying to be
            general concierge AI or building hardware. It is focused trust-and-safety software for a narrow, repeated,
            valuable decision.
          </p>
        </div>

        <div className="thesis-layout">
          <div className="glass-panel thesis-lead">
            <span className="story-label">The pitch in one sentence</span>
            <h3>Before a resident opens the door, DoorWise verifies the claim and tells them exactly what to do next.</h3>
            <p>
              The product starts with NYC multifamily housing because the records are available, the use case is concrete,
              and the compliance context is real. That gives DoorWise a believable first wedge instead of a vague
              “AI security” story.
            </p>
            <div className="thesis-callouts">
              <div className="callout-pill">
                <MapPin size={16} />
                NYC-focused first
              </div>
              <div className="callout-pill">
                <Building size={16} />
                Multifamily workflow
              </div>
              <div className="callout-pill">
                <ShieldAlert size={16} />
                Safety before access
              </div>
            </div>
          </div>

          <div className="thesis-grid">
            {thesisCards.map((card) => {
              const Icon = card.icon;
              return (
                <div className="glass-panel thesis-card" key={card.title}>
                  <div className="feature-icon investor">
                    <Icon size={28} />
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="product" className="pitch-section">
        <div className="section-header">
          <span className="section-eyebrow">Product</span>
          <h2 className="section-title">What the MVP already proves</h2>
          <p className="section-copy">
            The current product already demonstrates the wedge cleanly: voice-first intake, record-backed verification,
            conservative decisions, and a trusted-ID path for approved organizations like NYU.
          </p>
        </div>

        <div className="feature-grid investor-grid">
          {productCards.map((card) => {
            const Icon = card.icon;
            return (
              <div className="feature-card glass-panel" key={card.title}>
                <div className="feature-icon blue">
                  <Icon size={32} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="demo" className="pitch-section demo-section">
        <div className="section-header">
          <span className="section-eyebrow">Live Demo</span>
          <h2 className="section-title">Three scenarios that tell the whole story</h2>
          <p className="section-copy">
            The investor demo should show that DoorWise is conservative, operational, and capable of improving confidence
            when the building has stronger policy signals.
          </p>
        </div>

        <div className="demo-scenario-grid">
          {demoScenarios.map((scenario) => (
            <div className="glass-panel demo-scenario-card" key={scenario.title}>
              <span className="scenario-eyebrow">{scenario.eyebrow}</span>
              <h3>{scenario.title}</h3>
              <div className="scenario-claim">{scenario.claim}</div>
              <div className="scenario-result">{scenario.result}</div>
              <p>{scenario.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="moat" className="pitch-section">
        <div className="section-header">
          <span className="section-eyebrow">Defensible Layer</span>
          <h2 className="section-title">Why this is more than a voice wrapper</h2>
          <p className="section-copy">
            DoorWise compounds through building context, structured callbacks, trusted-ID policies, and public-record
            integration. The value is not just that it hears the claim. The value is that it turns weak signals into a
            useful decision.
          </p>
        </div>

        <div className="dataset-grid">
          {datasets.map((dataset) => (
            <div className="glass-panel dataset-card" key={dataset.id}>
              <div className="dataset-id">{dataset.id}</div>
              <h3>{dataset.name}</h3>
              <p>{dataset.note}</p>
            </div>
          ))}
        </div>

        <div className="expansion-grid">
          {expansionCards.map((card) => (
            <div className="glass-panel expansion-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pitch-section closing-section">
        <div className="glass-panel closing-card">
          <span className="section-eyebrow">Closing Thesis</span>
          <h2 className="section-title">The wedge is narrow on purpose.</h2>
          <p className="section-copy">
            DoorWise starts with one sharp question: should this person get building access right now? That gives the
            company a credible NYC entry wedge, a clean investor demo, and a path to compound into broader building
            operations over time.
          </p>

          <div className="cta-group center">
            <Link to="/setup" className="btn-primary">
              Walk The Live Demo <ArrowRight size={20} />
            </Link>
            <a
              className="btn-secondary"
              href="https://github.com/zhongnz/doorwise"
              target="_blank"
              rel="noreferrer"
            >
              Review The Repo
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
