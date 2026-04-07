const { withCloudflare } = require('@cloudflare/next-on-pages');

module.exports = withCloudflare({
  images: {
    domains: ['example.com'],
  },
  i18n: {
    locales: ['ar', 'en'],
    defaultLocale: 'ar',
  }
});