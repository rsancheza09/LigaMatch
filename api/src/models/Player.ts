import { Model } from './Model';

export class Player extends Model {
  static tableName = 'players';

  id!: string;
  teamId!: string;
  name!: string;
  birthYear?: number;
  tournamentAgeCategoryId?: string;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianIdNumber?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  photoUrl?: string | null;
  sortOrder!: number;
  /** 'active' = inscrito, 'unsubscribed' = desinscrito (soft delete). */
  status!: 'active' | 'unsubscribed';
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { Team } = require('./Team');
    const { TournamentAgeCategory } = require('./TournamentAgeCategory');
    const { PlayerDocument } = require('./PlayerDocument');
    return {
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: 'players.team_id',
          to: 'teams.id',
        },
      },
      tournamentAgeCategory: {
        relation: Model.BelongsToOneRelation,
        modelClass: TournamentAgeCategory,
        join: {
          from: 'players.tournament_age_category_id',
          to: 'tournament_age_categories.id',
        },
      },
      documents: {
        relation: Model.HasManyRelation,
        modelClass: PlayerDocument,
        join: {
          from: 'players.id',
          to: 'player_documents.player_id',
        },
      },
    };
  }
}
