import jsPDF from 'jspdf';

/* ────────────────────────────────────────────────────────── */
/* Type contracts – keep in sync with types/chat.ts           */
/* ────────────────────────────────────────────────────────── */

interface ExportConversation {
  id: string;
  title: string;
  platform: string;
  model: string;
  total_tokens: number;
  created_at: string;
}

interface ExportMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  persona_name?: string | null;
  tokens_used?: number | null;
  created_at: string;
}

/* ────────────────────────────────────────────────────────── */
/* Plain-text generator                                       */
/* ────────────────────────────────────────────────────────── */

export function generateTXT(
  conversation: ExportConversation,
  messages: ExportMessage[],
): string {
  const lines: string[] = [];

  lines.push(`[${conversation.title}]`);
  lines.push(`Date: ${new Date(conversation.created_at).toLocaleDateString()}`);
  lines.push(
    `Platform: ${conversation.platform} | Model: ${conversation.model}`,
  );
  if (conversation.total_tokens > 0) {
    lines.push(`Total Tokens: ${conversation.total_tokens.toLocaleString()}`);
  }
  lines.push('---');
  lines.push('');

  for (const msg of messages) {
    if (msg.role === 'system') continue; /* skip system messages */

    const sender =
      msg.role === 'user'
        ? 'User'
        : msg.persona_name
          ? `AI - ${msg.persona_name}`
          : 'AI';

    lines.push(`[${sender}]:`);
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/* ────────────────────────────────────────────────────────── */
/* Markdown generator                                         */
/* ────────────────────────────────────────────────────────── */

export function generateMarkdown(
  conversation: ExportConversation,
  messages: ExportMessage[],
): string {
  const lines: string[] = [];

  lines.push(`# ${conversation.title}`);
  lines.push('');
  lines.push(`**Date:** ${new Date(conversation.created_at).toLocaleDateString()}`);
  lines.push(`**Platform:** ${conversation.platform} | **Model:** ${conversation.model}`);
  if (conversation.total_tokens > 0) {
    lines.push(
      `**Total Tokens:** ${conversation.total_tokens.toLocaleString()}`,
    );
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    const sender =
      msg.role === 'user'
        ? '👤 **User**'
        : msg.persona_name
          ? `🤖 **${msg.persona_name}**`
          : '🤖 **AI**';

    lines.push(`### ${sender}`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/* ────────────────────────────────────────────────────────── */
/* PDF generator                                              */
/* ────────────────────────────────────────────────────────── */

/** Emerald accent colour used for headings */
const EMERALD_HEX: [number, number, number] = [52, 211, 153]; /* #34D399 */
const DARK_TEXT: [number, number, number] = [30, 30, 30];
const MUTED_TEXT: [number, number, number] = [120, 120, 120];

export function generatePDF(
  conversation: ExportConversation,
  messages: ExportMessage[],
): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const MARGIN = 15;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  let y = MARGIN;

  /** Add a new page when close to the bottom */
  function ensureSpace(needed: number): void {
    if (y + needed > PAGE_HEIGHT - MARGIN - 10) {
      addPageNumber();
      doc.addPage();
      y = MARGIN;
    }
  }

  /** Render a page number in the bottom-centre */
  function addPageNumber(): void {
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_TEXT);
    doc.text(
      `${pageCount}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 8,
      { align: 'center' },
    );
  }

  /* ── Title section ──────────────────────────────── */
  doc.setFontSize(18);
  doc.setTextColor(...EMERALD_HEX);
  const titleLines = doc.splitTextToSize(conversation.title, CONTENT_WIDTH);
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 8 + 2;

  /* Meta line */
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_TEXT);
  const meta = [
    `Date: ${new Date(conversation.created_at).toLocaleDateString()}`,
    `Platform: ${conversation.platform}`,
    `Model: ${conversation.model}`,
    conversation.total_tokens > 0
      ? `Tokens: ${conversation.total_tokens.toLocaleString()}`
      : '',
  ]
    .filter(Boolean)
    .join('  |  ');
  doc.text(meta, MARGIN, y);
  y += 6;

  /* Separator line */
  doc.setDrawColor(...EMERALD_HEX);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;

  /* ── Messages ───────────────────────────────────── */
  for (const msg of messages) {
    if (msg.role === 'system') continue;

    const isUser = msg.role === 'user';
    const sender = isUser
      ? 'User'
      : msg.persona_name ?? 'AI';

    /* Sender label */
    ensureSpace(20);
    doc.setFontSize(10);
    doc.setTextColor(...(isUser ? DARK_TEXT : EMERALD_HEX));
    doc.setFont('helvetica', 'bold');
    doc.text(`${isUser ? '👤' : '🤖'} ${sender}`, MARGIN, y);
    y += 5;

    /* Message body */
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK_TEXT);

    const bodyLines: string[] = doc.splitTextToSize(msg.content, CONTENT_WIDTH);

    for (const line of bodyLines) {
      ensureSpace(5);
      doc.text(line, MARGIN, y);
      y += 4.5;
    }

    y += 4;

    /* Thin separator */
    ensureSpace(4);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 6;
  }

  /* Final page number */
  addPageNumber();

  /* Return as Blob */
  const arrayBuffer = doc.output('arraybuffer');
  return new Blob([arrayBuffer], { type: 'application/pdf' });
}