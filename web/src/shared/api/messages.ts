import { apiRequest } from './client';

export type ConversationSummary = {
  id: string;
  otherUser: { id: string; email: string; name?: string } | null;
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  updatedAt: string;
};

export type ConversationItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type ListConversationsResponse = {
  conversations: ConversationSummary[];
};

export type CreateConversationResponse = {
  conversation: ConversationItem;
  otherUser: { id: string; email: string; name?: string };
};

export type MessageItem = {
  id: string;
  body: string;
  senderId: string;
  sender?: { id: string; email: string; name?: string };
  createdAt: string;
};

export type GetMessagesResponse = {
  messages: MessageItem[];
  hasMore: boolean;
};

export type GetMessagesParams = {
  limit?: number;
  before?: string;
};

export type RelatedUser = {
  id: string;
  email: string;
  name?: string;
};

export type ListRelatedUsersResponse = {
  users: RelatedUser[];
};

export function listRelatedUsers(): Promise<ListRelatedUsersResponse> {
  return apiRequest<ListRelatedUsersResponse>('/messages/related-users');
}

export function listConversations(): Promise<ListConversationsResponse> {
  return apiRequest<ListConversationsResponse>('/messages/conversations');
}

export function createOrGetConversation(otherUserId: string): Promise<CreateConversationResponse> {
  return apiRequest<CreateConversationResponse>('/messages/conversations', {
    method: 'POST',
    body: JSON.stringify({ otherUserId }),
  });
}

export function getMessages(conversationId: string, params?: GetMessagesParams): Promise<GetMessagesResponse> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.before) search.set('before', params.before);
  const qs = search.toString();
  return apiRequest<GetMessagesResponse>(
    `/messages/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`
  );
}

export function sendMessage(conversationId: string, body: string): Promise<MessageItem> {
  return apiRequest<MessageItem>(`/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body: body.trim() }),
  });
}

export function deleteConversation(conversationId: string): Promise<void> {
  return apiRequest<void>(`/messages/conversations/${conversationId}`, { method: 'DELETE' });
}
