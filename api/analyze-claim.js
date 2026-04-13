import { generateText, Output } from 'ai';
import { z } from 'zod';

export const config = {
  runtime: 'nodejs',
};

const ClaimAnalysisSchema = z.object({
  claim_type: z.enum([
    'inspector',
    'delivery',
    'contractor',
    'visitor',
    'management',
    'emergency',
    'unknown'
  ]),
  person_name: z.string().nullable(),
  organization: z.string().nullable(),
  purpose: z.string().nullable(),
  apartment_reference: z.string().nullable(),
  urgency: z.enum(['low', 'medium', 'high']),
  confidence: z.number(),
  requires_id_check: z.boolean(),
  requires_callback: z.boolean(),
  recommended_action: z.string(),
  recommended_script: z.string(),
  reasoning: z.string(),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { claim, address, buildingContext } = req.body;

    if (!claim) {
      return res.status(400).json({ error: 'Claim is required' });
    }

    const systemPrompt = `You are DoorWise, an AI-powered building access verification assistant for NYC buildings.

Your job is to analyze visitor claims and determine:
1. What type of visitor this is (inspector, delivery, contractor, visitor, management, emergency, unknown)
2. Whether to allow entry, require ID verification, require a callback to confirm, or deny entry
3. What script the building staff should use to respond

Building Context:
- Address: ${address?.label || 'NYC Building'}
- Building Name: ${buildingContext?.building_name || 'Not specified'}
- Management Phone: ${buildingContext?.management_phone || 'Not available'}
- Super Phone: ${buildingContext?.super_phone || 'Not available'}
- Approved Vendors: ${buildingContext?.approved_vendors?.join(', ') || 'None specified'}
- Trusted ID Organizations: ${buildingContext?.trusted_id_organizations?.join(', ') || 'HPD, DOB, FDNY, Con Edison, National Grid'}

NYC Inspector Types to recognize:
- HPD (Housing Preservation & Development) - lead paint, housing violations
- DOB (Department of Buildings) - construction, permits, building safety
- FDNY - fire safety inspections
- DEP (Environmental Protection) - water, sewage
- Health Department - restaurant/food safety

For inspectors: Always require ID verification. Check if there's a matching violation or permit.
For deliveries: Usually allow with standard lobby drop-off.
For contractors: Require callback to management unless on approved vendor list.
For personal visitors: Require resident confirmation.
For management/staff: Require callback verification.
For emergencies: Assess urgency and respond appropriately.

Be conversational but professional. If the claim is vague or just a greeting, ask clarifying questions.`;

    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      system: systemPrompt,
      prompt: `Analyze this visitor claim: "${claim}"`,
      output: Output.object({ schema: ClaimAnalysisSchema }),
    });

    return res.status(200).json({
      success: true,
      analysis: result.object,
    });
  } catch (error) {
    console.error('Claim analysis error:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze claim',
      details: error.message 
    });
  }
}
