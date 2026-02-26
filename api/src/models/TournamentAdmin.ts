import { Model } from './Model';

export class TournamentAdmin extends Model {
  static tableName = 'tournament_admins';

  id!: string;
  userId!: string;
  tournamentId!: string;
  createdAt!: string;
  updatedAt!: string;
}
