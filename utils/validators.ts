export const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
export const validatePassword = (password: string) => password.length >= 6;
export const validateApiKey = (key: string) => key.length > 0; // Add platform-specific checks
export const validateInviteCode = (code: string) => code.length > 0;
export const validateUrl = (url: string) => /^(https?:\/\/)/.test(url);
export const validatePersonaName = (name: string) => name.length > 0;