import { apiRequest } from './client';

export type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  readAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ListNotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
};

export type ListNotificationsParams = {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
};

export function listNotifications(params?: ListNotificationsParams): Promise<ListNotificationsResponse> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.offset != null) search.set('offset', String(params.offset));
  if (params?.unreadOnly === true) search.set('unreadOnly', 'true');
  const qs = search.toString();
  return apiRequest<ListNotificationsResponse>(`/notifications${qs ? `?${qs}` : ''}`);
}

export function markNotificationRead(id: string): Promise<void> {
  return apiRequest<void>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(): Promise<void> {
  return apiRequest<void>('/notifications/read-all', { method: 'PATCH' });
}
