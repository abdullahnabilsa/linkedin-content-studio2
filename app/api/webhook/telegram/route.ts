import { NextRequest, NextResponse } from 'next/server';
import {
  sendTelegramNotification,
  createInternalNotification,
  testTelegramConnection,
} from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, priority, testBotToken, testChatId } = body;

    /* Test connection mode */
    if (testBotToken && testChatId) {
      const result = await testTelegramConnection(testBotToken, testChatId);
      return NextResponse.json({
        success: result.success,
        data: { telegram: result.success, internal: false },
        message: result.message,
      });
    }

    if (!type || !title || !message) {
      return NextResponse.json(
        { success: false, data: null, message: 'type, title, and message are required' },
        { status: 400 }
      );
    }

    const validPriority = ['urgent', 'normal', 'info'].includes(priority)
      ? (priority as 'urgent' | 'normal' | 'info')
      : 'normal';

    /* Send Telegram notification */
    const telegramResult = await sendTelegramNotification({
      type,
      title,
      message,
      priority: validPriority,
    });

    /* Create internal notification */
    const internalResult = await createInternalNotification({
      type,
      title,
      message,
      priority: validPriority,
    });

    return NextResponse.json({
      success: true,
      data: { telegram: telegramResult, internal: internalResult },
      message: 'Notification processed',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
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