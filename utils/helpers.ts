export const generateId = () => crypto.randomUUID();
export const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};
export const getInitials = (name: string) => name.split(' ').map(part => part[0]).join('').toUpperCase();
export const calculateProfileCompletion = (profile: any) => {
  // logic to calculate profile completion
  return 100; // placeholder
};
export const buildLinkedInCopyText = (text: string) => {
  // logic to format LinkedIn copy text
  return text.replace(/\n/g, '\n
').replace(/#(\S+)/g, '#$1'); // example formatting
};