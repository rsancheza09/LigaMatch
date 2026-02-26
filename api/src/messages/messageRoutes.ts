import { createBadRequest, createForbidden, createNotFound } from '../errors';
import type { Plugin, Request, ResponseToolkit } from '@hapi/hapi';
import Joi from 'joi';
import {
  Backup,
  Conversation,
  ConversationParticipant,
  Message,
  TournamentAdmin,
  TournamentTeam,
  TeamMember,
  User,
} from '../models';
import { uuidParam } from '../schemas';
import { requireRole } from '../utils/requireRole';
import { sendMessageCopy, sendMessageCopyToSender } from '../services/emailService';

async function getTournamentIdsForUser(userId: string): Promise<Set<string>> {
  const adminIds = (await TournamentAdmin.query().where({ userId }).select('tournamentId')).map((a) => a.tournamentId);
  const teamIds = (await TeamMember.query().where({ userId }).select('teamId')).map((m) => m.teamId);
  const teamTournamentIds =
    teamIds.length > 0
      ? (await TournamentTeam.query().whereIn('teamId', teamIds).select('tournamentId')).map((tt) => tt.tournamentId)
      : [];
  return new Set([...adminIds, ...teamTournamentIds]);
}

/** List users the current user can message (same tournament as admin or team member) */
const listRelatedUsers = async (request: Request) => {
  const { userId } = request.auth!.credentials as { userId: string };
  const tournamentIds = await getTournamentIdsForUser(userId);
  if (tournamentIds.size === 0) return { users: [] };

  const adminUserIds = (await TournamentAdmin.query().whereIn('tournamentId', [...tournamentIds]).select('userId')).map((a) => (a as { userId: string }).userId);
  const teamIdsInTournaments = (await TournamentTeam.query().whereIn('tournamentId', [...tournamentIds]).select('teamId')).map((tt) => (tt as { teamId: string }).teamId);
  const memberUserIds =
    teamIdsInTournaments.length > 0
      ? (await TeamMember.query().whereIn('teamId', teamIdsInTournaments).select('userId')).map((m) => (m as { userId: string }).userId)
      : [];
  const allIds = new Set<string>([...adminUserIds, ...memberUserIds]);
  allIds.delete(userId);
  if (allIds.size === 0) return { users: [] };

  const users = await User.query()
    .whereIn('id', [...allIds])
    .select('id', 'email', 'name')
    .orderBy('name')
    .orderBy('email');
  return { users: users.map((u) => ({ id: u.id, email: u.email, name: u.name })) };
};

async function areUsersRelated(userId1: string, userId2: string): Promise<boolean> {
  if (userId1 === userId2) return false;
  const t1 = await getTournamentIdsForUser(userId1);
  const t2 = await getTournamentIdsForUser(userId2);
  for (const id of t1) {
    if (t2.has(id)) return true;
  }
  return false;
}

async function ensureConversationParticipant(userId: string, conversationId: string): Promise<void> {
  const part = await ConversationParticipant.query().findOne({ conversationId, userId });
  if (!part) throw createForbidden(undefined, 'errors.notParticipant');
}

const listConversations = async (request: Request) => {
  const { userId } = request.auth!.credentials as { userId: string };

  const myParticipations = await ConversationParticipant.query()
    .where({ userId })
    .select('conversationId');
  const conversationIds = myParticipations.map((p) => p.conversationId);
  if (conversationIds.length === 0) return { conversations: [] };

  const conversations = await Conversation.query()
    .whereIn('id', conversationIds)
    .withGraphFetched('[participants.user, messages]')
    .modifyGraph('messages', (qb) => qb.orderBy('created_at', 'desc').limit(1));

  const withOther = await Promise.all(
    conversations.map(async (conv) => {
      const participants = (conv as { participants?: Array<{ userId: string; user?: { id: string; email: string; name?: string } }> })
        .participants ?? [];
      const other = participants.find((p) => p.userId !== userId);
      const lastMessage = ((conv as { messages?: Array<{ body: string; createdAt: string; senderId: string }> }).messages ?? [])[0];
      return {
        id: conv.id,
        otherUser: other?.user
          ? { id: other.userId, email: other.user.email, name: other.user.name }
          : null,
        lastMessage: lastMessage
          ? { body: lastMessage.body, createdAt: lastMessage.createdAt, senderId: lastMessage.senderId }
          : null,
        updatedAt: conv.updatedAt,
      };
    })
  );

  withOther.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return { conversations: withOther };
};

