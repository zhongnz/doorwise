export const terminalDecisions = ['PROCEED_AFTER_ID_CHECK', 'CALL_TO_CONFIRM', 'DO_NOT_OPEN'];

export const normalizeConversationText = (text = '') => text
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const isMeaningfulVisitorMessage = (text = '') => {
  const normalized = normalizeConversationText(text);
  if (!normalized) {
    return false;
  }

  if (normalized === 'noise' || normalized === 'hello noise') {
    return false;
  }

  if (normalized.length >= 3) {
    return true;
  }

  return /\d/.test(normalized);
};

export const buildVisitorClaimSummary = (messages) => messages
  .filter(isMeaningfulVisitorMessage)
  .map((message) => message.trim())
  .filter(Boolean)
  .join(' ');

export const agentRequestedVerification = (text = '') => {
  const normalized = normalizeConversationText(text);
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes('hold on')
    || normalized.includes('hold on a moment')
    || normalized.includes('please wait')
    || normalized.includes('one moment')
  );
};

export const inferClaimFromVisitorTranscript = (messages) => {
  const combinedText = normalizeConversationText(buildVisitorClaimSummary(messages));
  if (!combinedText) {
    return null;
  }

  const fingerprint = (signature) => `auto:${signature}:${combinedText}`;

  if (
    combinedText.includes('landlord')
    || combinedText.includes('management')
    || combinedText.includes('owner')
    || combinedText.includes('super')
    || combinedText.includes('property manager')
  ) {
    return {
      claim: 'Management representative requesting entry',
      signature: 'management',
      fingerprint: fingerprint('management'),
    };
  }

  if (
    combinedText.includes('contractor')
    || combinedText.includes('repair')
    || combinedText.includes('maintenance')
    || combinedText.includes('plumber')
    || combinedText.includes('electrician')
    || combinedText.includes('vendor')
    || combinedText.includes('permit')
    || combinedText.includes('construction')
  ) {
    return {
      claim: 'Contractor or repair vendor requesting building access',
      signature: 'contractor',
      fingerprint: fingerprint('contractor'),
    };
  }

  if (
    combinedText.includes('hpd')
    || combinedText.includes('dob')
    || combinedText.includes('housing preservation')
    || combinedText.includes('department of buildings')
    || (combinedText.includes('inspector') && combinedText.includes('inspection'))
  ) {
    return {
      claim: 'City inspector requesting building access',
      signature: 'inspector',
      fingerprint: fingerprint('inspector'),
    };
  }

  return null;
};
