import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Button, Card, Badge, Input, Select, Textarea, ProgressSteps, Alert, Pill } from '../components/common';
import { DEMO_BUILDING, NYC_BOROUGHS, STORAGE_KEYS } from '../lib/constants';
import './Setup.css';

const STEPS = ['Address', 'Building Context', 'Review'];

const initialAddress = {
  houseNumber: '',
  street: '',
  borough: '',
  apartment: '',
};

const initialBuildingContext = {
  building_name: '',
  management_phone: '',
  super_phone: '',
  approved_vendors_input: '',
  trusted_id_organizations_input: '',
};

const Setup = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [address, setAddress] = useState(initialAddress);
  const [buildingContext, setBuildingContext] = useState(initialBuildingContext);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleAddressChange = (e) => {
    setAddress(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleContextChange = (e) => {
    setBuildingContext(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUseDemoBuilding = () => {
    setAddress(DEMO_BUILDING.address);
    setBuildingContext(DEMO_BUILDING.context);
    setError('');
  };

  const canProceedStep1 = address.houseNumber && address.street && address.borough;
  
  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setIsVerifying(true);

    try {
      // Construct the address label
      const addressLabel = `${address.houseNumber} ${address.street}${address.apartment ? `, Apt ${address.apartment}` : ''}, ${address.borough}`;
      
      // Create the address object (works in demo mode without backend)
      const addressData = {
        ...address,
        label: addressLabel,
      };
      
      const normalizedBuildingContext = {
        building_name: buildingContext.building_name.trim() || addressLabel,
        management_phone: buildingContext.management_phone.trim(),
        super_phone: buildingContext.super_phone.trim(),
        approved_vendors: buildingContext.approved_vendors_input
          .split(/[,\n;]/)
          .map(v => v.trim())
          .filter(Boolean),
        trusted_id_organizations: buildingContext.trusted_id_organizations_input
          .split(/[,\n;]/)
          .map(v => v.trim())
          .filter(Boolean),
      };

      // Try to validate with backend, but proceed even if it fails (demo mode)
      try {
        const response = await fetch('/api/address/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(address),
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem(STORAGE_KEYS.address, JSON.stringify(data.address));
          localStorage.setItem(STORAGE_KEYS.addressValidation, JSON.stringify(data));
        } else {
          // Use local data in demo mode
          localStorage.setItem(STORAGE_KEYS.address, JSON.stringify(addressData));
        }
      } catch {
        // Backend unavailable - use local data (demo mode)
        localStorage.setItem(STORAGE_KEYS.address, JSON.stringify(addressData));
      }

      localStorage.setItem(STORAGE_KEYS.buildingContext, JSON.stringify(normalizedBuildingContext));
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="step-content animate-fade-in">
            <div className="step-header">
              <div className="step-icon blue">
                <MapPin size={28} />
              </div>
              <h2>Enter Your Address</h2>
              <p>
                DoorWise uses your NYC address to anchor verification checks against 
                public city records.
              </p>
            </div>

            <div className="form-grid">
              <div className="form-row">
                <Input
                  label="House / Building Number"
                  name="houseNumber"
                  value={address.houseNumber}
                  onChange={handleAddressChange}
                  placeholder="e.g. 370"
                  required
                />
                <Input
                  label="Street Name"
                  name="street"
                  value={address.street}
                  onChange={handleAddressChange}
                  placeholder="e.g. Jay Street"
                  required
                  className="flex-2"
                />
              </div>

              <div className="form-row">
                <Select
                  label="Borough"
                  name="borough"
                  value={address.borough}
                  onChange={handleAddressChange}
                  required
                  className="flex-2"
                >
                  <option value="" disabled>Select a borough</option>
                  {NYC_BOROUGHS.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </Select>
                <Input
                  label="Apt / Unit (Optional)"
                  name="apartment"
                  value={address.apartment}
                  onChange={handleAddressChange}
                  placeholder="e.g. 4B"
                />
              </div>
            </div>

            <div className="step-actions">
              <Button 
                variant="secondary" 
                onClick={handleUseDemoBuilding}
              >
                <Sparkles size={16} />
                Use Demo Building
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!canProceedStep1}
              >
                Continue <ArrowRight size={18} />
              </Button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="step-content animate-fade-in">
            <div className="step-header">
              <div className="step-icon amber">
                <Building size={28} />
              </div>
              <h2>Building Context</h2>
              <p>
                Add optional details to enable callback-based decisions and 
                trusted organization verification.
              </p>
            </div>

            <Alert variant="info" icon={Zap}>
              These fields are optional but enable more accurate verification decisions. 
              Skip if you want public-data-only review.
            </Alert>

            <div className="form-grid">
              <Input
                label="Building Name"
                name="building_name"
                value={buildingContext.building_name}
                onChange={handleContextChange}
                placeholder="e.g. 370 Jay Street Apartments"
                hint="Helps identify your building in the dashboard"
              />

              <div className="form-row">
                <Input
                  label="Management Phone"
                  name="management_phone"
                  value={buildingContext.management_phone}
                  onChange={handleContextChange}
                  placeholder="e.g. 212-555-0100"
                />
                <Input
                  label="Super Phone"
                  name="super_phone"
                  value={buildingContext.super_phone}
                  onChange={handleContextChange}
                  placeholder="e.g. 646-555-0111"
                />
              </div>

              <Textarea
                label="Approved Vendors"
                name="approved_vendors_input"
                value={buildingContext.approved_vendors_input}
                onChange={handleContextChange}
                placeholder="Comma-separated vendor names&#10;e.g. Ace Plumbing, BrightWire Electric"
                hint="Vendors that regularly service your building"
                rows={3}
              />

              <Textarea
                label="Trusted ID Organizations"
                name="trusted_id_organizations_input"
                value={buildingContext.trusted_id_organizations_input}
                onChange={handleContextChange}
                placeholder="Comma-separated organization names&#10;e.g. New York University, NYU"
                hint="Organizations whose IDs can be verified for access"
                rows={3}
              />
            </div>

            <div className="step-actions">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft size={18} /> Back
              </Button>
              <Button onClick={handleNext}>
                Continue <ArrowRight size={18} />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content animate-fade-in">
            <div className="step-header">
              <div className="step-icon green">
                <CheckCircle2 size={28} />
              </div>
              <h2>Review & Activate</h2>
              <p>
                Review your configuration before activating DoorWise for this building.
              </p>
            </div>

            <div className="review-grid">
              <Card className="review-card">
                <div className="review-card-header">
                  <MapPin size={18} className="text-blue" />
                  <span>Address</span>
                </div>
                <div className="review-card-body">
                  <strong>
                    {address.houseNumber} {address.street}
                    {address.apartment && `, Apt ${address.apartment}`}
                  </strong>
                  <span>{address.borough}</span>
                </div>
              </Card>

              <Card className="review-card">
                <div className="review-card-header">
                  <Building size={18} className="text-amber" />
                  <span>Building</span>
                </div>
                <div className="review-card-body">
                  <strong>{buildingContext.building_name || 'Not specified'}</strong>
                  <span>
                    {buildingContext.management_phone || buildingContext.super_phone 
                      ? 'Callback numbers configured'
                      : 'No callback numbers'}
                  </span>
                </div>
              </Card>

              <Card className="review-card">
                <div className="review-card-header">
                  <Users size={18} className="text-green" />
                  <span>Vendors & Organizations</span>
                </div>
                <div className="review-card-body">
                  <div className="review-pills">
                    {buildingContext.approved_vendors_input
                      .split(/[,\n;]/)
                      .filter(v => v.trim())
                      .slice(0, 3)
                      .map(v => <Pill key={v}>{v.trim()}</Pill>)}
                    {buildingContext.trusted_id_organizations_input
                      .split(/[,\n;]/)
                      .filter(v => v.trim())
                      .slice(0, 2)
                      .map(v => <Pill key={v}>{v.trim()}</Pill>)}
                    {!buildingContext.approved_vendors_input && !buildingContext.trusted_id_organizations_input && (
                      <span className="text-muted">None configured</span>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {error && (
              <Alert variant="error" icon={AlertTriangle}>
                {error}
              </Alert>
            )}

            <div className="step-actions">
              <Button variant="ghost" onClick={handleBack} disabled={isVerifying}>
                <ArrowLeft size={18} /> Back
              </Button>
              <Button onClick={handleSubmit} loading={isVerifying}>
                {isVerifying ? 'Validating...' : 'Activate DoorWise'}
                {!isVerifying && <ArrowRight size={18} />}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="setup-container">
      {/* Header */}
      <header className="setup-header">
        <Link to="/" className="logo">
          <ShieldCheck className="logo-icon" size={24} />
          <span className="logo-text">DoorWise</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="setup-main">
        <div className="setup-progress">
          <ProgressSteps steps={STEPS} currentStep={currentStep} />
          <span className="progress-label">
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
          </span>
        </div>

        <Card className="setup-card">
          {renderStepContent()}
        </Card>

        {/* Help Section */}
        <div className="setup-help">
          <p>
            DoorWise checks your address against HPD, registration data, and DOB permits 
            to enable record-backed verification decisions.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Setup;
