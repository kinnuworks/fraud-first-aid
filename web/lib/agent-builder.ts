// One agent definition for every way in: the web call and the phone call share the same
// pipeline (Sarvam speech-to-text, our model route with complaint tools, Murf Falcon voice).
import { Agent, SarvamSTT, MurfTTS, OpenAI, type AgoraClient } from 'agora-agents';
import { fillerWords, SILENCE_PROMPT } from '@/lib/filler';
import { prototypeInstructions, type LangPreset } from '@/lib/agent-config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export type BuildOpts = {
  client: AgoraClient;
  preset: LangPreset;
  lang: string;
  langArg?: string;
  mode: 'guard' | 'complaint' | 'interpret';
  // Overrides the preset's greeting (the interpreter's 'call 1930 now' line).
  greeting?: string;
  channel: string;
  llmUrl?: string;
  surface: 'web' | 'phone';
  // Slower, clearer voice for older callers (Murf rate runs -50 to 50; 0 is normal).
  slow?: boolean;
};

export function buildAgent({ client, preset, lang, langArg, mode, channel: channel_name, llmUrl, surface, slow = false, greeting: greetingOverride }: BuildOpts) {
  const greeting = mode === 'guard' ? undefined : (greetingOverride ?? preset.greeting);
    // Pipeline: Sarvam speech-to-text (caller's language) → our model route with complaint
    // tools (or Agora's managed model before deploy) → Murf Falcon voice for that language.
  return new Agent({
      client,
      // With our route, the system prompt is built per turn server-side (lib/complaint/prompt.ts).
      instructions: llmUrl ? '' : prototypeInstructions(preset),
      greeting,
      failureMessage: 'Please wait a moment.',
      maxHistory: 50,
      // Complaint mode only: "one moment" in the caller's language while the model thinks (guard stays silent).
      ...(mode === 'complaint' ? { fillerWords: fillerWords(langArg === 'auto' ? 'auto' : lang) } : {}),
      // VAD controls how the agent detects the start and end of a user's turn.
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160, // ms of speech before interruption triggers
              prefix_padding_ms: 300, // audio captured before speech is detected
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: 480, // ms of silence before turn ends
            },
          },
        },
      },
      // RTM is required for transcript events in the browser client.
      // enable_tools is required for MCP tool invocation.
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      // Required for browser RTM events:
      // - data_channel: 'rtm' enables RTM delivery path for state/metrics/errors
      // - enable_error_message emits AGENT_ERROR payloads
      // - enable_metrics emits AGENT_METRICS latency payloads
      parameters: {
        // web client → ultra-low-latency chorus profile
        audio_scenario: surface === 'web' ? 'chorus' : 'default',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
        // a caller in shock who goes quiet gets a gentle prompt (complaint mode only)
        ...(mode === 'complaint' ? { silence_config: { timeout_ms: 20000, action: 'think' as const, content: SILENCE_PROMPT } } : {}),
      },
    })
      .withStt(
        new SarvamSTT({ apiKey: requireEnv('SARVAM_API_KEY'), language: preset.asrLanguage }),
      )
      .withLlm(
        llmUrl
          ? new OpenAI({
              url: `${llmUrl}/api/call/chat/completions?session=${channel_name}&lang=${langArg === 'auto' ? 'auto' : lang}&mode=${mode}`,
              apiKey: requireEnv('LLM_SHARED_SECRET'),
              model: 'custom',
              // On guard the agent stays quiet until it hears a red flag.
              greetingMessage: greeting,
              failureMessage: 'Please wait a moment.',
              maxHistory: 30,
            })
          : new OpenAI({
              model: 'gpt-4o-mini',
              greetingMessage: preset.greeting,
              failureMessage: 'Please wait a moment.',
              maxHistory: 15,
              params: { max_tokens: 1024, temperature: 0.7, top_p: 0.95 },
            }),
      )
      .withTts(
        new MurfTTS({
          key: requireEnv('MURF_API_KEY'),
          voiceId: preset.voiceId,
          locale: preset.locale,
          model: 'FALCON',
          sampleRate: 24000,
          ...(slow ? { rate: -20 } : {}),
        }),
      );
}
