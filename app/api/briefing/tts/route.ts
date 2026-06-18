import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { serverEnv } from "@/lib/env";

/**
 * POST /api/briefing/tts
 *
 * Turns a single narration line into natural, human-sounding speech using
 * OpenAI's neural TTS, returning raw MP3 audio. The briefing player calls this
 * once per scene and plays the audio in sync with the visuals.
 *
 * Falls back gracefully: if no API key is configured, returns 503 so the client
 * can use the browser's built-in speech synthesis instead.
 */

const bodySchema = z.object({
  text: z.string().min(1).max(4000),
  /** Tone guidance for the steerable TTS model. */
  instructions: z.string().max(1000).optional(),
});

const DEFAULT_MODEL = "gpt-4o-mini-tts";
const DEFAULT_VOICE = "sage";

let _client: OpenAI | null = null;
function getClient(apiKey: string): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey });
  return _client;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Please sign in." } },
      { status: 401 },
    );
  }

  const env = serverEnv();
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "TTS_NOT_CONFIGURED",
          message: "Narration voice is not configured. Set OPENAI_API_KEY.",
        },
      },
      { status: 503 },
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "BAD_REQUEST", message: "Invalid request." } },
      { status: 400 },
    );
  }

  const model = env.OPENAI_TTS_MODEL?.trim() || DEFAULT_MODEL;
  const voice = env.OPENAI_TTS_VOICE?.trim() || DEFAULT_VOICE;
  const instructions =
    parsed.instructions ??
    "Speak like a warm, friendly financial storyteller guiding a friend through their portfolio. Calm, encouraging, and confident, with a natural conversational rhythm and gentle pauses. Sound human and personable — never robotic or monotone.";

  try {
    const client = getClient(apiKey);
    const speech = await client.audio.speech.create({
      model,
      voice,
      input: parsed.text,
      instructions,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to synthesize narration.";
    return NextResponse.json(
      { ok: false, error: { code: "TTS_ERROR", message } },
      { status: 502 },
    );
  }
}
