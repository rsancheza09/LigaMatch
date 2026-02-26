import { createBadRequest, createForbidden, createNotFound } from '../errors';
import type { Plugin, Request, ResponseToolkit } from '@hapi/hapi';
import Joi from 'joi';
import type { PartialModelObject } from 'objection';
import {
  Match,
  Notification,
  Player,
  PlayerTournamentCategory,
  Team,
  TeamMember,
  Tournament,
  TournamentAdmin,
  TournamentBroadcast,
  TournamentAgeCategory,
  TournamentGroup,
  TournamentTeam,
  User,
} from '../models';
import { sendBroadcastMessage } from '../services/emailService';
import { uploadTournamentImage } from '../services/uploadService';
import { computeStandingsWithGeneral } from '../services/standingsService';
import {
  slugOrIdParam,
  tournamentCreatePayload,
  tournamentUpdatePayload,
  uuidParam,
} from '../schemas';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_REGEX.test(s);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'tournament';
}

type TournamentPayload = {
  sport?: string;
  categoryType?: string;
  tournamentType?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  isSingleVenue?: boolean;
  venueName?: string | null;
  ageCategories?: Array<{ name: string; minBirthYear: number; maxBirthYear: number }>;
  standingsOrder?: string[] | null;
  logoUrl?: string | null;
  publicPageColors?: { primary?: string; secondary?: string } | null;
};

const list = async (request: Request) => {
  const credentials = request.auth?.credentials as { userId?: string } | undefined;
  const userId = credentials?.userId;
  const queryParams = request.query as { sport?: string; proOnly?: string; limit?: string };

  let query = Tournament.query()
    .select('id', 'slug', 'sport', 'categoryType', 'tournamentType', 'name', 'startDate', 'endDate', 'location', 'logoUrl', 'isPublic', 'publicPageColors', 'status', 'createdAt')
    .orderBy('createdAt', 'desc');

  if (userId) {
    const adminTournamentIds = (await TournamentAdmin.query().where({ userId }).select('tournamentId')).map((a) => a.tournamentId);
    const teamIds = (await TeamMember.query().where({ userId }).select('teamId')).map((m) => m.teamId);
    const teamTournamentIds = teamIds.length > 0
      ? (await TournamentTeam.query().whereIn('teamId', teamIds).select('tournamentId')).map((tt) => tt.tournamentId)
      : [];
    const accessibleIds = [...new Set([...adminTournamentIds, ...teamTournamentIds])];
    query = query.where((qb) => {
      qb.where((q) => {
        q.where('isPublic', true).andWhere('status', 'active');
      });
      if (accessibleIds.length > 0) {
        qb.orWhereIn('id', accessibleIds);
      }
    });
  } else {
    query = query.where('isPublic', true).where('status', 'active');
  }

  if (queryParams.sport) {
    query = query.where('sport', queryParams.sport);
  }
  if (queryParams.proOnly === 'true') {
    query = query.where((qb) => {
      qb.whereNotNull('logo_url').orWhereNotNull('public_page_colors');
    });
  }
  const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : undefined;
  if (limit && limit > 0) {
    query = query.limit(limit);
  }

  return query;
};

const listAdminTournaments = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const adminTournamentIds = (
    await TournamentAdmin.query().where({ userId }).select('tournamentId')
  ).map((a) => a.tournamentId);

  if (adminTournamentIds.length === 0) return [];

  const tournaments = await Tournament.query()
    .select('id', 'slug', 'sport', 'categoryType', 'tournamentType', 'name', 'startDate', 'endDate', 'location', 'logoUrl', 'isPublic', 'publicPageColors', 'status', 'createdAt')
    .whereIn('id', adminTournamentIds)
    .orderBy('createdAt', 'desc')
    .withGraphFetched('teams');

  const knex = Tournament.knex();
  const countRows = await knex('player_change_requests')
    .whereIn('tournament_id', adminTournamentIds)
    .where('status', 'pending')
    .groupBy('tournament_id')
    .select('tournament_id')
    .count('* as count');
  const countByTournament: Record<string, number> = {};
  for (const row of countRows) {
    countByTournament[row.tournament_id] = Number(row.count) || 0;
  }

  return tournaments.map((t) => ({
    ...t.toJSON(),
    pendingPlayerChangeRequestCount: countByTournament[t.id] ?? 0,
  }));
};

