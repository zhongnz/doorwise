import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Plus, Check, Trash2 } from 'lucide-react';
import { STORAGE_KEYS } from '../../lib/constants';

/**
 * Multi-building switcher component for managing multiple properties
 */
export default function BuildingSwitcher({ 
  currentBuilding, 
  onBuildingChange,
  onAddBuilding,
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const dropdownRef = useRef(null);

  // Load buildings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.buildings);
      if (stored) {
        setBuildings(JSON.parse(stored));
      }
    } catch {
      setBuildings([]);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (building) => {
    onBuildingChange?.(building);
    setIsOpen(false);
  };

  const handleDelete = (e, buildingId) => {
    e.stopPropagation();
    const next = buildings.filter((b) => b.id !== buildingId);
    setBuildings(next);
    localStorage.setItem(STORAGE_KEYS.buildings, JSON.stringify(next));
    
    // If deleting current building, switch to first available
    if (currentBuilding?.id === buildingId && next.length > 0) {
      onBuildingChange?.(next[0]);
    }
  };

  const handleAddClick = () => {
    setIsOpen(false);
    onAddBuilding?.();
  };

  if (buildings.length <= 1 && !onAddBuilding) {
    return null;
  }

  const displayName = currentBuilding?.label || currentBuilding?.building_name || 'Select Building';

  return (
    <div className={`building-switcher ${className}`} ref={dropdownRef}>
      <button 
        className="switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Building2 size={16} className="switcher-icon" />
        <span className="switcher-label">{displayName}</span>
        <ChevronDown 
          size={14} 
          className={`switcher-chevron ${isOpen ? 'open' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="switcher-dropdown" role="listbox">
          {buildings.length === 0 ? (
            <div className="switcher-empty">No buildings configured</div>
          ) : (
            buildings.map((building) => {
              const isActive = building.id === currentBuilding?.id;
              const label = building.label || building.building_name || `${building.houseNumber} ${building.street}`;
              
              return (
                <button
                  key={building.id}
                  className={`switcher-option ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelect(building)}
                  role="option"
                  aria-selected={isActive}
                >
                  <div className="option-content">
                    {isActive && <Check size={14} className="option-check" />}
                    <span className="option-label">{label}</span>
                  </div>
                  {buildings.length > 1 && (
                    <button 
                      className="option-delete"
                      onClick={(e) => handleDelete(e, building.id)}
                      aria-label={`Remove ${label}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </button>
              );
            })
          )}

          {onAddBuilding && (
            <button className="switcher-add" onClick={handleAddClick}>
              <Plus size={14} />
              <span>Add Building</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
