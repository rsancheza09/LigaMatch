import { apiRequest } from './client';

export type MatchTeam = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

export type MatchVenue = {
  id: string;
  name: string;
  isOfficial?: boolean;
};

export type MatchEvent = {
  type: 'goal' | 'yellow_card' | 'red_card';
  teamSide: 'home' | 'away';
  playerId?: string;
  playerName?: string;
  minute?: number;
  ownGoal?: boolean;
  /** Number of goals for this scorer (UI only; when saving we expand to one event per goal for the API). Default 1. */
  goals?: number;
};

export type MatchPenalty = {
  type: 'player' | 'team' | 'staff';
  targetId?: string;
  targetName?: string;
  description?: string;
  amount?: number;
  currency?: string;
};

export type Match = {
  id: string;
  tournamentId: string;
  groupId?: string;
  homeTeamId: string;
  awayTeamId: string;
  round: number;
  suspendedMatchId?: string | null;
  venueId?: string | null;
  venue?: MatchVenue | null;
  scheduledAt: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  statistics?: Record<string, number> | null;
  matchEvents?: MatchEvent[] | null;
  matchExtraPoints?: { home?: number; away?: number } | null;
  matchPenalties?: MatchPenalty[] | null;
  isManual?: boolean;
  createdAt: string;
  updatedAt: string;
  homeTeam?: MatchTeam;
  awayTeam?: MatchTeam;
  group?: { id: string; name: string };
};

export async function listMatches(tournamentId: string): Promise<Match[]> {
  return apiRequest<Match[]>(`/tournaments/${encodeURIComponent(tournamentId)}/matches`);
}

export async function createMatch(
  tournamentId: string,
  payload: {
    homeTeamId: string;
    awayTeamId: string;
    round?: number;
    suspendedMatchId?: string | null;
    scheduledAt?: string | null;
  }
): Promise<Match> {
  return apiRequest<Match>(
    `/tournaments/${encodeURIComponent(tournamentId)}/matches`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function generateSchedule(
  tournamentId: string,
  payload: { rounds: 1 | 2; mode?: 'all' | 'groups'; numGroups?: number }
): Promise<Match[]> {
  return apiRequest<Match[]>(
    `/tournaments/${encodeURIComponent(tournamentId)}/matches/generate`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteMatches(tournamentId: string): Promise<void> {
  return apiRequest<void>(
    `/tournaments/${encodeURIComponent(tournamentId)}/matches`,
    { method: 'DELETE' }
  );
}

export async function deleteMatch(tournamentId: string, matchId: string): Promise<void> {
  return apiRequest<void>(
    `/tournaments/${encodeURIComponent(tournamentId)}/matches/${encodeURIComponent(matchId)}`,
    { method: 'DELETE' }
  );
}

export async function updateMatch(
  tournamentId: string,
  matchId: string,
  payload: {
    scheduledAt?: string | null;
    homeScore?: number | null;
    awayScore?: number | null;
    status?: 'scheduled' | 'played' | 'suspended' | 'cancelled';
    venueId?: string | null;
    statistics?: Record<string, number> | null;
    matchEvents?: MatchEvent[] | null;
    matchExtraPoints?: { home?: number; away?: number } | null;
    matchPenalties?: MatchPenalty[] | null;
  }
): Promise<Match> {
  return apiRequest<Match>(
    `/tournaments/${encodeURIComponent(tournamentId)}/matches/${encodeURIComponent(matchId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
}