const create = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const payload = request.payload as TournamentPayload;

  if (!payload.name || !payload.sport) {
    throw createBadRequest(request, 'errors.nameAndSportRequired');
  }

  const baseSlug = slugify(payload.name);
  let slug = baseSlug;
  let suffix = 0;
  while (await Tournament.query().findOne({ slug })) {
    suffix++;
    slug = `${baseSlug}-${suffix}`;
  }

  const insertData: PartialModelObject<Tournament> = {
    createdBy: userId,
    sport: payload.sport,
    categoryType: payload.categoryType || 'none',
    tournamentType: payload.tournamentType ?? undefined,
    name: payload.name,
    slug,
    description: payload.description ?? undefined,
    startDate: payload.startDate ?? undefined,
    endDate: payload.endDate ?? undefined,
    location: payload.location ?? undefined,
    isSingleVenue: payload.isSingleVenue ?? false,
    venueName: payload.isSingleVenue && payload.venueName ? payload.venueName : null,
  };
  const tournament = await Tournament.query().insert(insertData);

  if (payload.ageCategories && payload.ageCategories.length > 0 && payload.categoryType === 'ages') {
    await TournamentAgeCategory.query().insert(
      payload.ageCategories.map((ac) => ({
        tournamentId: tournament.id,
        name: ac.name,
        minBirthYear: ac.minBirthYear,
        maxBirthYear: ac.maxBirthYear,
      }))
    );
  }

  await TournamentAdmin.query().insert({
    userId,
    tournamentId: tournament.id,
  });

  const created = await Tournament.query()
    .findById(tournament.id)
    .withGraphFetched('ageCategories');
  return h.response(created).code(201);
};

async function hasTournamentAccess(userId: string | undefined, tournamentId: string): Promise<boolean> {
  if (!userId) return false;
  const isAdmin = await TournamentAdmin.query().findOne({ userId, tournamentId });
  if (isAdmin) return true;
  const teamIds = (await TournamentTeam.query().where({ tournamentId }).select('teamId')).map((tt) => tt.teamId);
  if (teamIds.length === 0) return false;
  const member = await TeamMember.query()
    .whereIn('teamId', teamIds)
    .where({ userId })
    .first();
  return !!member;
}

const getBySlugOrId = async (request: Request) => {
  const { slugOrId } = request.params;
  const credentials = request.auth?.credentials as { userId?: string } | undefined;
  const userId = credentials?.userId;

  let tournament: Tournament | undefined;

  if (isUuid(slugOrId)) {
    tournament = await Tournament.query()
      .findById(slugOrId)
      .withGraphFetched('ageCategories');
  } else {
    tournament = await Tournament.query()
      .findOne({ slug: slugOrId })
      .withGraphFetched('ageCategories');
    if (tournament && !tournament.isPublic) {
      const hasAccess = await hasTournamentAccess(userId, tournament.id);
      if (!hasAccess) throw createNotFound(request, 'errors.tournamentNotFound');
    }
  }

  if (!tournament) {
    throw createNotFound(request, 'errors.tournamentNotFound');
  }

  if (!tournament.isPublic) {
    const hasAccess = await hasTournamentAccess(userId, tournament.id);
    if (!hasAccess) throw createNotFound(request, 'errors.tournamentNotFound');
  }

  let isTournamentAdmin = false;
  if (userId) {
    const admin = await TournamentAdmin.query().findOne({
      userId,
      tournamentId: tournament.id,
    });
    isTournamentAdmin = !!admin;
  }

  const tournamentTeams = await TournamentTeam.query()
    .where({ tournamentId: tournament.id })
    .withGraphFetched('team');
  const teams = tournamentTeams.map((tt) => ({
    id: tt.teamId,
    name: (tt.team as { name?: string })?.name ?? '',
    logoUrl: (tt.team as { logoUrl?: string | null })?.logoUrl ?? undefined,
    groupId: tt.groupId ?? undefined,
  }));

  return { ...tournament.toJSON(), teams, isTournamentAdmin };
};

async function ensureTournamentAdmin(userId: string, tournamentId: string): Promise<void> {
  const admin = await TournamentAdmin.query().findOne({ userId, tournamentId });
  if (!admin) {
    throw createForbidden(undefined, 'errors.mustBeTournamentAdmin');
  }
}

