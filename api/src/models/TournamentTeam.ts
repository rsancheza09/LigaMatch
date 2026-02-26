import { Model } from './Model';

export class TournamentTeam extends Model {
  static tableName = 'tournament_teams';

  static get idColumn(): string[] {
    return ['tournamentId', 'teamId'];
  }

  tournamentId!: string;
  teamId!: string;
  groupId?: string | null;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { Team } = require('./Team');
    const { Tournament } = require('./Tournament');
    const { TournamentGroup } = require('./TournamentGroup');
    return {
      tournament: {
        relation: Model.BelongsToOneRelation,
        modelClass: Tournament,
        join: {
          from: 'tournament_teams.tournamentId',
          to: 'tournaments.id',
        },
      },
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: 'tournament_teams.teamId',
          to: 'teams.id',
        },
      },
      group: {
        relation: Model.BelongsToOneRelation,
        modelClass: TournamentGroup,
        join: {
          from: 'tournament_teams.groupId',
          to: 'tournament_groups.id',
        },
      },
    };
  }
}
