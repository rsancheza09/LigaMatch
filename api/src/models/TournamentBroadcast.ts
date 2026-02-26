import { Model } from './Model';

export class TournamentBroadcast extends Model {
  static tableName = 'tournament_broadcasts';

  id!: string;
  tournamentId!: string;
  senderId!: string;
  body!: string;
  sentCount!: number;
  createdAt!: string;
}