const getStandings = async (request: Request) => {
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

  const tournamentTeams = await TournamentTeam.query()
    .where({ tournamentId })
    .withGraphFetched('team')
    .select('teamId', 'groupId');
  const teams = tournamentTeams.map((tt) => ({
    id: tt.teamId,
    name: (tt.team as { name?: string })?.name ?? '',
    logoUrl: (tt.team as { logoUrl?: string | null })?.logoUrl ?? null,
    groupId: tt.groupId ?? null,
  }));
  const matches = await Match.query()
    .where({ tournamentId })
    .select('homeTeamId', 'awayTeamId', 'homeScore', 'awayScore', 'status', 'groupId');
  const groups = await TournamentGroup.query()
    .where({ tournamentId })
    .select('id', 'name');

  const sport = tournament.sport;
  const standingsOrder = (tournament as { standingsOrder?: string[] | null }).standingsOrder;

  const { general, byGroup } = computeStandingsWithGeneral(
    teams as Array<{ id: string; name: string; logoUrl?: string | null; groupId?: string | null }>,
    matches as Array<{ homeTeamId: string; awayTeamId: string; homeScore: number | null; awayScore: number | null; status: string; groupId?: string | null }>,
    groups as Array<{ id: string; name: string }>,
    sport,
    standingsOrder
  );

  const standings = byGroup.length > 0 ? byGroup.flatMap((g) => g.standings) : general;
  return { standings, standingsGeneral: general, standingsByGroup: byGroup };
};

const PLAYERS_PAGE_SIZE = 10;

const getTournamentPlayers = async (request: Request) => {
  const credentials = request.auth?.credentials as { userId?: string } | undefined;
  const userId = credentials?.userId;
  if (!userId) throw createForbidden(request, 'errors.authenticationRequired');
  const { id: tournamentId } = request.params as { id: string };
  const query = request.query as { teamId?: string; ageCategoryId?: string; page?: string; limit?: string };

  const tournament = await Tournament.query().findById(tournamentId);
  if (!tournament) throw createNotFound(request, 'errors.tournamentNotFound');

  const hasAccess = await hasTournamentAccess(userId, tournamentId);
  if (!hasAccess) throw createNotFound(request, 'errors.tournamentNotFound');

  const tournamentTeams = await TournamentTeam.query()
    .where({ tournamentId })
    .withGraphFetched('team')
    .select('teamId');
  let teamIds = tournamentTeams.map((tt) => tt.teamId);
  const teamIdToName: Record<string, string> = {};
  tournamentTeams.forEach((tt) => {
    teamIdToName[tt.teamId] = (tt.team as { name?: string })?.name ?? '';
  });

  if (query.teamId) {
    if (!teamIds.includes(query.teamId)) throw createBadRequest(request, 'errors.teamNotInTournament');
    teamIds = [query.teamId];
  }

  if (teamIds.length === 0) return { players: [], total: 0 };

  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? String(PLAYERS_PAGE_SIZE), 10) || PLAYERS_PAGE_SIZE));
  const offset = (page - 1) * limit;

  let baseQuery = Player.query().whereIn('teamId', teamIds);
  if (query.ageCategoryId) {
    baseQuery = baseQuery.where('tournamentAgeCategoryId', query.ageCategoryId);
  }
  const total = await baseQuery.clone().resultSize();
  const players = await baseQuery
    .withGraphFetched('tournamentAgeCategory')
    .select(
      'id',
      'teamId',
      'name',
      'firstName',
      'lastName',
      'birthDate',
      'birthYear',
      'tournamentAgeCategoryId',
      'idDocumentNumber',
      'photoUrl',
      'createdAt',
      'updatedAt'
    )
    .orderBy('sortOrder', 'asc')
    .orderBy('name', 'asc')
    .limit(limit)
    .offset(offset);

  const playerIds = players.map((p) => p.id);
  const ptcs = await PlayerTournamentCategory.query()
    .whereIn('playerId', playerIds)
    .where('tournamentId', tournamentId)
    .withGraphFetched('tournamentAgeCategory')
    .select('playerId', 'tournamentAgeCategoryId');
  const categoryNameByPlayerId: Record<string, string | null> = {};
  for (const ptc of ptcs as Array<PlayerTournamentCategory & { tournamentAgeCategory?: { name?: string } | null }>) {
    categoryNameByPlayerId[ptc.playerId] = ptc.tournamentAgeCategory?.name ?? null;
  }

  const fallbackCategoryName = (p: Player & { tournamentAgeCategory?: { name?: string; tournamentId?: string } | null }) => {
    const cat = p.tournamentAgeCategory;
    if (!cat?.name) return null;
    if (cat.tournamentId && cat.tournamentId !== tournamentId) return null;
    return cat.name;
  };

  return {
    players: players.map((p) => ({
      ...p.toJSON(),
      teamName: teamIdToName[p.teamId] ?? '',
      ageCategoryName: categoryNameByPlayerId[p.id] ?? fallbackCategoryName(p as Player & { tournamentAgeCategory?: { name?: string; tournamentId?: string } | null }),
    })),
    total,
  };
};

