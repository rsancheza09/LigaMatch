import { Model } from './Model';

export class Backup extends Model {
  static tableName = 'backups';

  id!: string;
  type!: string;
  payload!: Record<string, unknown>;
  createdBy!: string | null;
  createdAt!: string;

  static get relationMappings() {
    const { User } = require('./User');
    return {
      createdByUser: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'backups.created_by',
          to: 'users.id',
        },
      },
    };
  }
}
