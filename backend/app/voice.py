import asyncio
from contextlib import AsyncExitStack
import json
import os
import traceback
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

# Initialize the router and Gemini client
router = APIRouter()

# Get the API key from environment
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    API_KEY = os.getenv("GOOGLE_API_KEY")

DEFAULT_MODEL_ID = "gemini-2.5-flash-native-audio-latest"
DEPRECATED_MODEL_ALIASES = {
    "gemini-2.0-flash-exp",
    "models/gemini-2.0-flash-exp",
    "gemini-2.0-flash-live-001",
    "models/gemini-2.0-flash-live-001",
}


def normalize_model_name(model_name: str | None) -> str:
    if not model_name:
        return DEFAULT_MODEL_ID

    normalized = model_name.strip()
    if normalized.startswith("models/"):
        normalized = normalized.removeprefix("models/")

    if model_name in DEPRECATED_MODEL_ALIASES or normalized in DEPRECATED_MODEL_ALIASES:
        return DEFAULT_MODEL_ID

    return normalized


MODEL_ID = normalize_model_name(os.getenv("GEMINI_LIVE_MODEL"))

async def receive_from_client(websocket: WebSocket, session):
    """Receive audio from the React frontend and send to Gemini"""
    try:
        while True:
            # Receive text or bytes from the frontend
            data = await websocket.receive()
            
            if "bytes" in data:
                # This is raw audio from the mic
                audio_bytes = data["bytes"]
                try:
                    await session.send_realtime_input(
                        audio=types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
                    )
                except Exception as e:
                    print(f"Error sending audio to Gemini: {e}")
                    break
            elif "text" in data:
                # This is a text message or system instruction
                text_msg = data["text"]
                print(f"Received text from client: {text_msg}")
                try:
                    payload = json.loads(text_msg)
                    payload_type = payload.get("type")
                    if payload_type in {"init", "message", "visitor_claim"}:
                        prompt_text = payload.get("text", "Hello")
                        print(f"Sending message to Gemini: {prompt_text}")
                        await session.send_client_content(
                            turns={"role": "user", "parts": [{"text": prompt_text}]},
                            turn_complete=True,
                        )
                except json.JSONDecodeError:
                    print(f"Sending raw text to Gemini: {text_msg}")
                    await session.send_client_content(
                        turns={"role": "user", "parts": [{"text": text_msg}]},
                        turn_complete=True,
                    )
                except Exception as e:
                    print(f"Error sending text to Gemini: {e}")
                    traceback.print_exc()
                    break
                    
    except WebSocketDisconnect:
        print("Client disconnected from WebSocket.")
    except RuntimeError as e:
        if 'disconnect message' not in str(e):
            print(f"Runtime error in receive_from_client: {e}")
            traceback.print_exc()
    except Exception as e:
        print(f"Error in receive_from_client: {e}")
        traceback.print_exc()

async def send_to_client(websocket: WebSocket, session):
    """Receive audio and text from Gemini and send to React frontend"""
    try:
        while True:
            received_turn = False

            async for response in session.receive():
                received_turn = True
                server_content = response.server_content
                if server_content is None:
                    continue

                if server_content.input_transcription and server_content.input_transcription.text:
                    await websocket.send_json({
                        "type": "text",
                        "role": "visitor",
                        "text": server_content.input_transcription.text,
                        "finished": bool(server_content.input_transcription.finished),
                    })

                if server_content.output_transcription and server_content.output_transcription.text:
                    await websocket.send_json({
                        "type": "text",
                        "role": "agent",
                        "text": server_content.output_transcription.text,
                        "finished": bool(server_content.output_transcription.finished),
                    })

                model_turn = server_content.model_turn
                if model_turn is not None:
                    for part in model_turn.parts:
                        # Stream audio back to the frontend for playback.
                        if part.inline_data:
                            await websocket.send_bytes(part.inline_data.data)

                if server_content.turn_complete:
                    await websocket.send_json({"type": "turn_complete"})

            if not received_turn:
                break
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"Error receiving from Gemini: {e}")
        traceback.print_exc()


async def connect_live_session(client, config, exit_stack: AsyncExitStack):
    model_candidates = [MODEL_ID]
    if MODEL_ID != DEFAULT_MODEL_ID:
        model_candidates.append(DEFAULT_MODEL_ID)
    if "gemini-3.1-flash-live-preview" not in model_candidates:
        model_candidates.append("gemini-3.1-flash-live-preview")

    last_error = None
    for model_name in model_candidates:
        try:
            print(f"Attempting to connect to Gemini Live (Model: {model_name})...")
            session = await exit_stack.enter_async_context(
                client.aio.live.connect(model=model_name, config=config)
            )
            return model_name, session
        except Exception as exc:
            last_error = exc
            print(f"Failed to connect with model {model_name}: {exc}")

    raise last_error

@router.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Websocket connection accepted.")
    
    if not API_KEY:
        print("Error: Gemini API key is not configured.")
        await websocket.send_json({"type": "error", "text": "Gemini API key is not configured."})
        await websocket.close()
        return
        
    try:
        client = genai.Client(api_key=API_KEY)
        print("Gemini client initialized.")
    except Exception as e:
        print(f"Failed to initialize Gemini client: {e}")
        await websocket.send_json({"type": "error", "text": f"Failed to initialize Gemini: {e}"})
        await websocket.close()
        return

    # Configuration for the DoorWise Persona
    system_instruction = """
    You are DoorWise, an AI assistant for a tenant living in NYC.
    A visitor is at the door. You are talking to them through an intercom.
    Your job is only to collect the visitor's identity and purpose in short, natural turns.
    This workflow currently supports three building-access playbooks: inspector, contractor, and management.

    Rules:
    - Ask one short follow-up question at a time.
    - Sound natural and conversational, not robotic or clipped.
    - Focus on name, agency or company, reason for visit, apartment number, and work order or badge number when relevant.
    - Keep each response brief, usually 6 to 18 words.
    - Do not repeat the same question with slightly different wording.
    - If the visitor sounds mid-sentence or uncertain, give them a beat before asking again.
    - Never claim that you checked records, confirmed appointments, or verified access.
    - Never say you are "checking now" or "confirming now".
    - Once you have the company or agency and the reason, say "Thanks, hold on a moment." and wait.
    - If the visitor is unclear, ask them to restate the company or agency and purpose plainly.
    - Do not improvise beyond these supported building-access categories.
    """
    
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        system_instruction=types.Content(parts=[types.Part.from_text(text=system_instruction)])
    )

    try:
        async with AsyncExitStack() as exit_stack:
            model_name, session = await connect_live_session(client, config, exit_stack)
            print(f"Successfully connected to Gemini Live API with {model_name}!")
            
            # Start concurrent tasks for bidi communication
            client_task = asyncio.create_task(receive_from_client(websocket, session))
            gemini_task = asyncio.create_task(send_to_client(websocket, session))
            
            # Wait for either to finish (or error out)
            done, pending = await asyncio.wait(
                [client_task, gemini_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel pending tasks
            for task in pending:
                task.cancel()
            
            # Wait for tasks to clean up
            await asyncio.gather(*pending, return_exceptions=True)
            print("Tasks completed/canceled.")
                
    except Exception as e:
        print(f"Failed to connect to Gemini Live: {e}")
        traceback.print_exc()
        await websocket.send_json({"type": "error", "text": f"Connection failed: {e}"})
        await websocket.close(code=1011)
    finally:
        print("Websocket closing.")