const update = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: tournamentId } = request.params as { id: string };
  const payload = request.payload as TournamentPayload;

  await ensureTournamentAdmin(userId, tournamentId);

  const tournament = await Tournament.query().findById(tournamentId);
  if (!tournament) throw createNotFound(request, 'errors.tournamentNotFound');

  const updateData: PartialModelObject<Tournament> = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.sport !== undefined) updateData.sport = payload.sport;
  if (payload.categoryType !== undefined) updateData.categoryType = payload.categoryType;
  if (payload.tournamentType !== undefined) updateData.tournamentType = payload.tournamentType;
  if (payload.description !== undefined) updateData.description = payload.description || undefined;
  if (payload.startDate !== undefined) updateData.startDate = payload.startDate || undefined;
  if (payload.endDate !== undefined) updateData.endDate = payload.endDate || undefined;
  if (payload.location !== undefined) updateData.location = payload.location || undefined;
  if (payload.isSingleVenue !== undefined) updateData.isSingleVenue = payload.isSingleVenue;
  if (payload.venueName !== undefined) updateData.venueName = payload.venueName || null;
  if (payload.standingsOrder !== undefined) {
    // Column is jsonb: PostgreSQL expects a JSON string; node-pg does not auto-serialize arrays for jsonb
    updateData.standingsOrder =
      payload.standingsOrder == null
        ? null
        : (JSON.stringify(Array.isArray(payload.standingsOrder) ? payload.standingsOrder : []) as unknown as string[]);
  }
  if (payload.logoUrl !== undefined) updateData.logoUrl = payload.logoUrl || null;
  if (payload.publicPageColors !== undefined) updateData.publicPageColors = payload.publicPageColors || null;

  if (payload.name && payload.name !== tournament.name) {
    const baseSlug = slugify(payload.name);
    let slug = baseSlug;
    let suffix = 0;
    let existing = await Tournament.query()
      .where({ slug })
      .whereNot('id', tournamentId)
      .first();
    while (existing) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
      existing = await Tournament.query()
        .where({ slug })
        .whereNot('id', tournamentId)
        .first();
    }
    updateData.slug = slug;
  }

  await Tournament.query().findById(tournamentId).patch(updateData);

  if (payload.ageCategories && payload.categoryType === 'ages') {
    await TournamentAgeCategory.query().where({ tournamentId }).delete();
    if (payload.ageCategories.length > 0) {
      await TournamentAgeCategory.query().insert(
        payload.ageCategories.map((ac) => ({
          tournamentId,
          name: ac.name,
          minBirthYear: ac.minBirthYear,
          maxBirthYear: ac.maxBirthYear,
        }))
      );
    }
  }

  return Tournament.query()
    .findById(tournamentId)
    .withGraphFetched('[ageCategories, teams]');
};

const suspend = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: tournamentId } = request.params as { id: string };

  await ensureTournamentAdmin(userId, tournamentId);

  const tournament = await Tournament.query().findById(tournamentId);
  if (!tournament) throw createNotFound(request, 'errors.tournamentNotFound');

  await Tournament.query().findById(tournamentId).patch({ status: 'suspended' });

  return Tournament.query()
    .findById(tournamentId)
    .withGraphFetched('[ageCategories, teams]');
};

