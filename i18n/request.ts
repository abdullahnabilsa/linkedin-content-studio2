import { NextRequest } from 'next/server';
import { intl } from './config';

export const getRequestConfig = (req: NextRequest) => {
  const locale = req.cookies.get('locale') || 'ar';
  return {
    locale,
    messages: intl.messages[locale],
  };
};