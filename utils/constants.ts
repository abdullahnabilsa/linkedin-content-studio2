export const PLATFORMS = {
  OPENAI: { name: 'OpenAI', endpoint: 'https://api.openai.com/v1' },
  ANTHROPIC: { name: 'Anthropic', endpoint: 'https://api.anthropic.com/v1' },
  // other platforms
};

export const FORMAT_TEMPLATES = [
  { id: 'template1', name: 'Template 1', description: 'Description 1', system_prompt: 'Prompt 1' },
  // other templates
];

export const DEFAULT_SYSTEM_CONFIG = {
  max_messages: 100,
  // other default values
};

export const INDUSTRIES = ['Tech', 'Finance', 'Health', 'Education'];
export const LINKEDIN_GOALS = ['Networking', 'Job Seeking', 'Content Sharing'];
export const EXPERIENCE_LEVELS = ['Entry', 'Mid', 'Senior'];
export const TONE_OPTIONS = ['Formal', 'Informal'];
export const EMOJI_OPTIONS = ['None', 'Some', 'Frequent'];
export const POST_LENGTH_OPTIONS = ['Short', 'Medium', 'Long'];