const renew = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: tournamentId } = request.params as { id: string };

  await ensureTournamentAdmin(userId, tournamentId);

  const tournament = await Tournament.query().findById(tournamentId);
  if (!tournament) throw createNotFound(request, 'errors.tournamentNotFound');

  await Tournament.query().findById(tournamentId).patch({ status: 'active' });

  return Tournament.query()
    .findById(tournamentId)
    .withGraphFetched('[ageCategories, teams]');
};

const remove = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: tournamentId } = request.params as { id: string };

  await ensureTournamentAdmin(userId, tournamentId);

  const tournament = await Tournament.query().findById(tournamentId);
  if (!tournament) throw createNotFound(request, 'errors.tournamentNotFound');

  await Tournament.query().findById(tournamentId).delete();

  return h.response({ success: true, message: 'Tournament deleted' }).code(200);
};

const broadcastMessagePayload = {
  teamIds: Joi.array().items(Joi.string().uuid()).optional().description('If provided, only these teams receive the message; otherwise all teams in the tournament'),
  body: Joi.string().min(1).max(10000).required().trim().description('Message body'),
};

const broadcastMessage = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth!.credentials as { userId: string };
  const tournamentId = request.params.id as string;
  const { teamIds: teamIdsPayload, body } = request.payload as { teamIds?: string[]; body: string };

  const admin = await TournamentAdmin.query().findOne({ tournamentId, userId });
  if (!admin) throw createForbidden(request, 'errors.onlyTournamentAdminsSendBroadcast');

  const tournament = await Tournament.query().findById(tournamentId).select('id', 'name');
  if (!tournament) throw createNotFound(request, 'errors.tournamentNotFound');

  const ttRows = await TournamentTeam.query().where({ tournamentId }).select('teamId');
  let teamIds = ttRows.map((r) => (r as { teamId: string }).teamId);
  if (teamIdsPayload && teamIdsPayload.length > 0) {
    teamIds = teamIds.filter((id) => teamIdsPayload!.includes(id));
  }
  if (teamIds.length === 0) {
    return h.response({ sent: 0, message: 'No teams to send to' }).code(200);
  }

  const recipientUserIds = new Set<string>();
  const teams = await Team.query().whereIn('id', teamIds).select('id', 'ownerEmail');
  for (const team of teams) {
    const members = await TeamMember.query().where({ teamId: team.id }).select('userId');
    for (const m of members) recipientUserIds.add((m as { userId: string }).userId);
    if (team.ownerEmail) {
      const owner = await User.query().findOne({ email: team.ownerEmail }).select('id');
      if (owner) recipientUserIds.add(owner.id);
    }
  }
  recipientUserIds.delete(userId);
  const sentCount = recipientUserIds.size;

  const sender = await User.query().findById(userId).select('name', 'email');
  const fromName = sender?.name || sender?.email || 'Organizador';
  const appUrl = process.env.APP_URL || 'http://localhost:4000';
  const dashboardLink = `${appUrl}/dashboard?section=notifications`;
  const messagesLink = `${appUrl}/dashboard?section=messages`;
  const now = new Date().toISOString();
  const title = `Mensaje del organizador: ${(tournament as { name: string }).name}`;

  await TournamentBroadcast.query().insert({
    tournamentId,
    senderId: userId,
    body,
    sentCount,
  });

  for (const uid of recipientUserIds) {
    try {
      await Notification.query().insert({
        userId: uid,
        type: 'broadcast',
        title,
        body,
        link: messagesLink,
        metadata: { tournamentId, fromUserId: userId },
        createdAt: now,
        updatedAt: now,
      });
      const recipient = await User.query().findById(uid).select('email');
      if (recipient?.email) {
        await sendBroadcastMessage({
          to: recipient.email,
          fromName,
          subject: title,
          body,
          dashboardLink,
        });
      }
    } catch (err) {
      console.error('[broadcast] Failed to notify user', uid, err);
    }
  }

  return h.response({ sent: sentCount }).code(200);
};

