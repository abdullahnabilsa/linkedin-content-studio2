import { createIntl } from 'next-intl';

export const messages = {
  ar: require('./ar.json'),
  en: require('./en.json'),
};

export const intl = createIntl({ locale: 'ar', messages: messages.ar });