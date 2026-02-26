import { Model } from './Model';

export type PlayerChangeRequestType = 'add' | 'edit' | 'delete';

export type PlayerChangeRequestPayload = {
  name?: string;
  birthYear?: number;
  tournamentAgeCategoryId?: string;
};

export class PlayerChangeRequest extends Model {
  static tableName = 'player_change_requests';

  id!: string;
  tournamentId!: string;
  teamId!: string;
  playerId!: string | null;
  type!: PlayerChangeRequestType;
  payload!: PlayerChangeRequestPayload;
  requestedByUserId!: string;
  status!: 'pending' | 'approved' | 'rejected';
  decidedAt!: string | null;
  decidedByUserId!: string | null;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { Team } = require('./Team');
    const { Player } = require('./Player');
    const { Tournament } = require('./Tournament');
    const { User } = require('./User');
    return {
      tournament: {
        relation: Model.BelongsToOneRelation,
        modelClass: Tournament,
        join: {
          from: 'player_change_requests.tournament_id',
          to: 'tournaments.id',
        },
      },
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: 'player_change_requests.team_id',
          to: 'teams.id',
        },
      },
      player: {
        relation: Model.BelongsToOneRelation,
        modelClass: Player,
        join: {
          from: 'player_change_requests.player_id',
          to: 'players.id',
        },
      },
      requestedByUser: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'player_change_requests.requested_by_user_id',
          to: 'users.id',
        },
      },
      decidedByUser: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'player_change_requests.decided_by_user_id',
          to: 'users.id',
        },
      },
    };
  }
}
