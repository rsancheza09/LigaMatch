import { createBadRequest, createForbidden, createNotFound } from '../errors';
import type { Plugin, Request, ResponseToolkit } from '@hapi/hapi';
import Joi from 'joi';
import { Match, TeamMember, TeamVenue, Tournament, TournamentAdmin, TournamentGroup, TournamentTeam } from '../models';
import {
  matchCreatePayload,
  matchGeneratePayload,
  matchUpdatePayload,
  uuidParam,
} from '../schemas';

async function hasTournamentAccess(userId: string | undefined, tournamentId: string): Promise<boolean> {
  if (!userId) return false;
  const isAdmin = await TournamentAdmin.query().findOne({ userId, tournamentId });
  if (isAdmin) return true;
  const teamIds = (await TournamentTeam.query().where({ tournamentId }).select('teamId')).map((tt) => tt.teamId);
  if (teamIds.length === 0) return false;
  const member = await TeamMember.query().whereIn('teamId', teamIds).where({ userId }).first();
  return !!member;
}

async function ensureTournamentAdmin(userId: string, tournamentId: string): Promise<void> {
  const admin = await TournamentAdmin.query().findOne({ userId, tournamentId });
  if (!admin) {
    throw createForbidden(undefined, 'errors.mustBeTournamentAdmin');
  }
}

/**
 * Round-robin schedule using the circle method with balanced home/away.
 * - Each team plays the same number of home and away matches (or ±1 if odd).
 * - Home and away alternate as much as possible for each team.
 *
 * 1 round: single round-robin, balanced H/A per team.
 * 2 rounds: ida y vuelta, each team has N-1 home and N-1 away, alternated.
 */
function generateRoundRobinPairs(teamIds: string[], rounds: 1 | 2): Array<{ homeTeamId: string; awayTeamId: string; round: number }> {
  const result: Array<{ homeTeamId: string; awayTeamId: string; round: number }> = [];
  const n = teamIds.length;
  if (n < 2) return result;

  // Circle method: fix first team, rotate the rest. Add bye if odd.
  const teams = [...teamIds];
  const hasBye = n % 2 === 1;
  if (hasBye) teams.push('__BYE__' as string);

  const numTeams = teams.length;
  const numRounds = numTeams - 1;

  const getPairings = (order: string[]): Array<[string, string]> => {
    const pairings: Array<[string, string]> = [];
    for (let i = 0; i < numTeams / 2; i++) {
      const a = order[i];
      const b = order[numTeams - 1 - i];
      if (a !== '__BYE__' && b !== '__BYE__') pairings.push([a, b]);
    }
    return pairings;
  };

  const totalRounds = rounds === 2 ? 2 * numRounds : numRounds;

  const rotate = (order: string[]): string[] => {
    const [first, ...rest] = order;
    const last = rest.pop();
    return last !== undefined ? [first, last, ...rest] : order;
  };

  for (let r = 0; r < totalRounds; r++) {
    const turn = r % numRounds;
    let order = [...teams];
    for (let i = 0; i < turn; i++) order = rotate(order);

    const pairings = getPairings(order);
    const roundNum = r + 1;

    for (const [a, b] of pairings) {
      // Alternate home/away by round. For 2 rounds (vuelta), flip so return leg reverses H/A.
      const flip = rounds === 2 && r >= numRounds;
      const homeFirst = (turn % 2 === 0) !== flip;
      const homeTeamId = homeFirst ? a : b;
      const awayTeamId = homeFirst ? b : a;
      result.push({ homeTeamId, awayTeamId, round: roundNum });
    }
  }

  return result;
}

