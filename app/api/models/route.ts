/**
 * Models API Route
 * 
 * Returns available AI models for a given platform.
 * - Public (apiType=public): fetches from global_models table
 * - Private (apiType=private): fetches from AI platform API
 *   using the user's private key, with fallback to hardcoded lists
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { decrypt } from '@/lib/encryption';

/** Hardcoded fallback model lists for platforms without reliable /models endpoint */
const FALLBACK_MODELS: Record<string, Array<{ id: string; name: string }>> = {
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'o1', name: 'o1' },
    { id: 'o1-mini', name: 'o1 Mini' },
    { id: 'o3-mini', name: 'o3 Mini' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
    { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 90B Vision' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
  ],
  together: [
    { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Turbo' },
    { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B Turbo' },
    { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo' },
    { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', name: 'Mixtral 8x22B' },
    { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B Turbo' },
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large' },
    { id: 'mistral-medium-latest', name: 'Mistral Medium' },
    { id: 'mistral-small-latest', name: 'Mistral Small' },
    { id: 'open-mixtral-8x22b', name: 'Mixtral 8x22B' },
    { id: 'open-mixtral-8x7b', name: 'Mixtral 8x7B' },
  ],
  openrouter: [
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
    { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B' },
  ],
  gemini: [
    { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  ],
};

/** Platform API endpoints for fetching models */
const MODEL_API_CONFIGS: Record<string, {
  url: string;
  buildHeaders: (key: string) => Record<string, string>;
  parseResponse: (data: Record<string, unknown>) => Array<{ id: string; name: string }>;
} | null> = {
  openai: {
    url: 'https://api.openai.com/v1/models',
    buildHeaders: (key) => ({ 'Authorization': `Bearer ${key}` }),
    parseResponse: (data) => {
      const models = (data.data as Array<{ id: string }>) || [];
      return models
        .filter((m) => m.id.startsWith('gpt-') || m.id.startsWith('o1') || m.id.startsWith('o3'))
        .map((m) => ({ id: m.id, name: m.id }))
        .sort((a, b) => a.id.localeCompare(b.id));
    },
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/models',
    buildHeaders: (key) => ({ 'Authorization': `Bearer ${key}` }),
    parseResponse: (data) => {
      const models = (data.data as Array<{ id: string }>) || [];
      return models
        .map((m) => ({ id: m.id, name: m.id }))
        .sort((a, b) => a.id.localeCompare(b.id));
    },
  },
  together: {
    url: 'https://api.together.xyz/v1/models',
    buildHeaders: (key) => ({ 'Authorization': `Bearer ${key}` }),
    parseResponse: (data) => {
      const models = (data as Array<{ id: string; display_name?: string }>) || [];
      return models
        .filter((m) => m.id && typeof m.id === 'string')
        .slice(0, 50)
        .map((m) => ({ id: m.id, name: m.display_name || m.id }));
    },
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/models',
    buildHeaders: (key) => ({ 'Authorization': `Bearer ${key}` }),
    parseResponse: (data) => {
      const models = (data.data as Array<{ id: string }>) || [];
      return models
        .map((m) => ({ id: m.id, name: m.id }))
        .sort((a, b) => a.id.localeCompare(b.id));
    },
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/models',
    buildHeaders: (key) => ({ 'Authorization': `Bearer ${key}` }),
    parseResponse: (data) => {
      const models = (data.data as Array<{ id: string; name?: string }>) || [];
      return models
        .slice(0, 100)
        .map((m) => ({ id: m.id, name: m.name || m.id }));
    },
  },
  /* Anthropic has no /models endpoint */
  anthropic: null,
  /* Gemini models endpoint */
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
    buildHeaders: (_key) => ({}),
    parseResponse: (data) => {
      const models = (data.models as Array<{ name: string; displayName: string; supportedGenerationMethods: string[] }>) || [];
      return models
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => ({
          id: m.name.replace('models/', ''),
          name: m.displayName || m.name,
        }));
    },
  },
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, data: null, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const apiType = searchParams.get('apiType') || 'public';

    if (!platform) {
      return NextResponse.json(
        { success: false, data: null, message: 'Missing platform parameter' },
        { status: 400 }
      );
    }

    /* ─── PUBLIC MODELS: Fetch from global_models table ─── */
    if (apiType === 'public') {
      const { data: globalModels, error: modelsError } = await supabase
        .from('global_models')
        .select(`
          id,
          model_id,
          model_name,
          is_active,
          sort_order,
          api_key_id,
          api_keys!inner (
            platform,
            is_active,
            is_global
          )
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (modelsError) {
        return NextResponse.json(
          { success: false, data: null, message: 'Failed to fetch models' },
          { status: 500 }
        );
      }

      /* Filter models by platform through their linked API key */
      interface GlobalModelRow {
        id: string;
        model_id: string;
        model_name: string;
        is_active: boolean;
        sort_order: number;
        api_key_id: string;
        api_keys: {
          platform: string;
          is_active: boolean;
          is_global: boolean;
        };
      }

      const filteredModels = ((globalModels || []) as unknown as GlobalModelRow[])
        .filter((m) => {
          const apiKeyData = m.api_keys;
          return apiKeyData &&
            apiKeyData.platform === platform &&
            apiKeyData.is_active &&
            apiKeyData.is_global;
        })
        .map((m) => ({
          id: m.model_id,
          name: m.model_name,
          dbId: m.id,
          sortOrder: m.sort_order,
        }));

      return NextResponse.json({
        success: true,
        data: filteredModels,
        message: `Found ${filteredModels.length} public models for ${platform}`,
      });
    }

    /* ─── PRIVATE MODELS: Fetch from AI platform API ─── */
    if (apiType === 'private') {
      /* Get user's private key for this platform */
      const { data: keyRow, error: keyError } = await supabase
        .from('api_keys')
        .select('encrypted_key')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .eq('is_active', true)
        .eq('is_global', false)
        .single();

      if (keyError || !keyRow) {
        /* No private key — return fallback models */
        const fallback = FALLBACK_MODELS[platform] || [];
        return NextResponse.json({
          success: true,
          data: fallback,
          message: `No private key for ${platform}. Showing fallback models.`,
        });
      }

      let apiKey: string;
      try {
        apiKey = decrypt(keyRow.encrypted_key);
      } catch {
        return NextResponse.json(
          { success: false, data: null, message: 'Failed to decrypt API key' },
          { status: 500 }
        );
      }

      /* Check if platform supports model listing */
      const modelApiConfig = MODEL_API_CONFIGS[platform];

      if (!modelApiConfig) {
        /* Platform doesn't have models endpoint (e.g., Anthropic) — return fallback */
        const fallback = FALLBACK_MODELS[platform] || [];
        return NextResponse.json({
          success: true,
          data: fallback,
          message: `Models list for ${platform} (fallback)`,
        });
      }

      /* Fetch from platform API */
      try {
        let fetchUrl = modelApiConfig.url;
        const headers = modelApiConfig.buildHeaders(apiKey);

        /* Gemini needs API key in URL */
        if (platform === 'gemini') {
          fetchUrl = `${modelApiConfig.url}?key=${apiKey}`;
        }

        const platformResponse = await fetch(fetchUrl, {
          headers,
          signal: AbortSignal.timeout(10000),
        });

        if (!platformResponse.ok) {
          /* Fall back to hardcoded list */
          const fallback = FALLBACK_MODELS[platform] || [];
          return NextResponse.json({
            success: true,
            data: fallback,
            message: `Platform API returned ${platformResponse.status}. Using fallback models.`,
          });
        }

        const responseData = await platformResponse.json() as Record<string, unknown>;
        const models = modelApiConfig.parseResponse(responseData);

        return NextResponse.json({
          success: true,
          data: models.length > 0 ? models : (FALLBACK_MODELS[platform] || []),
          message: `Found ${models.length} models for ${platform}`,
        });
      } catch {
        /* Network error — return fallback */
        const fallback = FALLBACK_MODELS[platform] || [];
        return NextResponse.json({
          success: true,
          data: fallback,
          message: `Failed to reach ${platform} API. Using fallback models.`,
        });
      }
    }

    return NextResponse.json(
      { success: false, data: null, message: 'Invalid apiType. Use "public" or "private".' },
      { status: 400 }
    );
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