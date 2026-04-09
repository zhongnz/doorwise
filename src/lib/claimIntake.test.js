import { describe, expect, it } from 'vitest';

import {
  agentRequestedIdReview,
  agentRequestedVerification,
  buildVisitorClaimSummary,
  inferClaimFromVisitorTranscript,
  isMeaningfulVisitorMessage,
  normalizeConversationText,
  terminalDecisions,
} from './claimIntake';

describe('claim intake helpers', () => {
  it('normalizes conversation text consistently', () => {
    expect(normalizeConversationText('  HPD! Inspector??  ')).toBe('hpd inspector');
  });

  it('filters empty and noisy visitor messages', () => {
    expect(isMeaningfulVisitorMessage('')).toBe(false);
    expect(isMeaningfulVisitorMessage('<noise>')).toBe(false);
    expect(isMeaningfulVisitorMessage('12')).toBe(true);
    expect(isMeaningfulVisitorMessage('Ace Plumbing')).toBe(true);
  });

  it('builds a summarized visitor claim from meaningful messages only', () => {
    expect(buildVisitorClaimSummary(['Hello.', '<noise>', 'I am with Amazon.', 'Delivering a package.']))
      .toBe('Hello. I am with Amazon. Delivering a package.');
  });

  it('infers contractor claims from meaningful transcript content', () => {
    expect(
      inferClaimFromVisitorTranscript(['hello', 'Ace Plumbing is here for a repair visit in 4B']),
    ).toMatchObject({
      signature: 'contractor',
      claim: 'Contractor or repair vendor requesting building access',
    });
  });

  it('requires a stronger inspection signal than the word inspection alone', () => {
    expect(inferClaimFromVisitorTranscript(['inspection today for 4B'])).toBeNull();
    expect(
      inferClaimFromVisitorTranscript(['I am the HPD inspector here for an inspection']),
    ).toMatchObject({
      signature: 'inspector',
    });
  });

  it('treats final verdicts as terminal session states', () => {
    expect(terminalDecisions).toEqual([
      'PROCEED_AFTER_ID_CHECK',
      'CALL_TO_CONFIRM',
      'DO_NOT_OPEN',
    ]);
  });

  it('detects when the agent has asked to verify or wait', () => {
    expect(agentRequestedVerification('Thanks, hold on a moment.')).toBe(true);
    expect(agentRequestedVerification('Please wait while I check.')).toBe(true);
    expect(agentRequestedVerification('What company are you with?')).toBe(false);
  });

  it('detects when the agent has asked for an ID or badge', () => {
    expect(agentRequestedIdReview('Please hold your ID to the camera.')).toBe(true);
    expect(agentRequestedIdReview('Show me your badge.')).toBe(true);
    expect(agentRequestedIdReview('What company are you with?')).toBe(false);
  });
});