const listMatches = async (request: Request) => {
  const credentials = request.auth?.credentials as { userId?: string } | undefined;
  const userId = credentials?.userId;
  const { id: tournamentId } = request.params as { id: string };

  const tournament = await Tournament.query().findById(tournamentId);
  if (!tournament) throw createNotFound(request, 'errors.tournamentNotFound');

  const isPublic = (tournament as { isPublic?: boolean }).isPublic;
  if (!isPublic) {
    const hasAccess = await hasTournamentAccess(userId, tournamentId);
    if (!hasAccess) throw createNotFound(request, 'errors.tournamentNotFound');
  }

  const matches = await Match.query()
    .where({ tournamentId })
    .withGraphFetched('[homeTeam, awayTeam, group, venue]')
    .orderBy(['round', 'createdAt']);

  return matches;
};

const createMatch = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: tournamentId } = request.params as { id: string };
  const payload = request.payload as {
    homeTeamId: string;
    awayTeamId: string;
    round?: number;
    suspendedMatchId?: string | null;
    venueId?: string | null;
    scheduledAt?: string | null;
  };

  await ensureTournamentAdmin(userId, tournamentId);

  const tournament = await Tournament.query().findById(tournamentId);
  if (!tournament) throw createNotFound(request, 'errors.tournamentNotFound');

  if (payload.homeTeamId === payload.awayTeamId) {
    throw createBadRequest(request, 'errors.homeAndAwayMustDiffer');
  }

  const regs = await TournamentTeam.query()
    .where({ tournamentId })
    .whereIn('teamId', [payload.homeTeamId, payload.awayTeamId])
    .select('teamId');
  if (regs.length !== 2) {
    throw createBadRequest(request, 'errors.bothTeamsMustBelong');
  }

  let round = payload.round;
  if (round == null) {
    const maxRound = await Match.query()
      .where({ tournamentId })
      .max('round as max')
      .first();
    round = ((maxRound?.max as number) ?? 0) + 1;
  }

  if (payload.suspendedMatchId) {
    const suspended = await Match.query().findById(payload.suspendedMatchId);
    if (!suspended || suspended.tournamentId !== tournamentId) {
      throw createBadRequest(request, 'errors.suspendedMatchNotFound');
    }
  }

  let venueId: string | null = payload.venueId ?? null;
  const isSingleVenue = (tournament as { isSingleVenue?: boolean }).isSingleVenue;
  if (!isSingleVenue) {
    if (!venueId) {
      const officialVenue = await TeamVenue.query()
        .where({ teamId: payload.homeTeamId })
        .where({ isOfficial: true })
        .orderBy('sortOrder')
        .first();
      venueId = officialVenue?.id ?? null;
    } else {
      const venue = await TeamVenue.query().findById(venueId);
      if (!venue || venue.teamId !== payload.homeTeamId) {
        throw createBadRequest(request, 'errors.venueMustBelongToHomeTeam');
      }
    }
  } else {
    venueId = null;
  }

  const match = await Match.query().insert({
    tournamentId,
    homeTeamId: payload.homeTeamId,
    awayTeamId: payload.awayTeamId,
    round,
    suspendedMatchId: payload.suspendedMatchId ?? null,
    venueId,
    scheduledAt: payload.scheduledAt ?? null,
    status: 'scheduled',
    isManual: true,
  });

  const created = await Match.query()
    .findById(match.id)
    .withGraphFetched('[homeTeam, awayTeam, group, venue]');
  return h.response(created).code(201);
};

/**
 * Distribute team IDs into groups using snake draft for fairness.
 * E.g. 4 teams, 2 groups: [[1,4], [2,3]]. 6 teams, 3 groups: [[1,6], [2,5], [3,4]].
 */
function distributeTeamsIntoGroups(teamIds: string[], numGroups: number): string[][] {
  const groups: string[][] = Array.from({ length: numGroups }, () => []);
  let groupIdx = 0;
  let direction = 1;
  for (let i = 0; i < teamIds.length; i++) {
    groups[groupIdx].push(teamIds[i]);
    groupIdx += direction;
    if (groupIdx >= numGroups) {
      groupIdx = numGroups - 1;
      direction = -1;
    } else if (groupIdx < 0) {
      groupIdx = 0;
      direction = 1;
    }
  }
  return groups;
}

