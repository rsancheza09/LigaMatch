import { Model } from './Model';

export class PlayerTournamentCategory extends Model {
  static tableName = 'player_tournament_categories';

  id!: string;
  playerId!: string;
  tournamentId!: string;
  tournamentAgeCategoryId!: string;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { Player } = require('./Player');
    const { Tournament } = require('./Tournament');
    const { TournamentAgeCategory } = require('./TournamentAgeCategory');
    return {
      player: {
        relation: Model.BelongsToOneRelation,
        modelClass: Player,
        join: {
          from: 'player_tournament_categories.player_id',
          to: 'players.id',
        },
      },
      tournament: {
        relation: Model.BelongsToOneRelation,
        modelClass: Tournament,
        join: {
          from: 'player_tournament_categories.tournament_id',
          to: 'tournaments.id',
        },
      },
      tournamentAgeCategory: {
        relation: Model.BelongsToOneRelation,
        modelClass: TournamentAgeCategory,
        join: {
          from: 'player_tournament_categories.tournament_age_category_id',
          to: 'tournament_age_categories.id',
        },
      },
    };
  }
}
