# DoorWise Demo Script

This script is designed for the current MVP as it behaves today, not an idealized future version.

## Demo Goal

Show that DoorWise helps a resident or building staff member make a safer access decision before opening the door.

Core line:

`DoorWise listens to a claimed building-access request, checks trusted records, and tells the user what to do next.`

## Best Demo Setup

Use the built-in demo building in setup:

- house number: `370`
- street: `Jay Street`
- borough: `Brooklyn`
- apartment: `317`
- management phone: `212-555-0100`
- super phone: `646-555-0111`
- approved vendors: `Ace Plumbing, BrightWire Electric`

Current live backend behavior for that setup:

- management claim: `DO_NOT_OPEN`
- inspector claim: `DO_NOT_OPEN`
- contractor claim with `Ace Plumbing`: `CALL_TO_CONFIRM`
- unsupported delivery claim: `DO_NOT_OPEN`

That is okay for the demo. It reinforces that DoorWise is a verification layer, not a novelty chatbot that blindly approves entry.

## Recommended 3-Minute Demo

### 1. Open with the problem

Say:

`Residents are asked to make trust decisions at the door with incomplete information. DoorWise helps them verify building-related access claims before they let someone in.`

### 2. Show setup

On the setup page:

- click `Use Demo Building`
- point out the building contacts and approved vendors

Say:

`DoorWise starts with building context and public-record support, so it can tell the resident not just what it found, but who to call and what to say next.`

### 3. Move to the dashboard

On the dashboard:

- point to the camera panel
- point to the conversation panel
- point to the decision panel

Say:

`Voice is the primary intake path, but text remains available as a fallback. The important output is here on the right: why, what to say, what to do, and who to call.`

### 4. Run the strongest live-safe scenario

Use voice if the room is quiet. If not, type the claim.

Claim:

`Hi, I'm with Ace Plumbing. I'm here for a repair.`

Expected result today:

- `CALL TO CONFIRM`

What to say:

`This is exactly the behavior we want in a real building. DoorWise recognizes that the vendor looks familiar and there is permit activity at the address, but it still tells the resident to confirm before granting access.`

Then point to:

- `Why`
- `What To Say`
- `What To Do`
- `Who To Call`

### 5. Show the conservative safety posture

Click `Next Visitor`.

Use this claim:

`Jay Street Management is here for unit access.`

Expected result today:

- `DO_NOT_OPEN`

Say:

`DoorWise is intentionally conservative. If it cannot confirm the management claim through the available records, it tells the resident not to open and to verify through a trusted callback path.`

### 6. Close with the product thesis

Say:

`DoorWise is not an intercom company and not a general AI concierge. It is the verification layer before entry for management, inspection, and repair visits in multifamily housing.`

## Live Demo Tips

- Prefer a quiet room.
- Keep each spoken claim short and structured.
- If voice drifts, switch to text immediately instead of troubleshooting live.
- Treat the product as trust-and-safety software, not as a conversational showcase.
- Keep the story focused on one question: `Should I open the door?`

## Claims To Use

Recommended:

- `Hi, I'm with Ace Plumbing. I'm here for a repair.`
- `Jay Street Management is here for unit access.`

Avoid:

- delivery claims
- long noisy speech
- unsupported visitor categories
- trying to improvise a broad conversation

## Backup Narrative If Voice Misbehaves

Say:

`Voice is the fastest intake path, but the underlying value is the verification workflow. The text fallback uses the same decision engine and the same playbooks.`

Then type the claim and continue the demo without apology.
