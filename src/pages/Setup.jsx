import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Building, MapPin, ShieldCheck } from 'lucide-react';
import './Setup.css';

const initialAddress = {
  houseNumber: '',
  street: '',
  borough: '',
  apartment: '',
};

const demoAddress = {
  houseNumber: '370',
  street: 'Jay Street',
  borough: 'BROOKLYN',
  apartment: '317',
};

const initialBuildingContext = {
  building_name: '',
  management_phone: '',
  super_phone: '',
  approved_vendors_input: '',
  trusted_id_organizations_input: '',
};

const demoBuildingContext = {
  building_name: '370 Jay Street Apartments',
  management_phone: '212-555-0100',
  super_phone: '646-555-0111',
  approved_vendors_input: 'Ace Plumbing, BrightWire Electric',
  trusted_id_organizations_input: 'New York University, NYU',
};

const storageKeys = {
  address: 'doorwise_address',
  addressValidation: 'doorwise_address_validation',
  buildingContext: 'doorwise_building_context',
};

const AddressSetup = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState(initialAddress);
  const [buildingContext, setBuildingContext] = useState(initialBuildingContext);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    setAddress({
      ...address,
      [event.target.name]: event.target.value,
    });
  };

  const handleBuildingContextChange = (event) => {
    setBuildingContext({
      ...buildingContext,
      [event.target.name]: event.target.value,
    });
  };

  const handleUseDemoBuilding = () => {
    setAddress(demoAddress);
    setBuildingContext(demoBuildingContext);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const response = await fetch('/api/address/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(address),
      });

      if (!response.ok) {
        throw new Error('Could not check this address against the available city records.');
      }

      const data = await response.json();
      const normalizedBuildingContext = {
        building_name: buildingContext.building_name.trim(),
        management_phone: buildingContext.management_phone.trim(),
        super_phone: buildingContext.super_phone.trim(),
        approved_vendors: buildingContext.approved_vendors_input
          .split(/[,\n;]/)
          .map((value) => value.trim())
          .filter(Boolean),
        trusted_id_organizations: buildingContext.trusted_id_organizations_input
          .split(/[,\n;]/)
          .map((value) => value.trim())
          .filter(Boolean),
      };

      localStorage.setItem(storageKeys.address, JSON.stringify(data.address));
      localStorage.setItem(storageKeys.addressValidation, JSON.stringify(data));
      localStorage.setItem(storageKeys.buildingContext, JSON.stringify(normalizedBuildingContext));
      navigate('/dashboard');
    } catch (validationError) {
      setError(validationError.message || 'City record check failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-nav">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <ShieldCheck className="logo-icon" size={24} />
          <span className="logo-text" style={{ fontSize: '1.25rem' }}>DoorWise</span>
        </div>
      </div>

      <div className="setup-content">
        <div className="setup-card glass-panel">
          <div className="setup-header">
            <div className="icon-wrapper">
              <MapPin size={32} color="var(--accent-blue)" />
            </div>
            <h2>Set Up Your Door</h2>
            <p>
              Enter your NYC address to anchor verification checks. DoorWise will look for matching public city
              records before opening the live workflow.
            </p>
            <div className="setup-header-actions">
              <button type="button" className="btn-secondary demo-fill-button" onClick={handleUseDemoBuilding}>
                Use Demo Building
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="setup-form">
            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="houseNumber">House / Building Number</label>
                <input
                  id="houseNumber"
                  type="text"
                  name="houseNumber"
                  value={address.houseNumber}
                  onChange={handleChange}
                  placeholder="e.g. 1520"
                  required
                />
              </div>
              <div className="form-group flex-2">
                <label htmlFor="street">Street Name</label>
                <input
                  id="street"
                  type="text"
                  name="street"
                  value={address.street}
                  onChange={handleChange}
                  placeholder="e.g. GRAND CONCOURSE"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-2">
                <label htmlFor="borough">Borough</label>
                <div className="select-wrapper">
                  <select id="borough" name="borough" value={address.borough} onChange={handleChange} required>
                    <option value="" disabled>Select a borough</option>
                    <option value="MANHATTAN">Manhattan</option>
                    <option value="BROOKLYN">Brooklyn</option>
                    <option value="QUEENS">Queens</option>
                    <option value="BRONX">The Bronx</option>
                    <option value="STATEN ISLAND">Staten Island</option>
                  </select>
                </div>
              </div>
              <div className="form-group flex-1">
                <label htmlFor="apartment">Apt / Unit</label>
                <input
                  id="apartment"
                  type="text"
                  name="apartment"
                  value={address.apartment}
                  onChange={handleChange}
                  placeholder="e.g. 4B"
                />
              </div>
            </div>

            <div className="data-disclaimer">
              <Building size={16} />
              <span>
                DoorWise checks whether this address has matching city records from HPD, HPD registration data, and
                DOB NOW permits. Add optional building contacts below if you want callback-based decisions instead of
                public-data-only review.
              </span>
            </div>

            <div className="building-context-panel">
              <div className="building-context-header">
                <Building size={16} />
                <span>Building Context For Better Decisions</span>
              </div>

              <div className="form-group">
                <label htmlFor="building_name">Building Name (Optional)</label>
                <input
                  id="building_name"
                  type="text"
                  name="building_name"
                  value={buildingContext.building_name}
                  onChange={handleBuildingContextChange}
                  placeholder="e.g. 370 Jay Street Apartments"
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="management_phone">Management Phone (Optional)</label>
                  <input
                    id="management_phone"
                    type="text"
                    name="management_phone"
                    value={buildingContext.management_phone}
                    onChange={handleBuildingContextChange}
                    placeholder="e.g. 212-555-0100"
                  />
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="super_phone">Super Phone (Optional)</label>
                  <input
                    id="super_phone"
                    type="text"
                    name="super_phone"
                    value={buildingContext.super_phone}
                    onChange={handleBuildingContextChange}
                    placeholder="e.g. 646-555-0111"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="approved_vendors_input">Approved Vendors (Optional)</label>
                <textarea
                  id="approved_vendors_input"
                  name="approved_vendors_input"
                  value={buildingContext.approved_vendors_input}
                  onChange={handleBuildingContextChange}
                  placeholder="Comma-separated vendor names, like Ace Plumbing, BrightWire Electric"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="trusted_id_organizations_input">Trusted ID Organizations (Optional)</label>
                <textarea
                  id="trusted_id_organizations_input"
                  name="trusted_id_organizations_input"
                  value={buildingContext.trusted_id_organizations_input}
                  onChange={handleBuildingContextChange}
                  placeholder="Comma-separated organizations allowed by ID, like New York University, NYU"
                  rows="2"
                />
              </div>

              <div className="building-context-note">
                DoorWise can use these contacts, vendor names, and trusted ID organizations to suggest who to call,
                when a contractor looks expected, and when a verified badge can raise confidence.
              </div>
            </div>

            {error ? (
              <div className="form-error">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            ) : null}

            <button type="submit" className="btn-primary w-full" disabled={isVerifying}>
              {isVerifying ? (
                <span className="loading-state">
                  <div className="spinner"></div>
                  Checking City Records...
                </span>
              ) : (
                <>
                  Activate DoorWise <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddressSetup;
