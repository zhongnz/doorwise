import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Database,
  Loader2,
} from 'lucide-react';

/**
 * Decision statuses and their configurations
 */
export const DECISION_STATUS = {
  LISTENING: 'LISTENING',
  VERIFYING: 'VERIFYING',
  PROCEED_AFTER_ID_CHECK: 'PROCEED_AFTER_ID_CHECK',
  CALL_TO_CONFIRM: 'CALL_TO_CONFIRM',
  DO_NOT_OPEN: 'DO_NOT_OPEN',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Terminal decisions that end a session
 */
export const TERMINAL_DECISIONS = [
  DECISION_STATUS.PROCEED_AFTER_ID_CHECK,
  DECISION_STATUS.CALL_TO_CONFIRM,
  DECISION_STATUS.DO_NOT_OPEN,
];

/**
 * Decision icons mapping
 */
export const DECISION_ICONS = {
  [DECISION_STATUS.LISTENING]: ShieldCheck,
  [DECISION_STATUS.VERIFYING]: Database,
  [DECISION_STATUS.PROCEED_AFTER_ID_CHECK]: ShieldCheck,
  [DECISION_STATUS.CALL_TO_CONFIRM]: ShieldAlert,
  [DECISION_STATUS.DO_NOT_OPEN]: ShieldX,
  [DECISION_STATUS.UNKNOWN]: ShieldAlert,
};

/**
 * Human-readable decision labels
 */
export const DECISION_LABELS = {
  [DECISION_STATUS.LISTENING]: 'Waiting',
  [DECISION_STATUS.VERIFYING]: 'Checking',
  [DECISION_STATUS.PROCEED_AFTER_ID_CHECK]: 'Proceed After ID Check',
  [DECISION_STATUS.CALL_TO_CONFIRM]: 'Call To Confirm',
  [DECISION_STATUS.DO_NOT_OPEN]: 'Do Not Open',
  [DECISION_STATUS.UNKNOWN]: 'Manual Review',
};

/**
 * Decision color variants for styling
 */
export const DECISION_VARIANTS = {
  [DECISION_STATUS.LISTENING]: 'info',
  [DECISION_STATUS.VERIFYING]: 'warning',
  [DECISION_STATUS.PROCEED_AFTER_ID_CHECK]: 'success',
  [DECISION_STATUS.CALL_TO_CONFIRM]: 'warning',
  [DECISION_STATUS.DO_NOT_OPEN]: 'danger',
  [DECISION_STATUS.UNKNOWN]: 'warning',
};

/**
 * ID alignment labels
 */
export const ID_ALIGNMENT_LABELS = {
  match: 'Matches claim',
  partial: 'Partially matches',
  mismatch: 'Does not match',
  unclear: 'Unclear match',
};

/**
 * NYC Boroughs
 */
export const NYC_BOROUGHS = [
  { value: 'MANHATTAN', label: 'Manhattan' },
  { value: 'BROOKLYN', label: 'Brooklyn' },
  { value: 'QUEENS', label: 'Queens' },
  { value: 'BRONX', label: 'The Bronx' },
  { value: 'STATEN ISLAND', label: 'Staten Island' },
];

/**
 * Playbook types
 */
export const PLAYBOOKS = {
  INSPECTOR: 'inspector',
  CONTRACTOR: 'contractor',
  MANAGEMENT: 'management',
  TRUSTED_ID: 'trusted-id',
  MANUAL_REVIEW: 'manual-review',
};

/**
 * Playbook labels
 */
export const PLAYBOOK_LABELS = {
  [PLAYBOOKS.INSPECTOR]: 'Inspector',
  [PLAYBOOKS.CONTRACTOR]: 'Contractor',
  [PLAYBOOKS.MANAGEMENT]: 'Management',
  [PLAYBOOKS.TRUSTED_ID]: 'Trusted ID',
  [PLAYBOOKS.MANUAL_REVIEW]: 'Manual Review',
};

/**
 * Demo building data for quick testing
 */
export const DEMO_BUILDING = {
  address: {
    houseNumber: '370',
    street: 'Jay Street',
    borough: 'BROOKLYN',
    apartment: '317',
  },
  context: {
    building_name: '370 Jay Street Apartments',
    management_phone: '212-555-0100',
    super_phone: '646-555-0111',
    approved_vendors_input: 'Ace Plumbing, BrightWire Electric',
    trusted_id_organizations_input: 'New York University, NYU',
  },
};

/**
 * Demo scenarios for showcasing the product
 */
export const DEMO_SCENARIOS = [
  {
    id: 'contractor',
    eyebrow: 'Scenario 01',
    title: 'Contractor visit',
    claim: '"Hi, I\'m with Ace Plumbing. I\'m here for a repair."',
    result: 'CALL TO CONFIRM',
    note: 'The vendor looks plausible, but DoorWise still requires callback confirmation before access.',
    playbook: PLAYBOOKS.CONTRACTOR,
  },
  {
    id: 'management',
    eyebrow: 'Scenario 02',
    title: 'Management claim',
    claim: '"Jay Street Management is here for unit access."',
    result: 'DO NOT OPEN',
    note: 'If management cannot be confidently matched through known records, the resident gets a conservative denial path.',
    playbook: PLAYBOOKS.MANAGEMENT,
  },
  {
    id: 'trusted-org',
    eyebrow: 'Scenario 03',
    title: 'Trusted organization',
    claim: '"I\'m with NYU and I\'m going to class."',
    result: 'ID REVIEW -> PROCEED AFTER ID CHECK',
    note: 'DoorWise can route trusted organizations into a badge check rather than a generic unsupported-claim loop.',
    playbook: PLAYBOOKS.TRUSTED_ID,
  },
];

/**
 * NYC Open Data datasets
 */
export const NYC_DATASETS = [
  {
    id: 'wvxf-dwi5',
    name: 'HPD Violations',
    description: 'Open and historical housing-code evidence tied to the address.',
  },
  {
    id: 'tesw-yqqr',
    name: 'Multiple Dwelling Registrations',
    description: 'Confirms whether a building has an active registration on file.',
  },
  {
    id: 'feu5-w2e2',
    name: 'Registration Contacts',
    description: 'Supports owner and managing-agent verification paths.',
  },
  {
    id: 'rbx6-tga4',
    name: 'DOB NOW Approved Permits',
    description: 'Supports contractor and repair claims with current permit activity.',
  },
];

/**
 * Investor metrics for landing page
 */
export const INVESTOR_METRICS = [
  { value: '4', label: 'NYC datasets in the current decision engine' },
  { value: '3', label: 'Core building-access playbooks shipped today' },
  { value: '1', label: 'Action returned before the resident opens the door' },
  { value: 'NYC', label: 'Focused starting wedge with real public records' },
];

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  VALIDATE_ADDRESS: '/api/address/validate',
  VERIFY: '/api/verify',
  REVIEW_ID: '/api/review-id',
  VOICE_WEBSOCKET: '/ws/chat',
};

/**
 * Connection states for voice
 */
export const CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
};

/**
 * Default transcript message
 */
export const DEFAULT_TRANSCRIPT = [
  { 
    role: 'agent', 
    text: 'DoorWise is ready. Tell me who is here and why they need building access.',
    finished: true,
  },
];

/**
 * Empty building context
 */
export const EMPTY_BUILDING_CONTEXT = {
  building_name: '',
  management_phone: '',
  super_phone: '',
  approved_vendors: [],
  trusted_id_organizations: [],
};

/**
 * Storage keys for localStorage
 */
export const STORAGE_KEYS = {
  address: 'doorwise_address',
  addressValidation: 'doorwise_address_validation',
  buildingContext: 'doorwise_building_context',
  incidents: 'doorwise_incidents',
  buildings: 'doorwise_buildings',
  activeBuilding: 'doorwise_active_building',
  onboardingComplete: 'doorwise_onboarding_complete',
  preferences: 'doorwise_preferences',
};
