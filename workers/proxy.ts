/**
 * Cloudflare Worker — AI API Proxy
 * 
 * This Worker handles ALL AI provider communication.
 * API keys are decrypted ONLY inside this Worker and never
 * reach the browser. Supports all 7 AI platforms with
 * streaming SSE responses.
 * 
 * Deploy with: wrangler deploy
 * 
 * Environment variables (set in Cloudflare dashboard):
 *   ENCRYPTION_KEY — 32-char AES-256 key
 *   SUPABASE_URL — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role secret
 *   ALLOWED_ORIGIN — The app domain (e.g., https://contentpro.pages.dev)
 */

export interface Env {
  ENCRYPTION_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALLOWED_ORIGIN: string;
}

/** Shape of the request body from the Next.js API route */
interface ProxyRequest {
  /** Base64 encrypted key passed directly */
  encrypted_key?: string;
  /** Database key ID — Worker fetches + decrypts */
  key_id?: string;
  platform: string;
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
  /** Caller tells us the user role for rate-limit awareness */
  user_role?: string;
  /** Whether this is a model-list request instead of chat */
  action?: 'chat' | 'list-models';
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Platform endpoint configurations */
const PLATFORM_CONFIGS: Record<string, {
  baseUrl: string;
  chatPath: string;
  modelsPath?: string;
  authHeader: (key: string) => Record<string, string>;
}> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
  },
  together: {
    baseUrl: 'https://api.together.xyz/v1',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    chatPath: '/messages',
    authHeader: (key) => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    }),
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    chatPath: '',
    modelsPath: '/models',
    authHeader: (_key) => ({}),
  },
};

/**
 * AES-256-GCM decryption — mirrors lib/encryption.ts logic
 * using WebCrypto API available in Cloudflare Workers.
 */
async function decryptKey(encryptedBase64: string, encryptionKey: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

  const IV_LENGTH = 12;
  const AUTH_TAG_LENGTH = 16;

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted data: too short');
  }

  const iv = combined.slice(0, IV_LENGTH);
  const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH);

  /* Rejoin ciphertext + authTag for WebCrypto (it expects tag appended) */
  const ciphertextWithTag = new Uint8Array(ciphertext.length + authTag.length);
  ciphertextWithTag.set(ciphertext, 0);
  ciphertextWithTag.set(authTag, ciphertext.length);

  const keyBuffer = new TextEncoder().encode(encryptionKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertextWithTag
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Fetches an encrypted API key from Supabase by key ID,
 * then decrypts it inside the Worker.
 */
async function fetchAndDecryptKey(
  keyId: string,
  env: Env
): Promise<{ key: string; platform: string }> {
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/api_keys?id=eq.${keyId}&is_active=eq.true&select=encrypted_key,platform`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch API key: ${response.status}`);
  }

  const rows = await response.json() as Array<{ encrypted_key: string; platform: string }>;
  if (!rows || rows.length === 0) {
    throw new Error('API key not found or inactive');
  }

  const decryptedKey = await decryptKey(rows[0].encrypted_key, env.ENCRYPTION_KEY);
  return { key: decryptedKey, platform: rows[0].platform };
}

/**
 * Builds the OpenAI-compatible request body.
 * Works for: openai, openrouter, groq, together, mistral.
 */
function buildOpenAIBody(
  messages: ChatMessage[],
  model: string,
  stream: boolean,
  temperature?: number,
  maxTokens?: number
): string {
  return JSON.stringify({
    model,
    messages,
    stream,
    temperature: temperature ?? 0.7,
    max_tokens: maxTokens ?? 4096,
    ...(stream ? { stream_options: { include_usage: true } } : {}),
  });
}

/**
 * Builds Anthropic-specific request body.
 * Anthropic requires separating system prompt from messages.
 */
function buildAnthropicBody(
  messages: ChatMessage[],
  model: string,
  stream: boolean,
  temperature?: number,
  maxTokens?: number
): string {
  let systemPrompt = '';
  const filteredMessages: Array<{ role: string; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
    } else {
      filteredMessages.push({ role: msg.role, content: msg.content });
    }
  }

  /* Ensure messages alternate user/assistant — Anthropic requirement */
  const normalizedMessages: Array<{ role: string; content: string }> = [];
  for (let i = 0; i < filteredMessages.length; i++) {
    const msg = filteredMessages[i];
    const prev = normalizedMessages[normalizedMessages.length - 1];
    if (prev && prev.role === msg.role) {
      /* Merge consecutive same-role messages */
      prev.content += '\n\n' + msg.content;
    } else {
      normalizedMessages.push({ ...msg });
    }
  }

  /* First message must be 'user' for Anthropic */
  if (normalizedMessages.length > 0 && normalizedMessages[0].role !== 'user') {
    normalizedMessages.unshift({ role: 'user', content: 'Hello.' });
  }

  return JSON.stringify({
    model,
    messages: normalizedMessages,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    stream,
    temperature: temperature ?? 0.7,
    max_tokens: maxTokens ?? 4096,
  });
}

