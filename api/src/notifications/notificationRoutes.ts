import type { Plugin, Request, ResponseToolkit } from '@hapi/hapi';
import { createNotFound } from '../errors';
import Joi from 'joi';
import { Notification } from '../models/Notification';
import { uuidParam } from '../schemas';

const listQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
  unreadOnly: Joi.string().valid('true', 'false').optional(),
});

const list = async (request: Request) => {
  const { userId } = request.auth!.credentials as { userId: string };
  const query = request.query as { limit?: string; offset?: string; unreadOnly?: string };
  const limit = Math.min(Number(query.limit) || 20, 100);
  const offset = Number(query.offset) || 0;
  const unreadOnly = query.unreadOnly === 'true';

  let q = Notification.query()
    .where({ userId })
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .offset(offset);

  if (unreadOnly) {
    q = q.whereNull('readAt');
  }

  const notifications = await q;
  const unreadCount = await Notification.query()
    .where({ userId })
    .whereNull('readAt')
    .resultSize();

  return {
    notifications,
    unreadCount,
  };
};

const markRead = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth!.credentials as { userId: string };
  const { id } = request.params as { id: string };

  const notification = await Notification.query().findById(id);
  if (!notification || notification.userId !== userId) {
    throw createNotFound(request, 'errors.notificationNotFound');
  }

  await Notification.query().deleteById(id);

  return h.response().code(204);
};

const markAllRead = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth!.credentials as { userId: string };

  await Notification.query()
    .where({ userId })
    .whereNull('readAt')
    .delete();

  return h.response().code(204);
};

export const notificationRoutes: Plugin<void> = {
  name: 'notifications',
  register: async (server) => {
    server.route([
      {
        method: 'GET',
        path: '/notifications',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'notifications'],
          description: 'List notifications for current user (inbox).',
          validate: {
            query: listQuerySchema,
          },
        },
        handler: list,
      },
      {
        method: 'PATCH',
        path: '/notifications/{id}/read',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'notifications'],
          description: 'Mark a notification as read.',
          validate: { params: uuidParam },
        },
        handler: markRead,
      },
      {
        method: 'PATCH',
        path: '/notifications/read-all',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'notifications'],
          description: 'Mark all notifications as read.',
        },
        handler: markAllRead,
      },
    ]);
  },
};