const listBroadcasts = async (request: Request) => {
  const { userId } = request.auth!.credentials as { userId: string };
  const tournamentId = request.params.id as string;

  const admin = await TournamentAdmin.query().findOne({ tournamentId, userId });
  if (!admin) throw createForbidden(request, 'errors.onlyTournamentAdminsListBroadcast');

  const broadcasts = await TournamentBroadcast.query()
    .where({ tournamentId })
    .orderBy('createdAt', 'desc')
    .limit(100)
    .select('id', 'body', 'sentCount', 'createdAt', 'senderId');

  const senderIds = [...new Set(broadcasts.map((b) => b.senderId))];
  const users = senderIds.length
    ? await User.query().whereIn('id', senderIds).select('id', 'name', 'email')
    : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return {
    broadcasts: broadcasts.map((b) => ({
      id: b.id,
      body: b.body,
      sentCount: b.sentCount,
      createdAt: b.createdAt,
      senderId: b.senderId,
      sender: userMap[b.senderId]
        ? { id: (userMap[b.senderId] as { id: string }).id, name: (userMap[b.senderId] as { name?: string }).name, email: (userMap[b.senderId] as { email: string }).email }
        : undefined,
    })),
  };
};

const deleteBroadcast = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth!.credentials as { userId: string };
  const { id: tournamentId, broadcastId } = request.params as { id: string; broadcastId: string };

  const admin = await TournamentAdmin.query().findOne({ tournamentId, userId });
  if (!admin) throw createForbidden(request, 'errors.onlyTournamentAdminsDeleteBroadcast');

  const broadcast = await TournamentBroadcast.query().findOne({ id: broadcastId, tournamentId });
  if (!broadcast) throw createNotFound(request, 'errors.broadcastNotFound');

  if (broadcast.senderId !== userId) {
    throw createForbidden(request, 'errors.onlySenderCanDeleteBroadcast');
  }

  await TournamentBroadcast.query().deleteById(broadcastId);

  return h.response().code(204);
};

const uploadTournamentLogo = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: tournamentId } = request.params as { id: string };
  await ensureTournamentAdmin(userId, tournamentId);

  const payload = request.payload as { fileBase64: string; fileName?: string; mimeType?: string };
  if (!payload?.fileBase64) throw createBadRequest(request, 'errors.fileBase64Required');
  const url = await uploadTournamentImage(payload.fileBase64, 'logo', tournamentId);
  return h.response({ url }).code(201);
};

const uploadTournamentBackground = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: tournamentId } = request.params as { id: string };
  await ensureTournamentAdmin(userId, tournamentId);

  const payload = request.payload as { fileBase64: string; fileName?: string; mimeType?: string };
  if (!payload?.fileBase64) throw createBadRequest(request, 'errors.fileBase64Required');
  const url = await uploadTournamentImage(payload.fileBase64, 'background', tournamentId);
  return h.response({ url }).code(201);
};