const createOrGetConversation = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth!.credentials as { userId: string };
  const { otherUserId } = request.payload as { otherUserId: string };

  if (otherUserId === userId) throw createBadRequest(request, 'errors.cannotMessageYourself');

  const related = await areUsersRelated(userId, otherUserId);
  if (!related) throw createForbidden(request, 'errors.onlyMessageRelatedUsers');

  const otherUser = await User.query().findById(otherUserId).select('id', 'email', 'name');
  if (!otherUser) throw createNotFound(request, 'errors.userNotFound');

  const myParticipations = await ConversationParticipant.query()
    .where({ userId })
    .select('conversationId');
  const otherParticipations = await ConversationParticipant.query()
    .where({ userId: otherUserId })
    .select('conversationId');
  const mySet = new Set(myParticipations.map((p) => p.conversationId));
  for (const p of otherParticipations) {
    if (mySet.has(p.conversationId)) {
      const existing = await Conversation.query().findById(p.conversationId);
      return h.response({ conversation: existing, otherUser: { id: otherUser.id, email: otherUser.email, name: otherUser.name } }).code(200);
    }
  }

  const conversation = await Conversation.query().insertAndFetch({});
  await ConversationParticipant.query().insert([
    { conversationId: conversation.id, userId },
    { conversationId: conversation.id, userId: otherUserId },
  ]);

  return h
    .response({
      conversation: { id: conversation.id, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt },
      otherUser: { id: otherUser.id, email: otherUser.email, name: otherUser.name },
    })
    .code(201);
};

const getMessages = async (request: Request) => {
  const { userId } = request.auth!.credentials as { userId: string };
  const { id: conversationId } = request.params as { id: string };
  const query = request.query as { limit?: string; before?: string };

  await ensureConversationParticipant(userId, conversationId);

  const limit = Math.min(Number(query.limit) || 50, 100);
  let q = Message.query()
    .where({ conversationId })
    .orderBy('createdAt', 'desc')
    .limit(limit + 1)
    .withGraphFetched('sender');

  if (query.before) {
    q = q.where('createdAt', '<', query.before);
  }

  const messages = await q;
  const hasMore = messages.length > limit;
  const list = hasMore ? messages.slice(0, limit) : messages;
  list.reverse();

  return {
    messages: list.map((m) => ({
      id: m.id,
      body: m.body,
      senderId: m.senderId,
      sender: (m as { sender?: { id: string; email: string; name?: string } }).sender,
      createdAt: m.createdAt,
    })),
    hasMore,
  };
};

const sendMessage = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth!.credentials as { userId: string };
  const { id: conversationId } = request.params as { id: string };
  const { body } = request.payload as { body: string };

  await ensureConversationParticipant(userId, conversationId);

  const sender = await User.query().findById(userId).select('id', 'name', 'email');
  const participants = await ConversationParticipant.query()
    .where({ conversationId })
    .whereNot('userId', userId);
  const recipientIds = participants.map((p) => p.userId);

  const message = await Message.query().insertAndFetch({
    conversationId,
    senderId: userId,
    body: body.trim(),
  });

  const appUrl = process.env.APP_URL || 'http://localhost:4000';
  const conversationLink = `${appUrl}/dashboard?section=messages&conversation=${conversationId}`;

  for (const recipientId of recipientIds) {
    const recipient = await User.query().findById(recipientId).select('email', 'name');
    if (recipient?.email) {
      try {
        await sendMessageCopy({
          to: recipient.email,
          fromName: sender?.name || sender?.email || 'Un usuario',
          body: body.trim(),
          conversationLink,
        });
        await Message.query().findById(message.id).patch({ emailSentAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      } catch (err) {
        console.error('[email] Failed to send message copy:', err);
      }
    }
  }

  if (sender?.email) {
    try {
      const firstRecipient = recipientIds.length === 1
        ? await User.query().findById(recipientIds[0]).select('name', 'email')
        : null;
      await sendMessageCopyToSender({
        to: sender.email,
        body: body.trim(),
        conversationLink,
        recipientName: firstRecipient?.name ?? firstRecipient?.email ?? undefined,
      });
    } catch (err) {
      console.error('[email] Failed to send message copy to sender:', err);
    }
  }

  return h
    .response({
      id: message.id,
      body: message.body,
      senderId: message.senderId,
      createdAt: message.createdAt,
    })
    .code(201);
};

const messageBodyPayload = Joi.object({
  body: Joi.string().min(1).max(10000).required().trim(),
});

const createConversationPayload = Joi.object({
  otherUserId: Joi.string().uuid().required().description('User ID to start conversation with'),
});

const deleteConversation = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth!.credentials as { userId: string };
  const { id: conversationId } = request.params as { id: string };

  await ensureConversationParticipant(userId, conversationId);

  const conv = await Conversation.query().findById(conversationId);
  if (!conv) throw createNotFound(request, 'errors.conversationNotFound');

  await Conversation.query().deleteById(conversationId);

  return h.response().code(204);
};

