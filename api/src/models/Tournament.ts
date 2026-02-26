import { Model } from './Model';
import { TournamentAgeCategory } from './TournamentAgeCategory';

export class Tournament extends Model {
  static tableName = 'tournaments';

  id!: string;
  slug!: string;
  createdBy?: string;
  sport!: string;
  categoryType!: string;
  tournamentType?: string;
  name!: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  isSingleVenue!: boolean;
  venueName?: string | null;
  logoUrl?: string | null;
  isPublic!: boolean;
  publicPageColors?: { primary?: string; secondary?: string } | null;
  status!: string; // active, suspended
  standingsOrder?: string[] | null; // Manual order of team IDs for standings table
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { Team } = require('./Team');
    return {
      ageCategories: {
        relation: Model.HasManyRelation,
        modelClass: TournamentAgeCategory,
        join: {
          from: 'tournaments.id',
          to: 'tournament_age_categories.tournamentId',
        },
      },
      teams: {
        relation: Model.ManyToManyRelation,
        modelClass: Team,
        join: {
          from: 'tournaments.id',
          through: {
            from: 'tournament_teams.tournamentId',
            to: 'tournament_teams.teamId',
            extra: ['groupId'],
          },
          to: 'teams.id',
        },
      },
    };
  }
}