export const tournamentRoutes: Plugin<void> = {
  name: 'tournamentRoutes',
  register: (server) => {
    server.route([
      {
        method: 'GET',
        path: '/tournaments',
        options: {
          auth: { mode: 'optional' },
          tags: ['api', 'tournaments'],
          description: 'List all tournaments',
          notes: 'Returns list of tournaments',
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'List of tournaments' },
              },
            },
          },
        },
        handler: list,
      },
      {
        method: 'GET',
        path: '/tournaments/admin/mine',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'tournaments'],
          description: 'List tournaments the current user administers',
          notes: 'Returns tournaments where the user is tournament admin. Requires Bearer token.',
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'List of administered tournaments' },
                401: { description: 'Unauthorized' },
              },
            },
          },
        },
        handler: listAdminTournaments,
      },
      {
        method: 'POST',
        path: '/tournaments',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'tournaments'],
          description: 'Create a tournament',
          notes: 'Creates a new tournament. Requires Bearer token.',
          validate: {
            payload: tournamentCreatePayload,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                201: { description: 'Tournament created' },
                400: { description: 'Validation error' },
                401: { description: 'Unauthorized' },
              },
            },
          },
        },
        handler: create,
      },
      {
        method: 'GET',
        path: '/tournaments/{id}/standings',
        options: {
          auth: { mode: 'optional' },
          tags: ['api', 'tournaments'],
          description: 'Get standings table for a tournament',
          validate: {
            params: uuidParam,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'Standings calculated from matches' },
                404: { description: 'Tournament not found' },
              },
            },
          },
        },
        handler: getStandings,
      },
      {
        method: 'GET',
        path: '/tournaments/{id}/players',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'tournaments'],
          description: 'List players of a tournament, optionally filtered by team',
          validate: {
            params: uuidParam,
            query: Joi.object({
              teamId: Joi.string().uuid().optional(),
              ageCategoryId: Joi.string().uuid().optional(),
              page: Joi.string().optional(),
              limit: Joi.string().optional(),
            }),
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'Paginated list of players with teamName and ageCategoryName. Response: { players, total }' },
                404: { description: 'Tournament not found' },
              },
            },
          },
        },
        handler: getTournamentPlayers,
      },
      {
        method: 'GET',
        path: '/tournaments/{slugOrId}',
        options: {
          auth: { mode: 'optional' },
          tags: ['api', 'tournaments'],
          description: 'Get tournament by ID or slug',
          notes: 'Use UUID for any tournament; use slug for public links (only works when tournament is public)',
          validate: {
            params: slugOrIdParam,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'Tournament with age categories' },
                404: { description: 'Tournament not found' },
              },
            },
          },
        },
        handler: getBySlugOrId,
      },
      {
        method: 'PATCH',
        path: '/tournaments/{id}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'tournaments'],
          description: 'Update tournament. Requires tournament admin.',
          validate: {
            params: uuidParam,
            payload: tournamentUpdatePayload,
          },
        },
        handler: update,
      },
      {
        method: 'POST',
        path: '/tournaments/{id}/upload-logo',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'tournaments'],
          description: 'Upload tournament logo image (Cloudinary). Returns { url }. Requires tournament admin.',
          validate: {
            params: uuidParam,
            payload: Joi.object({
              fileBase64: Joi.string().required().description('Base64 or data URL of the image'),
              fileName: Joi.string().max(255).optional(),
              mimeType: Joi.string().max(128).optional(),
            }),
          },
          payload: { maxBytes: 2 * 1024 * 1024 },
        },
        handler: uploadTournamentLogo,
      },
      {
        method: 'POST',
        path: '/tournaments/{id}/upload-background',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'tournaments'],
          description: 'Upload tournament public page background image (Cloudinary). Returns { url }. Requires tournament admin.',
          validate: {
            params: uuidParam,
            payload: Joi.object({
              fileBase64: Joi.string().required().description('Base64 or data URL of the image'),
              fileName: Joi.string().max(255).optional(),
              mimeType: Joi.string().max(128).optional(),
            }),
          },
          payload: { maxBytes: 2 * 1024 * 1024 },
        },
        handler: uploadTournamentBackground,
      },
      {
        method: 'PATCH',
        path: '/tournaments/{id}/suspend',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'tournaments'],
          description: 'Suspend tournament. Requires tournament admin.',
          validate: { params: uuidParam },
        },
        handler: suspend,
      },
      {
        method: 'PATCH',
        path: '/tournaments/{id}/renew',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'tournaments'],
          description: 'Renew (reactivate) suspended tournament. Requires tournament admin.',
          validate: { params: uuidParam },
        },
        handler: renew,
      },
      {
        method: 'DELETE',
        path: '/tournaments/{id}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'tournaments'],
          description: 'Delete tournament. Requires tournament admin. Cascades to teams, matches, etc.',
          validate: { params: uuidParam },
        },
        handler: remove,
      },
      {
        method: 'GET',
        path: '/tournaments/{id}/broadcasts',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'tournaments', 'messages'],
          description: 'List broadcast messages sent to teams in this tournament. Only tournament admins.',
          validate: { params: uuidParam },
        },
        handler: listBroadcasts,
      },
      {
        method: 'DELETE',
        path: '/tournaments/{id}/broadcasts/{broadcastId}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'tournaments', 'messages'],
          description: 'Delete a broadcast message. Only the user who sent it can delete it. Requires tournament admin.',
          validate: {
            params: Joi.object({
              id: Joi.string().uuid().required(),
              broadcastId: Joi.string().uuid().required(),
            }),
          },
        },
        handler: deleteBroadcast,
      },
      {
        method: 'POST',
        path: '/tournaments/{id}/messages/broadcast',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'tournaments', 'messages'],
          description: 'Send a message to all (or selected) teams in the tournament. Only tournament admins. Recipients get a notification and email.',
          validate: {
            params: uuidParam,
            payload: Joi.object(broadcastMessagePayload),
          },
        },
        handler: broadcastMessage,
      },
    ]);
  },
};
