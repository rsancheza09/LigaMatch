import { Model } from './Model';

export class TeamInvitation extends Model {
  static tableName = 'team_invitations';

  id!: string;
  teamId!: string;
  email!: string;
  token!: string;
  status!: 'pending' | 'accepted' | 'expired';
  expiresAt!: string;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { Team } = require('./Team');
    return {
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: 'team_invitations.team_id',
          to: 'teams.id',
        },
      },
    };
  }
}
