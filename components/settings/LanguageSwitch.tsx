import { useUIStore } from '@/stores/uiStore';
import { useIntl } from 'next-intl';

const LanguageSwitch = () => {
  const { setLocale } = useUIStore();
  const intl = useIntl();

  return (
    <div>
      <button onClick={() => setLocale('ar')}>{intl.formatMessage({ id: 'lang.ar' })}</button>
      <button onClick={() => setLocale('en')}>{intl.formatMessage({ id: 'lang.en' })}</button>
    </div>
  );
};

export default LanguageSwitch;