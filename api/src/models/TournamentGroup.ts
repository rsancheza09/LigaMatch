import { Model } from './Model';

export class TournamentGroup extends Model {
  static tableName = 'tournament_groups';

  id!: string;
  tournamentId!: string;
  name!: string;
  sortOrder!: number;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { Team } = require('./Team');
    const { Tournament } = require('./Tournament');
    return {
      tournament: {
        relation: Model.BelongsToOneRelation,
        modelClass: Tournament,
        join: {
          from: 'tournament_groups.tournamentId',
          to: 'tournaments.id',
        },
      },
      teams: {
        relation: Model.HasManyRelation,
        modelClass: Team,
        join: {
          from: 'tournament_groups.id',
          to: 'teams.groupId',
        },
      },
    };
  }
}
