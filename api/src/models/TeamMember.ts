import { Model } from './Model';

export class TeamMember extends Model {
  static tableName = 'team_members';

  id!: string;
  teamId!: string;
  userId!: string;
  isAdmin!: boolean;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { Team } = require('./Team');
    const { User } = require('./User');
    return {
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: 'team_members.team_id',
          to: 'teams.id',
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'team_members.user_id',
          to: 'users.id',
        },
      },
    };
  }
}
