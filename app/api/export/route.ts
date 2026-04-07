import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { generateTXT, generateMarkdown, generatePDF } from '@/lib/export';

/**
 * POST /api/export
 *
 * Body: { conversationId: string, format: 'txt' | 'pdf' | 'md' }
 *
 * Returns the exported file as a binary response with the
 * appropriate Content-Type header.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, data: null, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { conversationId, format } = body as {
      conversationId?: string;
      format?: string;
    };

    /* ── Validate inputs ───────────────────────────── */
    if (!conversationId) {
      return NextResponse.json(
        { success: false, data: null, message: 'conversationId is required' },
        { status: 400 },
      );
    }

    const validFormats = ['txt', 'pdf', 'md'] as const;
    type ExportFormat = (typeof validFormats)[number];

    if (!format || !validFormats.includes(format as ExportFormat)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'format must be one of: txt, pdf, md',
        },
        { status: 400 },
      );
    }

    const exportFormat = format as ExportFormat;

    /* ── Check role for premium-only formats ───────── */
    if (exportFormat === 'pdf' || exportFormat === 'md') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'free') {
        return NextResponse.json(
          {
            success: false,
            data: null,
            message: `${exportFormat.toUpperCase()} export is available for Premium and Admin users only`,
          },
          { status: 403 },
        );
      }
    }

    /* ── Fetch conversation (verify ownership) ─────── */
    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .select('id, title, platform, model, total_tokens, created_at, user_id')
      .eq('id', conversationId)
      .single();

    if (convErr || !conversation) {
      return NextResponse.json(
        { success: false, data: null, message: 'Conversation not found' },
        { status: 404 },
      );
    }

    if (conversation.user_id !== user.id) {
      /* Admins can export any conversation */
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          {
            success: false,
            data: null,
            message: 'You do not have access to this conversation',
          },
          { status: 403 },
        );
      }
    }

    /* ── Fetch messages ────────────────────────────── */
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('role, content, persona_name, tokens_used, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgErr) {
      return NextResponse.json(
        { success: false, data: null, message: 'Failed to fetch messages' },
        { status: 500 },
      );
    }

    const safeMessages = (messages ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      persona_name: m.persona_name,
      tokens_used: m.tokens_used,
      created_at: m.created_at,
    }));

    const convData = {
      id: conversation.id as string,
      title: conversation.title as string,
      platform: conversation.platform as string,
      model: conversation.model as string,
      total_tokens: (conversation.total_tokens ?? 0) as number,
      created_at: conversation.created_at as string,
    };

    /* ── Generate the file ─────────────────────────── */
    switch (exportFormat) {
      case 'txt': {
        const text = generateTXT(convData, safeMessages);
        return new NextResponse(text, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="conversation-${conversationId.slice(0, 8)}.txt"`,
          },
        });
      }

      case 'md': {
        const markdown = generateMarkdown(convData, safeMessages);
        return new NextResponse(markdown, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="conversation-${conversationId.slice(0, 8)}.md"`,
          },
        });
      }

      case 'pdf': {
        const pdfBlob = generatePDF(convData, safeMessages);
        const arrayBuffer = await pdfBlob.arrayBuffer();
        return new NextResponse(arrayBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="conversation-${conversationId.slice(0, 8)}.pdf"`,
          },
        });
      }

      default: {
        return NextResponse.json(
          { success: false, data: null, message: 'Unsupported format' },
          { status: 400 },
        );
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 },
    );
  }
}