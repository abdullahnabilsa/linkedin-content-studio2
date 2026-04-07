/**
 * Private Chat API Route
 * 
 * Uses the user's OWN API key (no rate limiting).
 * Keys are decrypted server-side, sent encrypted to Worker,
 * or decrypted in-route if Worker is not configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { decrypt } from '@/lib/encryption';

/** Platform-specific API endpoint configurations */
const PLATFORM_ENDPOINTS: Record<string, {
  baseUrl: string;
  chatPath: string;
  buildHeaders: (key: string) => Record<string, string>;
  buildBody: (messages: MessagePayload[], model: string, temperature: number, maxTokens: number) => Record<string, unknown>;
  transformStream?: boolean;
}> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    chatPath: '/chat/completions',
    buildHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    buildBody: (messages, model, temperature, maxTokens) => ({
      model,
      messages,
      stream: true,
      temperature,
      max_tokens: maxTokens,
      stream_options: { include_usage: true },
    }),
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    chatPath: '/chat/completions',
    buildHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://contentpro.app',
      'X-Title': 'ContentPro',
    }),
    buildBody: (messages, model, temperature, maxTokens) => ({
      model,
      messages,
      stream: true,
      temperature,
      max_tokens: maxTokens,
    }),
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    chatPath: '/chat/completions',
    buildHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    buildBody: (messages, model, temperature, maxTokens) => ({
      model,
      messages,
      stream: true,
      temperature,
      max_tokens: maxTokens,
    }),
  },
  together: {
    baseUrl: 'https://api.together.xyz/v1',
    chatPath: '/chat/completions',
    buildHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    buildBody: (messages, model, temperature, maxTokens) => ({
      model,
      messages,
      stream: true,
      temperature,
      max_tokens: maxTokens,
    }),
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    chatPath: '/chat/completions',
    buildHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    buildBody: (messages, model, temperature, maxTokens) => ({
      model,
      messages,
      stream: true,
      temperature,
      max_tokens: maxTokens,
    }),
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    chatPath: '/messages',
    buildHeaders: (key) => ({
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (messages, model, temperature, maxTokens) => {
      let systemPrompt = '';
      const filtered: Array<{ role: string; content: string }> = [];
      for (const msg of messages) {
        if (msg.role === 'system') {
          systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
        } else {
          filtered.push({ role: msg.role, content: msg.content });
        }
      }
      /* Ensure alternating roles */
      const normalized: Array<{ role: string; content: string }> = [];
      for (const msg of filtered) {
        const prev = normalized[normalized.length - 1];
        if (prev && prev.role === msg.role) {
          prev.content += '\n\n' + msg.content;
        } else {
          normalized.push({ ...msg });
        }
      }
      if (normalized.length > 0 && normalized[0].role !== 'user') {
        normalized.unshift({ role: 'user', content: 'Hello.' });
      }
      return {
        model,
        messages: normalized,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        stream: true,
        temperature,
        max_tokens: maxTokens,
      };
    },
    transformStream: true,
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    chatPath: '',
    buildHeaders: (_key) => ({
      'Content-Type': 'application/json',
    }),
    buildBody: (messages, _model, temperature, maxTokens) => {
      let systemInstruction = '';
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
      for (const msg of messages) {
        if (msg.role === 'system') {
          systemInstruction += (systemInstruction ? '\n\n' : '') + msg.content;
        } else {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }
      if (contents.length > 0 && contents[0].role !== 'user') {
        contents.unshift({ role: 'user', parts: [{ text: 'Hello.' }] });
      }
      const body: Record<string, unknown> = {
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      };
      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
      }
      return body;
    },
    transformStream: true,
  },
};

interface MessagePayload {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages: MessagePayload[];
  model: string;
  platform: string;
  personaId?: string;
  formatTemplate?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Transforms Anthropic SSE stream to OpenAI-compatible format.
 */
function transformAnthropicSSE(reader: ReadableStreamDefaultReader<Uint8Array>): ReadableStream {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'content_block_delta' && event.delta?.text) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: event.delta.text }, index: 0, finish_reason: null }] })}\n\n`
              ));
            }
            if (event.type === 'message_stop') {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ choices: [{ delta: {}, index: 0, finish_reason: 'stop' }] })}\n\n`
              ));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }
            if (event.type === 'message_delta' && event.usage) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
                  usage: {
                    prompt_tokens: event.usage.input_tokens || 0,
                    completion_tokens: event.usage.output_tokens || 0,
                    total_tokens: (event.usage.input_tokens || 0) + (event.usage.output_tokens || 0),
                  },
                })}\n\n`
              ));
            }
          } catch {
            /* Skip unparseable lines */
          }
        }
      }
    },
  });
}

/**
 * Transforms Gemini SSE stream to OpenAI-compatible format.
 */
function transformGeminiSSE(reader: ReadableStreamDefaultReader<Uint8Array>): ReadableStream {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);
            const text = event?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: text }, index: 0, finish_reason: null }] })}\n\n`
              ));
            }
            const finishReason = event?.candidates?.[0]?.finishReason;
            if (finishReason && finishReason !== 'FINISH_REASON_UNSPECIFIED') {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ choices: [{ delta: {}, index: 0, finish_reason: 'stop' }] })}\n\n`
              ));
            }
          } catch {
            /* Skip unparseable */
          }
        }
      }
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, data: null, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ChatRequestBody;
    const { messages, model, platform, personaId, formatTemplate, temperature, maxTokens } = body;

    if (!messages || !model || !platform) {
      return NextResponse.json(
        { success: false, data: null, message: 'Missing required fields: messages, model, platform' },
        { status: 400 }
      );
    }

    const platformConfig = PLATFORM_ENDPOINTS[platform];
    if (!platformConfig) {
      return NextResponse.json(
        { success: false, data: null, message: `Unsupported platform: ${platform}` },
        { status: 400 }
      );
    }

    /* Fetch user's private API key for this platform */
    const { data: keyRow, error: keyError } = await supabase
      .from('api_keys')
      .select('id, encrypted_key, platform')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('is_active', true)
      .eq('is_global', false)
      .single();

    if (keyError || !keyRow) {
      return NextResponse.json(
        { success: false, data: null, message: `No private API key found for ${platform}. Add one in Settings.` },
        { status: 404 }
      );
    }

    /* Decrypt the API key server-side */
    let apiKey: string;
    try {
      apiKey = decrypt(keyRow.encrypted_key);
    } catch {
      return NextResponse.json(
        { success: false, data: null, message: 'Failed to decrypt API key. Please re-add your key in Settings.' },
        { status: 500 }
      );
    }

    /* Update last_used_at */
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRow.id);

    /* Build the full messages array with persona + profile context */
    const fullMessages: MessagePayload[] = [];

    /* Add persona system prompt if specified */
    if (personaId) {
      const { data: persona } = await supabase
        .from('personas')
        .select('system_prompt, name')
        .eq('id', personaId)
        .eq('is_active', true)
        .single();

      if (persona?.system_prompt) {
        fullMessages.push({ role: 'system', content: persona.system_prompt });
      }
    }

    /* Add user professional profile context */
    const { data: profile } = await supabase
      .from('user_professional_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      const profileParts: string[] = [];
      if (profile.full_name) profileParts.push(`Name: ${profile.full_name}`);
      if (profile.job_title) profileParts.push(`Job Title: ${profile.job_title}`);
      if (profile.company) profileParts.push(`Company: ${profile.company}`);
      if (profile.industry) profileParts.push(`Industry: ${profile.industry}`);
      if (profile.expertise_areas?.length) profileParts.push(`Expertise: ${profile.expertise_areas.join(', ')}`);
      if (profile.target_audience_description) profileParts.push(`Target Audience: ${profile.target_audience_description}`);
      if (profile.preferred_tone) profileParts.push(`Writing Tone: ${profile.preferred_tone}`);
      if (profile.preferred_post_length) profileParts.push(`Preferred Post Length: ${profile.preferred_post_length}`);
      if (profile.emoji_usage) profileParts.push(`Emoji Usage: ${profile.emoji_usage}`);
      if (profile.writing_samples) profileParts.push(`Writing Style Reference:\n${profile.writing_samples}`);
      if (profile.has_product && profile.product_name) {
        profileParts.push(`Product/Service: ${profile.product_name}`);
        if (profile.product_description) profileParts.push(`Product Description: ${profile.product_description}`);
        if (profile.product_value_proposition) profileParts.push(`Value Proposition: ${profile.product_value_proposition}`);
      }

      if (profileParts.length > 0) {
        fullMessages.push({
          role: 'system',
          content: `Here is the user's professional profile for context. Use this to personalize content:\n\n${profileParts.join('\n')}`,
        });
      }
    }

    /* Add format template instruction if specified */
    if (formatTemplate) {
      fullMessages.push({
        role: 'system',
        content: `Format the response using this LinkedIn post template style: ${formatTemplate}`,
      });
    }

    /* Add conversation messages */
    fullMessages.push(...messages);

    /* Build the API request */
    const resolvedTemp = temperature ?? 0.7;
    const resolvedMaxTokens = maxTokens ?? 4096;
    const requestBody = platformConfig.buildBody(fullMessages, model, resolvedTemp, resolvedMaxTokens);

    let fetchUrl: string;
    if (platform === 'gemini') {
      fetchUrl = `${platformConfig.baseUrl}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
    } else {
      fetchUrl = `${platformConfig.baseUrl}${platformConfig.chatPath}`;
    }

    const aiResponse = await fetch(fetchUrl, {
      method: 'POST',
      headers: platformConfig.buildHeaders(apiKey),
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      let errorMessage = `AI provider returned ${aiResponse.status}`;

      if (aiResponse.status === 401 || aiResponse.status === 403) {
        errorMessage = 'Invalid or expired API key. Please update your key in Settings.';
      } else if (aiResponse.status === 402) {
        errorMessage = 'Insufficient API balance. Please top up your account.';
      } else if (aiResponse.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (aiResponse.status === 404) {
        errorMessage = `Model "${model}" not found on ${platform}.`;
      }

      return NextResponse.json(
        {
          success: false,
          data: null,
          message: errorMessage,
          error: process.env.NODE_ENV === 'development' ? errorText.substring(0, 500) : undefined,
        },
        { status: aiResponse.status }
      );
    }

    /* Stream the response back */
    if (!aiResponse.body) {
      return NextResponse.json(
        { success: false, data: null, message: 'No response body from AI provider' },
        { status: 502 }
      );
    }

    const reader = aiResponse.body.getReader();
    let responseStream: ReadableStream;

    if (platform === 'anthropic') {
      responseStream = transformAnthropicSSE(reader);
    } else if (platform === 'gemini') {
      responseStream = transformGeminiSSE(reader);
    } else {
      /* OpenAI-compatible — pass through */
      responseStream = new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          controller.enqueue(value);
        },
      });
    }

    return new NextResponse(responseStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}