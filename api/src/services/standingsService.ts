/**
 * Standings calculation for football and futsal (FIFA regulations):
 * 3 pts win, 1 draw, 0 loss. PJ, PG, PE, PP, GF, GC, GD, Pts
 */

export type StandingRow = {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  extraPoints?: number; // Optional bonus points (e.g. fair play)
};

type MatchRow = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  groupId?: string | null;
};

type TeamRow = {
  id: string;
  name: string;
  logoUrl?: string | null;
  groupId?: string | null;
};

type GroupRow = {
  id: string;
  name: string;
};

function getPointsForResult(_sport: string, isWin: boolean, isDraw: boolean): number {
  if (isWin) return 3;
  if (isDraw) return 1;
  return 0;
}

function calculateStandings(
  teams: TeamRow[],
  matches: MatchRow[],
  groups: GroupRow[],
  sport: string,
  groupId?: string | null
): StandingRow[] {
  const filteredTeams = groupId
    ? teams.filter((t) => t.groupId === groupId)
    : teams.filter((t) => !t.groupId);
  const filteredMatches = groupId
    ? matches.filter((m) => m.groupId === groupId && m.status === 'played')
    : matches.filter((m) => !m.groupId && m.status === 'played');

  const teamIds = new Set(filteredTeams.map((t) => t.id));
  const stats = new Map<
    string,
    { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number }
  >();

  for (const t of filteredTeams) {
    stats.set(t.id, { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 });
  }

  for (const m of filteredMatches) {
    const home = m.homeScore ?? 0;
    const away = m.awayScore ?? 0;
    if (!teamIds.has(m.homeTeamId) || !teamIds.has(m.awayTeamId)) continue;

    const homeStats = stats.get(m.homeTeamId)!;
    const awayStats = stats.get(m.awayTeamId)!;

    homeStats.played++;
    awayStats.played++;
    homeStats.goalsFor += home;
    homeStats.goalsAgainst += away;
    awayStats.goalsFor += away;
    awayStats.goalsAgainst += home;

    if (home > away) {
      homeStats.won++;
      awayStats.lost++;
    } else if (away > home) {
      awayStats.won++;
      homeStats.lost++;
    } else {
      homeStats.drawn++;
      awayStats.drawn++;
    }
  }

  const group = groups.find((g) => g.id === groupId);
  const rows: StandingRow[] = filteredTeams.map((t) => {
    const s = stats.get(t.id)!;
    const points =
      s.won * getPointsForResult(sport, true, false) +
      s.drawn * getPointsForResult(sport, false, true);
    return {
      teamId: t.id,
      teamName: t.name,
      teamLogoUrl: t.logoUrl ?? null,
      groupId: groupId ?? undefined,
      groupName: group?.name,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDiff: s.goalsFor - s.goalsAgainst,
      points,
    };
  });

  // Sort: points desc, goalDiff desc, goalsFor desc
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });

  return rows;
}

function applyStandingsOrder(rows: StandingRow[], standingsOrder: string[] | null | undefined): StandingRow[] {
  if (!standingsOrder || standingsOrder.length === 0) return rows;
  const orderMap = new Map(standingsOrder.map((id, i) => [id, i]));
  return [...rows].sort((a, b) => {
    const ai = orderMap.get(a.teamId) ?? 999999;
    const bi = orderMap.get(b.teamId) ?? 999999;
    if (ai !== bi) return ai - bi;
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });
}

/** Overall standings (all teams, all played matches). Used as "tabla general" when tournament has groups. */
export function computeGeneralStandings(
  teams: TeamRow[],
  matches: MatchRow[],
  sport: string,
  standingsOrder?: string[] | null,
  groups?: GroupRow[]
): StandingRow[] {
  const playedMatches = matches.filter((m) => m.status === 'played');
  const teamIds = new Set(teams.map((t) => t.id));
  const stats = new Map<
    string,
    { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number }
  >();

  for (const t of teams) {
    stats.set(t.id, { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 });
  }

  for (const m of playedMatches) {
    const home = m.homeScore ?? 0;
    const away = m.awayScore ?? 0;
    if (!teamIds.has(m.homeTeamId) || !teamIds.has(m.awayTeamId)) continue;
    const homeStats = stats.get(m.homeTeamId)!;
    const awayStats = stats.get(m.awayTeamId)!;
    homeStats.played++;
    awayStats.played++;
    homeStats.goalsFor += home;
    homeStats.goalsAgainst += away;
    awayStats.goalsFor += away;
    awayStats.goalsAgainst += home;
    if (home > away) {
      homeStats.won++;
      awayStats.lost++;
    } else if (away > home) {
      awayStats.won++;
      homeStats.lost++;
    } else {
      homeStats.drawn++;
      awayStats.drawn++;
    }
  }

  const groupById = groups?.length ? new Map(groups.map((g) => [g.id, g])) : null;

  const rows: StandingRow[] = teams.map((t) => {
    const s = stats.get(t.id)!;
    const points = s.won * getPointsForResult(sport, true, false) + s.drawn * getPointsForResult(sport, false, true);
    const group = t.groupId && groupById ? groupById.get(t.groupId) : null;
    return {
      teamId: t.id,
      teamName: t.name,
      teamLogoUrl: t.logoUrl ?? null,
      groupId: t.groupId ?? undefined,
      groupName: group?.name,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDiff: s.goalsFor - s.goalsAgainst,
      points,
    };
  });

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });

  return applyStandingsOrder(rows, standingsOrder);
}

export type StandingsByGroup = {
  groupId: string;
  groupName: string;
  standings: StandingRow[];
};

export function computeStandings(
  teams: TeamRow[],
  matches: MatchRow[],
  groups: GroupRow[],
  sport: string,
  standingsOrder?: string[] | null
): StandingRow[] {
  const hasGroups = groups.length > 0 && teams.some((t) => t.groupId);
  let rows: StandingRow[];

  if (hasGroups) {
    const groupIds = [...new Set(teams.map((t) => t.groupId).filter(Boolean))] as string[];
    rows = groupIds.flatMap((gid) => calculateStandings(teams, matches, groups, sport, gid));
  } else {
    rows = calculateStandings(teams, matches, groups, sport, null);
  }

  return applyStandingsOrder(rows, standingsOrder);
}

/** When tournament has groups, returns { general, byGroup }. Otherwise returns { general } only (byGroup empty). */
export function computeStandingsWithGeneral(
  teams: TeamRow[],
  matches: MatchRow[],
  groups: GroupRow[],
  sport: string,
  standingsOrder?: string[] | null
): { general: StandingRow[]; byGroup: StandingsByGroup[] } {
  const hasGroups = groups.length > 0 && teams.some((t) => t.groupId);
  const general = computeGeneralStandings(teams, matches, sport, standingsOrder, hasGroups ? groups : undefined);

  if (!hasGroups) {
    return { general, byGroup: [] };
  }

  const groupIds = [...new Set(teams.map((t) => t.groupId).filter(Boolean))] as string[];
  const byGroup: StandingsByGroup[] = groupIds.map((gid) => {
    const group = groups.find((g) => g.id === gid);
    const groupStandings = calculateStandings(teams, matches, groups, sport, gid);
    return {
      groupId: gid,
      groupName: group?.name ?? gid,
      standings: applyStandingsOrder(groupStandings, standingsOrder),
    };
  });

  return { general, byGroup };
}