/**
 * Builds Gemini-specific request body and URL.
 * Gemini uses a completely different format.
 */
function buildGeminiRequest(
  messages: ChatMessage[],
  model: string,
  stream: boolean,
  apiKey: string,
  temperature?: number,
  maxTokens?: number
): { url: string; body: string } {
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

  /* Gemini requires first message to be from 'user' */
  if (contents.length > 0 && contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: 'Hello.' }] });
  }

  const action = stream ? 'streamGenerateContent' : 'generateContent';
  const streamParam = stream ? '&alt=sse' : '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${apiKey}${streamParam}`;

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: temperature ?? 0.7,
      maxOutputTokens: maxTokens ?? 4096,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  return { url, body: JSON.stringify(body) };
}

/**
 * Transforms Anthropic SSE stream into OpenAI-compatible SSE format
 * so the frontend can use a single parser.
 */
function transformAnthropicStream(response: Response): ReadableStream {
  const reader = response.body!.getReader();
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
              const openAIChunk = {
                choices: [{
                  delta: { content: event.delta.text },
                  index: 0,
                  finish_reason: null,
                }],
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`)
              );
            }

            if (event.type === 'message_stop') {
              const stopChunk = {
                choices: [{
                  delta: {},
                  index: 0,
                  finish_reason: 'stop',
                }],
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(stopChunk)}\n\n`)
              );
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }

            if (event.type === 'message_delta' && event.usage) {
              const usageChunk = {
                choices: [{
                  delta: {},
                  index: 0,
                  finish_reason: 'stop',
                }],
                usage: {
                  prompt_tokens: event.usage.input_tokens || 0,
                  completion_tokens: event.usage.output_tokens || 0,
                  total_tokens: (event.usage.input_tokens || 0) + (event.usage.output_tokens || 0),
                },
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(usageChunk)}\n\n`)
              );
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
 * Transforms Gemini SSE stream into OpenAI-compatible SSE format.
 */
function transformGeminiStream(response: Response): ReadableStream {
  const reader = response.body!.getReader();
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
              const openAIChunk = {
                choices: [{
                  delta: { content: text },
                  index: 0,
                  finish_reason: null,
                }],
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`)
              );
            }

            const finishReason = event?.candidates?.[0]?.finishReason;
            if (finishReason && finishReason !== 'FINISH_REASON_UNSPECIFIED') {
              const stopChunk = {
                choices: [{
                  delta: {},
                  index: 0,
                  finish_reason: 'stop',
                }],
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(stopChunk)}\n\n`)
              );
            }

            if (event?.usageMetadata) {
              const usageChunk = {
                choices: [{ delta: {}, index: 0, finish_reason: null }],
                usage: {
                  prompt_tokens: event.usageMetadata.promptTokenCount || 0,
                  completion_tokens: event.usageMetadata.candidatesTokenCount || 0,
                  total_tokens: event.usageMetadata.totalTokenCount || 0,
                },
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(usageChunk)}\n\n`)
              );
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
 * Handles model listing requests — fetches available models from the AI platform.
 */
