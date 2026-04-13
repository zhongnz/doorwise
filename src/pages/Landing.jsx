import { Link } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing-container" style={{ minHeight: '100vh' }}>
      <nav className="nav-bar glass-panel">
        <div className="logo">
          <span className="logo-text">DoorWise</span>
        </div>
        <Link to="/setup" className="nav-cta">
          <button className="btn btn-primary">Launch App</button>
        </Link>
      </nav>

      <header className="hero">
        <div className="hero-content" style={{ display: 'block' }}>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
            The verification layer before entry.
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '600px' }}>
            DoorWise helps residents and building staff verify claimed management, 
            inspection, repair, and trusted-ID access before they open the door.
          </p>
          <Link to="/setup">
            <button className="btn btn-primary btn-lg">
              Open Live Product
            </button>
          </Link>
        </div>
      </header>

      <section className="section">
        <h2 style={{ marginBottom: '1rem' }}>Investment Thesis</h2>
        <p style={{ maxWidth: '600px' }}>
          Not another intercom. A decision layer before entry. DoorWise fits as 
          software on top of already-validated access infrastructure.
        </p>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <span>DoorWise - NYC-first building access verification</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
