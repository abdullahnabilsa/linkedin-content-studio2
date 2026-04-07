import { createAdminClient } from '@/lib/supabase-admin';

/**
 * Notification priority levels mapped to emoji indicators
 * for Telegram messages.
 */
const PRIORITY_EMOJI: Record<string, string> = {
  urgent: '🔴',
  normal: '🟡',
  info: '🔵',
};

interface TelegramNotificationParams {
  type: string;
  title: string;
  message: string;
  priority: 'urgent' | 'normal' | 'info';
}

interface InternalNotificationParams {
  type: string;
  title: string;
  message: string;
  priority: 'urgent' | 'normal' | 'info';
  relatedUserId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fetches a system config value by key.
 * Returns null if not found.
 */
async function getSystemConfig(key: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) return null;
    return data.value;
  } catch {
    return null;
  }
}

/**
 * Sends a message via the Telegram Bot API.
 * Returns true on success, false on any failure.
 * This is a fire-and-forget operation — failures never block callers.
 */
export async function sendTelegramNotification(
  params: TelegramNotificationParams
): Promise<boolean> {
  try {
    /* Read credentials from system_config first, fall back to env */
    let botToken = await getSystemConfig('telegram_bot_token');
    let chatId = await getSystemConfig('telegram_chat_id');

    if (!botToken) {
      botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    }
    if (!chatId) {
      chatId = process.env.TELEGRAM_CHAT_ID || '';
    }

    if (!botToken || !chatId) {
      /* Telegram not configured — silently skip */
      return false;
    }

    const emoji = PRIORITY_EMOJI[params.priority] || '🔵';
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const htmlMessage = [
      `${emoji} <b>${escapeHtml(params.title)}</b>`,
      '',
      `📋 <b>Type:</b> ${escapeHtml(params.type)}`,
      `📝 ${escapeHtml(params.message)}`,
      '',
      `🕐 ${timestamp} UTC`,
    ].join('\n');

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Telegram] Send failed:', response.status, errorBody);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram] Exception:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Sends a test message to verify Telegram configuration.
 * Returns { success, message } with details.
 */
export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!botToken || !chatId) {
      return { success: false, message: 'Bot token and chat ID are required' };
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const testMessage = [
      '✅ <b>ContentPro — Test Connection</b>',
      '',
      'Telegram notifications are configured correctly!',
      `🕐 ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`,
    ].join('\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const description =
        (errorBody as Record<string, string>).description || 'Unknown error';
      return { success: false, message: `Telegram API error: ${description}` };
    }

    return { success: true, message: 'Test message sent successfully' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Connection failed';
    return { success: false, message: msg };
  }
}

/**
 * Creates an internal notification record in the database.
 */
export async function createInternalNotification(
  params: InternalNotificationParams
): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from('notifications').insert({
      type: params.type,
      title: params.title,
      message: params.message,
      priority: params.priority,
      related_user_id: params.relatedUserId || null,
      metadata: params.metadata || null,
      is_read: false,
    });

    if (error) {
      console.error('[Notification] Insert failed:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      '[Notification] Exception:',
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/**
 * Unified notification sender.
 * Always creates an internal notification.
 * Optionally sends via Telegram based on admin toggles in system_config.
 */
export async function sendNotification(
  params: InternalNotificationParams
): Promise<{ internal: boolean; telegram: boolean }> {
  /* 1. Always create internal notification */
  const internal = await createInternalNotification(params);

  /* 2. Check Telegram toggle for this notification type */
  let telegram = false;
  try {
    const toggleKey = `telegram_notify_${params.type}`;
    const toggleValue = await getSystemConfig(toggleKey);

    /* Default: send Telegram for urgent, skip for others unless explicitly enabled */
    const shouldSendTelegram =
      toggleValue === 'true' ||
      (toggleValue === null && params.priority === 'urgent');

    if (shouldSendTelegram) {
      telegram = await sendTelegramNotification({
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority,
      });
    }
  } catch {
    /* Telegram failures never block */
  }

  return { internal, telegram };
}

/**
 * Escapes HTML special characters for Telegram HTML parse mode.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}