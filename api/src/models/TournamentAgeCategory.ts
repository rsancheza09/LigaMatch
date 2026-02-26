import { Model } from './Model';

export class TournamentAgeCategory extends Model {
  static tableName = 'tournament_age_categories';

  id!: string;
  tournamentId!: string;
  name!: string;
  minBirthYear!: number;
  maxBirthYear!: number;
  createdAt!: string;
  updatedAt!: string;
}
