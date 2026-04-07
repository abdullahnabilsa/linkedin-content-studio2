export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
};

export type NotificationType = 'info' | 'warning' | 'error';
export type NotificationPriority = 'normal' | 'urgent';