/**
 * LinkedIn-specific constants: format templates, industries,
 * goals, experience levels, audience levels, tone options, etc.
 *
 * These are imported by utils/constants.ts (the barrel file).
 */

export const FORMAT_TEMPLATES = [
  { id: 'default', label: 'Default', icon: '\u26a1' },
  { id: 'story', label: 'Story', icon: '\ud83d\udcda' },
  { id: 'listicle', label: 'Listicle', icon: '\ud83d\udcdd' },
  { id: 'qa', label: 'Q&A', icon: '\u2753' },
  { id: 'tip', label: 'Direct Tip', icon: '\ud83d\udca1' },
  { id: 'before_after', label: 'Before/After', icon: '\ud83d\udd04' },
  { id: 'statistics', label: 'Statistics', icon: '\ud83d\udcca' },
] as const;

export const INDUSTRIES = [
  { id: 'technology', label: 'Technology & IT' },
  { id: 'marketing', label: 'Marketing & Advertising' },
  { id: 'finance', label: 'Finance & Banking' },
  { id: 'healthcare', label: 'Healthcare & Medical' },
  { id: 'education', label: 'Education & Training' },
  { id: 'consulting', label: 'Consulting' },
  { id: 'ecommerce', label: 'E-Commerce & Retail' },
  { id: 'real_estate', label: 'Real Estate' },
  { id: 'media', label: 'Media & Entertainment' },
  { id: 'hr', label: 'Human Resources' },
  { id: 'legal', label: 'Legal' },
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'nonprofit', label: 'Non-Profit' },
  { id: 'government', label: 'Government & Public Sector' },
  { id: 'energy', label: 'Energy & Utilities' },
] as const;

export const LINKEDIN_GOALS = [
  { id: 'thought_leadership', label: 'Thought Leadership', icon: '\ud83c\udfaf' },
  { id: 'personal_branding', label: 'Personal Branding', icon: '\u2728' },
  { id: 'lead_generation', label: 'Lead Generation', icon: '\ud83d\udcb0' },
  { id: 'networking', label: 'Networking', icon: '\ud83e\udd1d' },
  { id: 'hiring', label: 'Hiring / Recruiting', icon: '\ud83d\udc65' },
  { id: 'learning', label: 'Learning & Growth', icon: '\ud83d\udcda' },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry Level (0-2 years)' },
  { value: 'mid', label: 'Mid Level (3-5 years)' },
  { value: 'senior', label: 'Senior (6-10 years)' },
  { value: 'executive', label: 'Executive (10+ years)' },
  { value: 'founder', label: 'Founder / C-Level' },
] as const;

export const AUDIENCE_LEVELS = [
  { value: 'junior', label: 'Junior Professionals' },
  { value: 'mid', label: 'Mid-Career' },
  { value: 'senior', label: 'Senior / Managers' },
  { value: 'executive', label: 'Executives / C-Suite' },
  { value: 'founders', label: 'Founders / Entrepreneurs' },
  { value: 'students', label: 'Students / Interns' },
] as const;

export const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'educational', label: 'Educational' },
  { value: 'witty', label: 'Witty / Humorous' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'empathetic', label: 'Empathetic' },
] as const;

export const EMOJI_OPTIONS = [
  { value: 'none', label: 'No Emojis' },
  { value: 'minimal', label: 'Minimal (1-2 per post)' },
  { value: 'moderate', label: 'Moderate (3-5 per post)' },
  { value: 'heavy', label: 'Heavy (6+ per post)' },
] as const;

export const POST_LENGTH_OPTIONS = [
  { value: 'short', label: 'Short (50-100 words)' },
  { value: 'medium', label: 'Medium (100-200 words)' },
  { value: 'long', label: 'Long (200-300 words)' },
  { value: 'very_long', label: 'Very Long (300+ words)' },
] as const;