import { Model } from './Model';

export class Notification extends Model {
  static tableName = 'notifications';

  id!: string;
  userId!: string;
  type!: string;
  title!: string;
  body?: string | null;
  link?: string | null;
  readAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { User } = require('./User');
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'notifications.user_id',
          to: 'users.id',
        },
      },
    };
  }
}
