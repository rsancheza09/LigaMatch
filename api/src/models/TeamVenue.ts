import { Model } from './Model';

export class TeamVenue extends Model {
  static tableName = 'team_venues';

  id!: string;
  teamId!: string;
  name!: string;
  isOfficial!: boolean;
  sortOrder!: number;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { Team } = require('./Team');
    return {
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: 'team_venues.teamId',
          to: 'teams.id',
        },
      },
    };
  }
}
