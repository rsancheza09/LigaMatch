import { Model } from './Model';

export class PasswordResetToken extends Model {
  static tableName = 'password_reset_tokens';

  id!: string;
  userId!: string;
  token!: string;
  expiresAt!: string;
  usedAt!: string | null;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { User } = require('./User');
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'password_reset_tokens.user_id',
          to: 'users.id',
        },
      },
    };
  }
}