const generateSchedule = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: tournamentId } = request.params as { id: string };
  const payload = request.payload as { rounds: 1 | 2; mode?: 'all' | 'groups'; numGroups?: number };
  const { rounds, mode = 'all', numGroups } = payload;

  await ensureTournamentAdmin(userId, tournamentId);

  const tournament = await Tournament.query().findById(tournamentId);
  if (!tournament) throw createNotFound(request, 'errors.tournamentNotFound');

  const teamIds = (await TournamentTeam.query().where({ tournamentId }).select('teamId')).map((tt) => tt.teamId);

  if (teamIds.length < 2) {
    throw createBadRequest(request, 'errors.tournamentNeedsTwoTeams');
  }

  const existing = await Match.query().where({ tournamentId }).first();
  if (existing) {
    throw createBadRequest(request, 'errors.scheduleAlreadyExists');
  }

  const isSingleVenue = (tournament as { isSingleVenue?: boolean }).isSingleVenue;
  const venueByHomeTeam = new Map<string, string>();
  if (!isSingleVenue) {
    const homeTeamVenues = await TeamVenue.query()
      .whereIn('teamId', teamIds)
      .where({ isOfficial: true })
      .orderBy(['teamId', 'sortOrder']);
    for (const v of homeTeamVenues) {
      if (!venueByHomeTeam.has(v.teamId)) {
        venueByHomeTeam.set(v.teamId, v.id);
      }
    }
  }

  const inserts: Array<{ tournamentId: string; groupId?: string; homeTeamId: string; awayTeamId: string; round: number; status: string; isManual: boolean; venueId?: string | null }> = [];

  if (mode === 'groups' && numGroups && numGroups >= 2) {
    if (teamIds.length < numGroups) {
      throw createBadRequest(request, 'errors.needTeamsForGroups', { numGroups });
    }
    const groupTeamIds = distributeTeamsIntoGroups(teamIds, numGroups);
    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, numGroups);

    for (let g = 0; g < numGroups; g++) {
      const ids = groupTeamIds[g];
      if (ids.length < 2) {
        throw createBadRequest(request, 'errors.groupNeedsTwoTeams', { group: groupNames[g], count: ids.length });
      }
      const group = await TournamentGroup.query().insertAndFetch({
        tournamentId,
        name: `Grupo ${groupNames[g]}`,
        sortOrder: g,
      });
      await TournamentTeam.query().where({ tournamentId }).whereIn('teamId', ids).patch({ groupId: group.id });
      const pairs = generateRoundRobinPairs(ids, rounds);
      for (const p of pairs) {
        inserts.push({
          tournamentId,
          groupId: group.id,
          homeTeamId: p.homeTeamId,
          awayTeamId: p.awayTeamId,
          round: p.round,
          status: 'scheduled',
          isManual: false,
          venueId: isSingleVenue ? null : (venueByHomeTeam.get(p.homeTeamId) ?? null),
        });
      }
    }
  } else {
    const pairs = generateRoundRobinPairs(teamIds, rounds);
    for (const p of pairs) {
      inserts.push({
        tournamentId,
        homeTeamId: p.homeTeamId,
        awayTeamId: p.awayTeamId,
        round: p.round,
        status: 'scheduled',
        isManual: false,
        venueId: isSingleVenue ? null : (venueByHomeTeam.get(p.homeTeamId) ?? null),
      });
    }
  }

  await Match.query().insert(inserts);

  const matches = await Match.query()
    .where({ tournamentId })
    .withGraphFetched('[homeTeam, awayTeam, group, venue]')
    .orderBy(['round', 'createdAt']);

  return h.response(matches).code(201);
};

const deleteMatches = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: tournamentId } = request.params as { id: string };

  await ensureTournamentAdmin(userId, tournamentId);

  const tournament = await Tournament.query().findById(tournamentId);
  if (!tournament) throw createNotFound(request, 'errors.tournamentNotFound');

  await Match.query().where({ tournamentId }).delete();
  await TournamentTeam.query().where({ tournamentId }).patch({ groupId: null });
  await TournamentGroup.query().where({ tournamentId }).delete();

  return h.response({ success: true, message: 'Matches deleted' }).code(200);
};

