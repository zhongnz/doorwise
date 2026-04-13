import { generateText, Output } from 'ai';
import { z } from 'zod';

export const config = {
  runtime: 'nodejs',
};

const IdReviewSchema = z.object({
  id_detected: z.boolean(),
  document_type: z.string().nullable(),
  person_name: z.string().nullable(),
  organization_name: z.string().nullable(),
  badge_or_employee_id: z.string().nullable(),
  expiration_visible: z.boolean(),
  expiration_status: z.enum(['valid', 'expired', 'not_visible', 'unclear']),
  evidence_quality: z.enum(['Excellent', 'Good', 'Fair', 'Poor']),
  is_government_id: z.boolean(),
  trusted_organization_match: z.string().nullable(),
  authenticity_concerns: z.string().nullable(),
  confidence: z.number(),
  summary: z.string(),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, mimeType, claim, address, buildingContext } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const trustedOrgs = buildingContext?.trusted_id_organizations?.length > 0
      ? buildingContext.trusted_id_organizations
      : ['HPD', 'DOB', 'FDNY', 'DEP', 'Con Edison', 'National Grid', 'NYPD', 'NYC Health'];

    const systemPrompt = `You are DoorWise Vision, an AI system that reviews ID documents for building access verification.

Your task is to analyze the ID image and extract:
1. Type of document (Government Badge, Driver License, Employee ID, etc.)
2. Person's name
3. Organization name (if visible)
4. Badge or employee ID number
5. Expiration status
6. Image quality assessment
7. Whether this matches a trusted organization

Trusted organizations for this building: ${trustedOrgs.join(', ')}

The visitor claimed: "${claim || 'Not specified'}"
Building: ${address?.label || 'NYC Building'}

Be thorough but fair. Look for:
- Official government seals or logos
- Holographic elements (describe if visible)
- Photo matching (note if you can see the holder)
- Any signs of tampering or forgery
- Whether the ID matches the visitor's stated purpose

If you cannot read something clearly, say so. Do not make up information.`;

    const result = await generateText({
      model: 'openai/gpt-4o',
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this ID document and provide your assessment.',
            },
            {
              type: 'image',
              image: imageBase64,
              mimeType: mimeType || 'image/jpeg',
            },
          ],
        },
      ],
      output: Output.object({ schema: IdReviewSchema }),
    });

    const idReview = result.object;

    // Determine policy decision based on ID review
    let policyDecision = null;
    let policyAction = null;
    let policyScript = null;

    if (idReview.id_detected && idReview.trusted_organization_match) {
      if (idReview.expiration_status === 'valid' || idReview.expiration_status === 'not_visible') {
        policyDecision = 'proceed';
        policyAction = `ID verified. ${idReview.trusted_organization_match} credentials confirmed.`;
        policyScript = `Your ${idReview.trusted_organization_match} ID has been verified. You may proceed.`;
      } else if (idReview.expiration_status === 'expired') {
        policyDecision = 'call_to_confirm';
        policyAction = `ID appears expired. Callback required to verify active status.`;
        policyScript = `This ID appears to be expired. I need to verify your current status with your organization.`;
      }
    } else if (idReview.id_detected && idReview.is_government_id) {
      policyDecision = 'proceed_after_id_check';
      policyAction = 'Government ID detected but not on trusted list. Visual verification required.';
      policyScript = 'I see your government ID. Let me verify your visit with building management.';
    }

    return res.status(200).json({
      success: true,
      ...idReview,
      model: 'GPT-4o Vision',
      policy_decision: policyDecision,
      policy_action: policyAction,
      policy_script: policyScript,
    });
  } catch (error) {
    console.error('ID review error:', error);
    return res.status(500).json({ 
      error: 'Failed to review ID',
      details: error.message 
    });
  }
}
