export const formatDate = (date: Date) => date.toLocaleDateString();
export const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff < 1000 ? 'just now' : `${Math.floor(diff / 60000)} min ago`;
};
export const formatTokenCount = (count: number) => `${count} tokens`;
export const formatNumber = (num: number) => new Intl.NumberFormat().format(num);
export const truncateText = (text: string, length: number) => text.length > length ? text.slice(0, length) + '...' : text;
export const formatFileSize = (bytes: number) => `${(bytes / 1024).toFixed(2)} KB`;