const deleteMatch = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { tournamentId, matchId } = request.params as { tournamentId: string; matchId: string };

  await ensureTournamentAdmin(userId, tournamentId);

  const match = await Match.query()
    .findById(matchId)
    .where({ tournamentId });
  if (!match) throw createNotFound(request, 'errors.matchNotFound');

  if (!match.isManual) {
    throw createBadRequest(request, 'errors.onlyManualMatchesDeletable');
  }

  await Match.query().findById(matchId).delete();
  return h.response({ success: true }).code(200);
};

const updateMatch = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { tournamentId, matchId } = request.params as { tournamentId: string; matchId: string };
  const payload = request.payload as {
    scheduledAt?: string | null;
    homeScore?: number | null;
    awayScore?: number | null;
    statistics?: Record<string, number> | null;
    matchEvents?: Array<{ type: string; teamSide: string; playerId?: string; playerName?: string; minute?: number }> | null;
    matchExtraPoints?: { home?: number; away?: number } | null;
    matchPenalties?: Array<{ type: string; targetId?: string; targetName?: string; description?: string; amount?: number; currency?: string }> | null;
  };

  const match = await Match.query()
    .findById(matchId)
    .where({ tournamentId })
    .withGraphFetched('tournament');
  if (!match) throw createNotFound(request, 'errors.matchNotFound');

  await ensureTournamentAdmin(userId, tournamentId);

  const payloadTyped = payload as {
    scheduledAt?: string | null;
    homeScore?: number | null;
    awayScore?: number | null;
    status?: string;
    venueId?: string | null;
    statistics?: Record<string, number> | null;
    matchEvents?: unknown[] | null;
    matchExtraPoints?: { home?: number; away?: number } | null;
    matchPenalties?: unknown[] | null;
  };
  const updateData: Record<string, unknown> = {};
  if (payloadTyped.scheduledAt !== undefined) {
    updateData.scheduledAt = payloadTyped.scheduledAt || null;
  }
  if (payloadTyped.homeScore !== undefined) {
    updateData.homeScore = payloadTyped.homeScore;
  }
  if (payloadTyped.awayScore !== undefined) {
    updateData.awayScore = payloadTyped.awayScore;
  }
  const tournament = match.tournament as { isSingleVenue?: boolean } | undefined;
  if (payloadTyped.venueId !== undefined && !tournament?.isSingleVenue) {
    if (payloadTyped.venueId) {
      const venue = await TeamVenue.query().findById(payloadTyped.venueId);
      if (!venue || venue.teamId !== match.homeTeamId) {
        throw createBadRequest(request, 'errors.venueMustBelongToHomeTeam');
      }
    }
    updateData.venueId = payloadTyped.venueId || null;
  }
  const knex = Match.knex();
  const toJsonb = <T>(val: T): string | null =>
    val == null ? null : JSON.stringify(JSON.parse(JSON.stringify(val)));
  if (payloadTyped.statistics !== undefined) {
    const v = payloadTyped.statistics == null ? null : toJsonb(payloadTyped.statistics);
    updateData.statistics = v === null ? null : knex.raw('?::jsonb', [v]);
  }
  if (payloadTyped.matchEvents !== undefined) {
    const v = payloadTyped.matchEvents == null ? null : toJsonb(payloadTyped.matchEvents);
    updateData.matchEvents = v === null ? null : knex.raw('?::jsonb', [v]);
  }
  if (payloadTyped.matchExtraPoints !== undefined) {
    const v = payloadTyped.matchExtraPoints == null ? null : toJsonb(payloadTyped.matchExtraPoints);
    updateData.matchExtraPoints = v === null ? null : knex.raw('?::jsonb', [v]);
  }
  if (payloadTyped.matchPenalties !== undefined) {
    const v = payloadTyped.matchPenalties == null ? null : toJsonb(payloadTyped.matchPenalties);
    updateData.matchPenalties = v === null ? null : knex.raw('?::jsonb', [v]);
  }
  if (payloadTyped.status !== undefined) {
    if (payloadTyped.status === 'suspended' && match.homeScore != null && match.awayScore != null) {
      throw createBadRequest(request, 'errors.cannotSuspendWithResult');
    }
    updateData.status = payloadTyped.status;
  } else if (payloadTyped.homeScore !== undefined && payloadTyped.awayScore !== undefined) {
    const hasResult =
      payloadTyped.homeScore != null || payloadTyped.awayScore != null;
    updateData.status = hasResult ? 'played' : 'scheduled';
  }

  if (Object.keys(updateData).length === 0) {
    return Match.query()
      .findById(matchId)
      .withGraphFetched('[homeTeam, awayTeam, group, venue]');
  }

  await Match.query().findById(matchId).patch(updateData);

  return Match.query()
    .findById(matchId)
    .withGraphFetched('[homeTeam, awayTeam, group, venue]');
};

