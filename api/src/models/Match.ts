import { Model } from './Model';

export type MatchEvent = {
  type: 'goal' | 'yellow_card' | 'red_card';
  teamSide: 'home' | 'away';
  playerId?: string;
  playerName?: string;
  minute?: number;
  ownGoal?: boolean;
};

export type MatchPenalty = {
  type: 'player' | 'team' | 'staff';
  targetId?: string;
  targetName?: string;
  description?: string;
  amount?: number;
  currency?: string;
};

export class Match extends Model {
  static tableName = 'matches';

  id!: string;
  tournamentId!: string;
  groupId?: string;
  homeTeamId!: string;
  awayTeamId!: string;
  round!: number;
  suspendedMatchId?: string | null;
  venueId?: string | null;
  scheduledAt!: string | null;
  homeScore!: number | null;
  awayScore!: number | null;
  status!: string;
  isManual!: boolean;
  statistics?: Record<string, number> | null;
  matchEvents?: MatchEvent[] | null;
  matchExtraPoints?: { home?: number; away?: number } | null;
  matchPenalties?: MatchPenalty[] | null;
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
          from: 'matches.tournamentId',
          to: 'tournaments.id',
        },
      },
      group: {
        relation: Model.BelongsToOneRelation,
        modelClass: TournamentGroup,
        join: {
          from: 'matches.groupId',
          to: 'tournament_groups.id',
        },
      },
      homeTeam: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: 'matches.homeTeamId',
          to: 'teams.id',
        },
      },
      awayTeam: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: 'matches.awayTeamId',
          to: 'teams.id',
        },
      },
      suspendedMatch: {
        relation: Model.BelongsToOneRelation,
        modelClass: Match,
        join: {
          from: 'matches.suspendedMatchId',
          to: 'matches.id',
        },
      },
      venue: {
        relation: Model.BelongsToOneRelation,
        modelClass: require('./TeamVenue').TeamVenue,
        join: {
          from: 'matches.venueId',
          to: 'team_venues.id',
        },
      },
    };
  }
}
