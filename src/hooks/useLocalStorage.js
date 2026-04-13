import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '../lib/constants';

/**
 * Custom hook for persisting state to localStorage
 * @param {string} key - The localStorage key
 * @param {any} initialValue - Default value if key doesn't exist
 * @returns {[any, function, function]} - [value, setValue, removeValue]
 */
export const useLocalStorage = (key, initialValue) => {
  // Get initial value from localStorage or use default
  const readValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState(readValue);

  // Persist to localStorage whenever value changes
  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // Dispatch event for cross-tab synchronization
        window.dispatchEvent(new StorageEvent('storage', { key }));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [initialValue, key]);

  // Sync with other tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch {
          setStoredValue(event.newValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
};

/**
 * Hook for managing multiple buildings
 */
export const useBuildings = () => {
  const [buildings, setBuildings] = useLocalStorage(STORAGE_KEYS.buildings, []);
  const [activeBuildingId, setActiveBuildingId] = useLocalStorage(STORAGE_KEYS.activeBuilding, null);

  const activeBuilding = buildings.find(b => b.id === activeBuildingId) || buildings[0] || null;

  const addBuilding = useCallback((building) => {
    const newBuilding = {
      ...building,
      id: `bldg_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setBuildings(prev => [...prev, newBuilding]);
    setActiveBuildingId(newBuilding.id);
    return newBuilding;
  }, [setBuildings, setActiveBuildingId]);

  const updateBuilding = useCallback((id, updates) => {
    setBuildings(prev => prev.map(b => 
      b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
    ));
  }, [setBuildings]);

  const removeBuilding = useCallback((id) => {
    setBuildings(prev => {
      const filtered = prev.filter(b => b.id !== id);
      if (activeBuildingId === id && filtered.length > 0) {
        setActiveBuildingId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeBuildingId, setBuildings, setActiveBuildingId]);

  const switchBuilding = useCallback((id) => {
    if (buildings.some(b => b.id === id)) {
      setActiveBuildingId(id);
    }
  }, [buildings, setActiveBuildingId]);

  return {
    buildings,
    activeBuilding,
    activeBuildingId,
    addBuilding,
    updateBuilding,
    removeBuilding,
    switchBuilding,
  };
};

/**
 * Hook for managing incident log with per-building support
 */
export const useIncidentLog = (buildingId = null) => {
  const key = buildingId 
    ? `${STORAGE_KEYS.incidents}_${buildingId}` 
    : STORAGE_KEYS.incidents;
  
  const [incidents, setIncidents] = useLocalStorage(key, []);

  const addIncident = useCallback((incident) => {
    const newIncident = {
      ...incident,
      id: `inc_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setIncidents(prev => [newIncident, ...prev].slice(0, 50)); // Keep last 50
    return newIncident;
  }, [setIncidents]);

  const clearIncidents = useCallback(() => {
    setIncidents([]);
  }, [setIncidents]);

  const getIncidentsByDate = useCallback((date) => {
    const targetDate = new Date(date).toDateString();
    return incidents.filter(i => new Date(i.timestamp).toDateString() === targetDate);
  }, [incidents]);

  const getIncidentStats = useCallback(() => {
    const stats = {
      total: incidents.length,
      byDecision: {},
      byPlaybook: {},
      today: 0,
      thisWeek: 0,
    };

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));

    incidents.forEach(incident => {
      // Count by decision
      const decision = incident.decision || 'UNKNOWN';
      stats.byDecision[decision] = (stats.byDecision[decision] || 0) + 1;

      // Count by playbook
      const playbook = incident.playbook || 'manual-review';
      stats.byPlaybook[playbook] = (stats.byPlaybook[playbook] || 0) + 1;

      // Count today/this week
      const timestamp = new Date(incident.timestamp);
      if (timestamp >= todayStart) {
        stats.today++;
      }
      if (timestamp >= weekStart) {
        stats.thisWeek++;
      }
    });

    return stats;
  }, [incidents]);

  return {
    incidents,
    addIncident,
    clearIncidents,
    getIncidentsByDate,
    getIncidentStats,
  };
};

export default useLocalStorage;