export const matchRoutes: Plugin<void> = {
  name: 'matchRoutes',
  register: (server) => {
    server.route([
      {
        method: 'GET',
        path: '/tournaments/{id}/matches',
        options: {
          auth: { mode: 'optional' },
          tags: ['api', 'matches'],
          description: 'List matches for a tournament',
          validate: {
            params: uuidParam,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'List of matches' },
                404: { description: 'Tournament not found' },
              },
            },
          },
        },
        handler: listMatches,
      },
      {
        method: 'POST',
        path: '/tournaments/{id}/matches',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'matches'],
          description: 'Create a single match. Requires tournament admin.',
          validate: {
            params: uuidParam,
            payload: matchCreatePayload,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                201: { description: 'Match created' },
                400: { description: 'Validation error' },
                401: { description: 'Unauthorized' },
                403: { description: 'Forbidden' },
                404: { description: 'Tournament not found' },
              },
            },
          },
        },
        handler: createMatch,
      },
      {
        method: 'POST',
        path: '/tournaments/{id}/matches/generate',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'matches'],
          description: 'Generate round-robin schedule (1 or 2 rounds). Requires tournament admin.',
          validate: {
            params: uuidParam,
            payload: matchGeneratePayload,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                201: { description: 'Schedule generated' },
                400: { description: 'Validation error or schedule already exists' },
                401: { description: 'Unauthorized' },
                403: { description: 'Forbidden' },
                404: { description: 'Tournament not found' },
              },
            },
          },
        },
        handler: generateSchedule,
      },
      {
        method: 'DELETE',
        path: '/tournaments/{id}/matches',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'matches'],
          description: 'Delete all matches (to regenerate schedule). Requires tournament admin.',
          validate: {
            params: uuidParam,
          },
        },
        handler: deleteMatches,
      },
      {
        method: 'DELETE',
        path: '/tournaments/{tournamentId}/matches/{matchId}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'matches'],
          description: 'Delete a manually added match. Only matches added after generating the base schedule can be deleted.',
          validate: {
            params: Joi.object({
              tournamentId: Joi.string().uuid().required(),
              matchId: Joi.string().uuid().required(),
            }),
          },
        },
        handler: deleteMatch,
      },
      {
        method: 'PATCH',
        path: '/tournaments/{tournamentId}/matches/{matchId}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'matches'],
          description: 'Update match (e.g. scheduled date). Requires tournament admin.',
          validate: {
            params: Joi.object({
              tournamentId: Joi.string().uuid().required(),
              matchId: Joi.string().uuid().required(),
            }),
            payload: matchUpdatePayload,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'Match updated' },
                401: { description: 'Unauthorized' },
                403: { description: 'Forbidden' },
                404: { description: 'Match or tournament not found' },
              },
            },
          },
        },
        handler: updateMatch,
      },
    ]);
  },
};
