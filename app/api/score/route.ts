import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { buildScorePrompt } from '@/lib/linkedin-score';
import { decrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });

    const { postContent, model, platform } = await request.json();
    if (!postContent || !model || !platform) {
      return NextResponse.json({ success: false, data: null, message: 'Missing required fields' }, { status: 400 });
    }

    const scorePrompt = buildScorePrompt(postContent);

    /* Determine API key — try private first, then global */
    let apiKey: string | null = null;
    let keySource = 'none';

    const { data: privateKey } = await supabase.from('api_keys')
      .select('encrypted_key').eq('user_id', user.id).eq('platform', platform).eq('is_active', true).eq('is_global', false).single();

    if (privateKey) {
      apiKey = decrypt(privateKey.encrypted_key);
      keySource = 'private';
    } else {
      const { data: globalKey } = await supabase.from('api_keys')
        .select('encrypted_key').eq('platform', platform).eq('is_active', true).eq('is_global', true).limit(1).single();
      if (globalKey) {
        apiKey = decrypt(globalKey.encrypted_key);
        keySource = 'public';
      }
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, data: null, message: `No API key available for ${platform}` }, { status: 404 });
    }

    /* Build request based on platform */
    const messages = [
      { role: 'system' as const, content: 'You are a LinkedIn content analysis expert.' },
      { role: 'user' as const, content: scorePrompt },
    ];

    let fetchUrl: string;
    let fetchHeaders: Record<string, string>;
    let fetchBody: string;

    if (platform === 'anthropic') {
      fetchUrl = 'https://api.anthropic.com/v1/messages';
      fetchHeaders = { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
      fetchBody = JSON.stringify({ model, messages: [{ role: 'user', content: scorePrompt }], system: 'You are a LinkedIn content analysis expert.', stream: true, max_tokens: 2048 });
    } else if (platform === 'gemini') {
      fetchUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
      fetchHeaders = { 'Content-Type': 'application/json' };
      fetchBody = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: scorePrompt }] }], systemInstruction: { parts: [{ text: 'You are a LinkedIn content analysis expert.' }] }, generationConfig: { maxOutputTokens: 2048 } });
    } else {
      const baseUrls: Record<string, string> = { openai: 'https://api.openai.com/v1', groq: 'https://api.groq.com/openai/v1', openrouter: 'https://openrouter.ai/api/v1', together: 'https://api.together.xyz/v1', mistral: 'https://api.mistral.ai/v1' };
      fetchUrl = `${baseUrls[platform] || baseUrls.openai}/chat/completions`;
      fetchHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
      fetchBody = JSON.stringify({ model, messages, stream: true, max_tokens: 2048 });
    }

    const aiResponse = await fetch(fetchUrl, { method: 'POST', headers: fetchHeaders, body: fetchBody });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return NextResponse.json({ success: false, data: null, message: `AI provider error: ${aiResponse.status}`, error: errorText.substring(0, 300) }, { status: aiResponse.status });
    }

    return new NextResponse(aiResponse.body, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Key-Source': keySource },
    });
  } catch (error) {
    return NextResponse.json({ success: false, data: null, message: 'Score evaluation failed', error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : '') : undefined }, { status: 500 });
  }
}