const backupOldConversations = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth!.credentials as { userId: string };
  await requireRole(request, 'system_admin');

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 1);
  const cutoffIso = cutoff.toISOString();

  const oldConversations = await Conversation.query()
    .where('updatedAt', '<', cutoffIso)
    .withGraphFetched('[participants, messages]')
    .orderBy('updatedAt', 'asc');

  if (oldConversations.length === 0) {
    return h.response({ backedUp: 0, backupId: null });
  }

  const payload = {
    backedUpAt: new Date().toISOString(),
    cutoffBefore: cutoffIso,
    conversations: oldConversations.map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      participants: (c as { participants?: Array<{ id: string; conversationId: string; userId: string; createdAt: string; updatedAt: string }> }).participants?.map((p) => ({
        id: p.id,
        conversationId: p.conversationId,
        userId: p.userId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })) ?? [],
      messages: (c as { messages?: Array<{ id: string; conversationId: string; senderId: string; body: string; emailSentAt?: string | null; createdAt: string; updatedAt: string }> }).messages?.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        body: m.body,
        emailSentAt: m.emailSentAt ?? null,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })) ?? [],
    })),
  };

  const backup = await Backup.query().insertAndFetch({
    type: 'conversations_archive',
    payload: payload as unknown as Record<string, unknown>,
    createdBy: userId,
  });

  return h.response({ backedUp: oldConversations.length, backupId: backup.id });
};

export const messageRoutes: Plugin<void> = {
  name: 'messages',
  register: async (server) => {
    server.route([
      {
        method: 'GET',
        path: '/messages/related-users',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'messages'],
          description: 'List users you can start a conversation with (same tournament).',
        },
        handler: listRelatedUsers,
      },
      {
        method: 'GET',
        path: '/messages/conversations',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'messages'],
          description: 'List my conversations.',
        },
        handler: listConversations,
      },
      {
        method: 'POST',
        path: '/messages/conversations',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'messages'],
          description: 'Create or get a 1:1 conversation with another user (must be related via tournament).',
          validate: { payload: createConversationPayload },
        },
        handler: createOrGetConversation,
      },
      {
        method: 'GET',
        path: '/messages/conversations/{id}/messages',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'messages'],
          description: 'Get messages in a conversation (paginated).',
          validate: {
            params: uuidParam,
            query: Joi.object({
              limit: Joi.number().integer().min(1).max(100).optional(),
              before: Joi.string().isoDate().optional().description('Cursor: get messages before this date'),
            }),
          },
        },
        handler: getMessages,
      },
      {
        method: 'POST',
        path: '/messages/conversations/{id}/messages',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'messages'],
          description: 'Send a message. A copy is sent to the recipient email.',
          validate: {
            params: uuidParam,
            payload: messageBodyPayload,
          },
        },
        handler: sendMessage,
      },
      {
        method: 'DELETE',
        path: '/messages/conversations/{id}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'messages'],
          description: 'Delete a conversation. Only participants can delete. Removes all messages.',
          validate: { params: uuidParam },
        },
        handler: deleteConversation,
      },
      {
        method: 'POST',
        path: '/messages/backup-old-conversations',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'messages'],
          description: 'Create a backup (JSON) of conversations not updated in over 1 month. Does not delete anything. Stored in backups table. Requires system_admin role.',
        },
        handler: backupOldConversations,
      },
    ]);
  },
};