async function handleListModels(
  platform: string,
  apiKey: string,
  env: Env
): Promise<Response> {
  const config = PLATFORM_CONFIGS[platform];
  if (!config || !config.modelsPath) {
    return new Response(
      JSON.stringify({ success: false, data: null, message: 'Models listing not supported for this platform' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let url: string;
  let headers: Record<string, string>;

  if (platform === 'gemini') {
    url = `${config.baseUrl}${config.modelsPath}?key=${apiKey}`;
    headers = { 'Content-Type': 'application/json' };
  } else {
    url = `${config.baseUrl}${config.modelsPath}`;
    headers = {
      'Content-Type': 'application/json',
      ...config.authHeader(apiKey),
    };
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        message: `Failed to fetch models: ${response.status}`,
        error: errorText,
      }),
      { status: response.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const data = await response.json() as Record<string, unknown>;
  return new Response(
    JSON.stringify({ success: true, data, message: 'Models fetched' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

/** Main Worker entry point */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    /* CORS preflight */
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    /* Only accept POST */
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, data: null, message: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    /* Origin validation */
    const origin = request.headers.get('origin') || '';
    if (env.ALLOWED_ORIGIN && origin && !origin.includes(env.ALLOWED_ORIGIN.replace('https://', '').replace('http://', ''))) {
      return new Response(
        JSON.stringify({ success: false, data: null, message: 'Forbidden origin' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    try {
      const body = await request.json() as ProxyRequest;
      const { platform, model, messages, stream, temperature, max_tokens, action } = body;

      if (!platform || !model) {
        return new Response(
          JSON.stringify({ success: false, data: null, message: 'Missing platform or model' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      /* Resolve the decrypted API key */
      let apiKey: string;

      if (body.encrypted_key) {
        apiKey = await decryptKey(body.encrypted_key, env.ENCRYPTION_KEY);
      } else if (body.key_id) {
        const result = await fetchAndDecryptKey(body.key_id, env);
        apiKey = result.key;
      } else {
        return new Response(
          JSON.stringify({ success: false, data: null, message: 'No API key provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      /* Handle model listing action */
      if (action === 'list-models') {
        const modelsResponse = await handleListModels(platform, apiKey, env);
        const responseHeaders = new Headers(modelsResponse.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => responseHeaders.set(k, v));
        return new Response(modelsResponse.body, {
          status: modelsResponse.status,
          headers: responseHeaders,
        });
      }

      /* Validate messages for chat */
      if (!messages || messages.length === 0) {
        return new Response(
          JSON.stringify({ success: false, data: null, message: 'No messages provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const config = PLATFORM_CONFIGS[platform];
      if (!config) {
        return new Response(
          JSON.stringify({ success: false, data: null, message: `Unsupported platform: ${platform}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      /* Build platform-specific request */
      let fetchUrl: string;
      let fetchBody: string;
      let fetchHeaders: Record<string, string>;

      if (platform === 'anthropic') {
        fetchUrl = `${config.baseUrl}${config.chatPath}`;
        fetchBody = buildAnthropicBody(messages, model, stream !== false, temperature, max_tokens);
        fetchHeaders = {
          'Content-Type': 'application/json',
          ...config.authHeader(apiKey),
        };
      } else if (platform === 'gemini') {
        const geminiReq = buildGeminiRequest(messages, model, stream !== false, apiKey, temperature, max_tokens);
        fetchUrl = geminiReq.url;
        fetchBody = geminiReq.body;
        fetchHeaders = { 'Content-Type': 'application/json' };
      } else {
        /* OpenAI-compatible platforms */
        fetchUrl = `${config.baseUrl}${config.chatPath}`;
        fetchBody = buildOpenAIBody(messages, model, stream !== false, temperature, max_tokens);
        fetchHeaders = {
          'Content-Type': 'application/json',
          ...config.authHeader(apiKey),
        };

        /* OpenRouter requires extra headers */
        if (platform === 'openrouter') {
          fetchHeaders['HTTP-Referer'] = env.ALLOWED_ORIGIN || 'https://contentpro.app';
          fetchHeaders['X-Title'] = 'ContentPro';
        }
      }

      /* Forward request to AI platform */
      const aiResponse = await fetch(fetchUrl, {
        method: 'POST',
        headers: fetchHeaders,
        body: fetchBody,
      });

      /* Handle errors from AI platform */
      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        let errorMessage = `AI provider error: ${aiResponse.status}`;

        /* Detect specific error types */
        if (aiResponse.status === 401 || aiResponse.status === 403) {
          errorMessage = 'Invalid or expired API key';
        } else if (aiResponse.status === 402) {
          errorMessage = 'Insufficient API balance — please top up your account';
        } else if (aiResponse.status === 429) {
          errorMessage = 'Rate limit exceeded — please wait a moment';
        } else if (aiResponse.status === 404) {
          errorMessage = `Model "${model}" not found on ${platform}`;
        }

        return new Response(
          JSON.stringify({
            success: false,
            data: null,
            message: errorMessage,
            error: errorText.substring(0, 500),
          }),
          {
            status: aiResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      /* Non-streaming response */
      if (!stream || stream === false) {
        const responseData = await aiResponse.json();
        return new Response(
          JSON.stringify({ success: true, data: responseData, message: 'OK' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      /* Streaming response — transform non-OpenAI formats */
      let streamBody: ReadableStream;

      if (platform === 'anthropic') {
        streamBody = transformAnthropicStream(aiResponse);
      } else if (platform === 'gemini') {
        streamBody = transformGeminiStream(aiResponse);
      } else {
        /* OpenAI-compatible — pass through directly */
        streamBody = aiResponse.body!;
      }

      return new Response(streamBody, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown proxy error';
      return new Response(
        JSON.stringify({
          success: false,
          data: null,
          message: 'Proxy error',
          error: errorMessage,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};