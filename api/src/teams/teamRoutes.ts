import { createBadRequest, createForbidden, createNotFound } from '../errors';
import type { Plugin, Request, ResponseToolkit } from '@hapi/hapi';
import fs from 'node:fs';
import crypto from 'node:crypto';
import type { PartialModelObject } from 'objection';
import {
  Notification,
  Player,
  PlayerChangeRequest,
  PlayerDocument,
  PlayerTournamentCategory,
  Role,
  Team,
  TeamInvitation,
  TeamMember,
  TournamentTeam,
  TeamVenue,
  TeamTechnicalStaff,
  TeamUniform,
  Tournament,
  TournamentAdmin,
  TournamentAgeCategory,
  User,
  UserRole,
} from '../models';
import type { PlayerChangeRequestPayload } from '../models/PlayerChangeRequest';
import Joi from 'joi';
import {
  inviteTokenParam,
  playerCreatePayload,
  playerUpdatePayload,
  playerSetCategoryPayload,
  playerReorderPayload,
  playerUploadPayload,
  teamAddExistingPayload,
  teamCreatePayload,
  teamInvitePayload,
  teamVenueCreatePayload,
  teamVenueUpdatePayload,
  teamTechnicalStaffCreatePayload,
  teamTechnicalStaffUpdatePayload,
  teamUniformCreatePayload,
  teamUniformUpdatePayload,
  uuidParam,
} from '../schemas';
import { sendTeamInvitation } from '../services/emailService';
import { saveUploadedFileFromBase64, resolveFilePath } from '../services/uploadService';

async function ensureTournamentAdmin(userId: string, tournamentId: string): Promise<void> {
  const admin = await TournamentAdmin.query().findOne({ userId, tournamentId });
  if (!admin) {
    throw createForbidden(undefined, 'errors.mustBeTournamentAdmin');
  }
}

async function ensureTeamAccess(userId: string, teamId: string, requireAdmin = false): Promise<Team> {
  const team = await Team.query().findById(teamId);
  if (!team) throw createNotFound(undefined, 'errors.teamNotFound');

  const member = await TeamMember.query().findOne({ teamId, userId });
  const teamTournamentIds = (await TournamentTeam.query().where({ teamId }).select('tournamentId')).map((tt) => tt.tournamentId);
  const tournamentAdmin = teamTournamentIds.length > 0
    ? await TournamentAdmin.query().findOne({ userId }).whereIn('tournamentId', teamTournamentIds)
    : null;

  if (requireAdmin && !member?.isAdmin && !tournamentAdmin) {
    throw createForbidden(undefined, 'errors.teamAdminOrTournamentAdmin');
  }
  if (!member && !tournamentAdmin) {
    throw createForbidden(undefined, 'errors.accessDenied');
  }
  return team;
}

async function isTournamentAdmin(userId: string, tournamentId: string): Promise<boolean> {
  const admin = await TournamentAdmin.query().findOne({ userId, tournamentId });
  return !!admin;
}

async function notifyTournamentAdminsOfPlayerRequest(
  tournamentId: string,
  teamId: string,
  requestId: string,
  type: 'add' | 'edit' | 'delete',
  teamName: string,
  requesterName?: string
): Promise<void> {
  const admins = await TournamentAdmin.query().where({ tournamentId }).select('userId');
  const appUrl = process.env.APP_URL || 'http://localhost:4000';
  const typeLabel = type === 'add' ? 'agregar jugador' : type === 'edit' ? 'editar jugador' : 'eliminar jugador';
  const title = `Solicitud para ${typeLabel} en ${teamName}`;
  const body = requesterName
    ? `${requesterName} solicita ${typeLabel}. Revisa y aprueba o rechaza.`
    : `Solicitud para ${typeLabel}. Revisa y aprueba o rechaza.`;

  for (const { userId } of admins) {
    await Notification.query().insert({
      userId,
      type: 'player_change_request',
      title,
      body,
      link: `${appUrl}/dashboard?section=tournaments&playerRequestId=${requestId}&teamId=${teamId}`,
      metadata: { requestId, tournamentId, teamId, teamName, requestType: type },
    });
  }
}

/** Notify the team owner/requester when their player change request is approved or rejected. */
async function notifyRequesterOfPlayerRequestDecision(
  requestedByUserId: string,
  requestId: string,
  teamId: string,
  teamName: string,
  decision: 'approved' | 'rejected'
): Promise<void> {
  const appUrl = process.env.APP_URL || 'http://localhost:4000';
  const isApproved = decision === 'approved';
  const type = isApproved ? 'player_change_request_approved' : 'player_change_request_rejected';
  const title = isApproved
    ? `Solicitud de cambios de jugador aprobada`
    : `Solicitud de cambios de jugador rechazada`;
  const body = isApproved
    ? `Tu solicitud de cambios en el equipo "${teamName}" fue aprobada por el administrador del torneo.`
    : `Tu solicitud de cambios en el equipo "${teamName}" fue rechazada por el administrador del torneo.`;

  try {
    await Notification.query().insert({
      userId: requestedByUserId,
      type,
      title,
      body,
      link: `${appUrl}/dashboard?section=teams&teamId=${teamId}`,
      metadata: { requestId, teamId, teamName, decision },
    });
  } catch (err) {
    console.error('[notifications] Failed to notify requester of player change request decision:', err);
  }
}

const createTeam = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: tournamentId } = request.params as { id: string };
  const payload = request.payload as { name: string; description?: string; ownerEmail: string };

  await ensureTournamentAdmin(userId, tournamentId);

  const tournament = await Tournament.query().findById(tournamentId);
  if (!tournament) throw createNotFound(request, 'errors.tournamentNotFound');

  const ownerEmail = payload.ownerEmail.toLowerCase().trim();
  const user = await User.query().findById(userId).select('email');
  const isSelf = user?.email?.toLowerCase() === ownerEmail;

  const team = await Team.query().insert({
    tournamentId,
    sport: tournament.sport,
    name: payload.name,
    description: payload.description || undefined,
    ownerEmail: payload.ownerEmail,
  });

  await TournamentTeam.query().insert({
    tournamentId,
    teamId: team.id,
  });

  let inviteUrl: string | undefined;
  if (isSelf) {
    await TeamMember.query().insert({
      teamId: team.id,
      userId,
      isAdmin: true,
    });
    const teamAdminRole = await Role.query().findOne({ name: 'team_admin' });
    if (teamAdminRole) {
      const hasRole = await UserRole.query().findOne({ userId, roleId: teamAdminRole.id });
      if (!hasRole) {
        await UserRole.query().insert({ userId, roleId: teamAdminRole.id });
      }
    }
  } else {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await TeamInvitation.query().insert({
      teamId: team.id,
      email: ownerEmail,
      token,
      status: 'pending',
      expiresAt: expiresAt.toISOString(),
    });

    const appUrl = process.env.APP_URL || 'http://localhost:4000';
    inviteUrl = `${appUrl}/register?invite=${token}`;

    try {
      await sendTeamInvitation({
        to: payload.ownerEmail,
        teamName: team.name,
        tournamentName: tournament.name,
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (err) {
      console.error('[email] Failed to send invitation:', err);
    }

    const invitedUser = await User.query().findOne({ email: ownerEmail });
    if (invitedUser) {
      try {
        await Notification.query().insert({
          userId: invitedUser.id,
          type: 'team_invitation',
          title: `Invitación al equipo "${team.name}"`,
          body: `Te han invitado a gestionar el equipo ${team.name} en el torneo ${tournament.name}.`,
          link: `${appUrl}/dashboard?section=teams&teamId=${team.id}`,
          metadata: { teamId: team.id, tournamentId, teamName: team.name, tournamentName: tournament.name },
        });
      } catch (notifErr) {
        console.error('[notifications] Failed to create team invitation notification:', notifErr);
      }
    }
  }

  const created = await Team.query()
    .findById(team.id)
    .withGraphFetched('invitations');
  return h.response({ ...created, inviteUrl }).code(201);
};

function isTournamentPro(tournament: Tournament): boolean {
  return !!(tournament.logoUrl || tournament.publicPageColors);
}

const listAvailableTeams = async (request: Request) => {
  const { id: tournamentId } = request.params as { id: string };
  const credentials = request.auth?.credentials as { userId: string } | undefined;
  const userId = credentials?.userId;
  if (!userId) throw createForbidden(request, 'errors.authenticationRequired');

  await ensureTournamentAdmin(userId, tournamentId);

  const tournament = await Tournament.query().findById(tournamentId);
  if (!tournament) throw createNotFound(request, 'errors.tournamentNotFound');
  if (!isTournamentPro(tournament)) {
    throw createForbidden(request, 'errors.addingTeamsProOnly');
  }

  const alreadyInTournament = (await TournamentTeam.query().where({ tournamentId }).select('teamId')).map((tt) => tt.teamId);

  let query = Team.query()
    .select('id', 'name', 'sport', 'tournamentId')
    .where('sport', tournament.sport);
  if (alreadyInTournament.length > 0) {
    query = query.whereNotIn('id', alreadyInTournament);
  }
  const teams = await query
    .withGraphFetched('tournament')
    .modifyGraph('tournament', (qb) => qb.select('id', 'name', 'slug'))
    .orderBy('name');

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    sport: t.sport,
    tournamentId: t.tournamentId,
    tournament: (t as { tournament?: { id: string; name: string; slug: string } }).tournament,
  }));
};

const addExistingTeam = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: tournamentId } = request.params as { id: string };
  const payload = request.payload as { teamId: string };

  await ensureTournamentAdmin(userId, tournamentId);

  const tournament = await Tournament.query().findById(tournamentId);
  if (!tournament) throw createNotFound(request, 'errors.tournamentNotFound');
  if (!isTournamentPro(tournament)) {
    throw createForbidden(request, 'errors.addingTeamsProOnly');
  }

  const team = await Team.query().findById(payload.teamId);
  if (!team) throw createNotFound(request, 'errors.teamNotFound');
  if (team.sport !== tournament.sport) {
    throw createBadRequest(request, 'errors.teamSportMustMatch');
  }

  const existing = await TournamentTeam.query().findOne({ tournamentId, teamId: payload.teamId });
  if (existing) {
    throw createBadRequest(request, 'errors.teamAlreadyInTournament');
  }

  await TournamentTeam.query().insert({
    tournamentId,
    teamId: payload.teamId,
  });

  const created = await Team.query().findById(payload.teamId).withGraphFetched('invitations');
  const tournamentAdded = tournament as { categoryType?: string };
  const requiresConfigurationForTeamOwner = tournamentAdded.categoryType === 'ages';
  return h
    .response({ ...created, requiresConfigurationForTeamOwner })
    .code(201);
};

const inviteTeamOwner = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId } = request.params as { id: string };
  const { email } = request.payload as { email: string };

  const team = await Team.query().findById(teamId).withGraphFetched('tournament');
  if (!team) throw createNotFound(request, 'errors.teamNotFound');
  await ensureTournamentAdmin(userId, team.tournamentId);

  const existing = await TeamInvitation.query().findOne({
    teamId,
    email: email.toLowerCase(),
    status: 'pending',
  });
  if (existing) {
    throw createBadRequest(request, 'errors.invitationAlreadySent');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await Team.query().findById(teamId).patch({ ownerEmail: email });
  await TeamInvitation.query().insert({
    teamId,
    email: email.toLowerCase(),
    token,
    status: 'pending',
    expiresAt: expiresAt.toISOString(),
  });

  const appUrl = process.env.APP_URL || 'http://localhost:4000';
  const inviteUrl = `${appUrl}/register?invite=${token}`;

  try {
    await sendTeamInvitation({
      to: email,
      teamName: team.name,
      tournamentName: team.tournament?.name || 'Torneo',
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('[email] Failed to send invitation:', err);
  }

  const invitedUser = await User.query().findOne({ email: email.toLowerCase() });
  if (invitedUser) {
    try {
      await Notification.query().insert({
        userId: invitedUser.id,
        type: 'team_invitation',
        title: `Invitación al equipo "${team.name}"`,
        body: `Te han invitado a gestionar el equipo ${team.name} en el torneo ${team.tournament?.name || 'Torneo'}.`,
        link: `${appUrl}/dashboard?section=teams&teamId=${team.id}`,
        metadata: { teamId, tournamentId: team.tournamentId, teamName: team.name, tournamentName: team.tournament?.name || 'Torneo' },
      });
    } catch (notifErr) {
      console.error('[notifications] Failed to create team invitation notification:', notifErr);
    }
  }

  return h.response({ success: true, message: 'Invitation sent' }).code(200);
};

const getInvitationByToken = async (request: Request) => {
  const { token } = request.params as { token: string };
  const inv = await TeamInvitation.query()
    .findOne({ token, status: 'pending' })
    .withGraphFetched('[team.tournament]');
  if (!inv) throw createNotFound(request, 'errors.invitationNotFoundOrExpired');
  if (new Date(inv.expiresAt) < new Date()) {
    await TeamInvitation.query().findById(inv.id).patch({ status: 'expired' });
    throw createNotFound(request, 'errors.invitationExpired');
  }
  return {
    token: inv.token,
    email: inv.email,
    teamName: inv.team?.name,
    tournamentName: (inv.team as { tournament?: { name: string } })?.tournament?.name,
  };
};

const getMyTeams = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const members = await TeamMember.query()
    .where({ userId, isAdmin: true })
    .orderBy('createdAt', 'asc');
  const teamIds = members.map((m) => m.teamId);
  if (teamIds.length === 0) return [];
  const teams = await Team.query()
    .findByIds(teamIds)
    .withGraphFetched('tournament');
  const order = Object.fromEntries(teamIds.map((id, i) => [id, i]));
  return teams.sort((a, b) => (order[a.id] ?? 99) - (order[b.id] ?? 99));
};

/** Tournaments (other than primary) where this team is registered and that have a different format (e.g. age categories). Team admin must adjust configuration for those. */
async function getTournamentsRequiringConfiguration(
  teamId: string,
  primaryTournamentId: string
): Promise<Array<{ id: string; name: string; slug: string }>> {
  const links = await TournamentTeam.query()
    .where({ teamId })
    .whereNot('tournamentId', primaryTournamentId)
    .select('tournamentId');
  if (links.length === 0) return [];

  const tournamentIds = links.map((l) => l.tournamentId);
  const tournaments = await Tournament.query()
    .findByIds(tournamentIds)
    .select('id', 'slug', 'name', 'categoryType');
  return tournaments
    .filter((t) => t.categoryType === 'ages')
    .map((t) => ({ id: t.id, name: t.name, slug: t.slug }));
}

/** All team IDs that participate in this tournament (primary + linked via tournament_teams). */
async function getTeamIdsInTournament(tournamentId: string): Promise<string[]> {
  const primaryTeams = await Team.query().where({ tournamentId }).select('id');
  const junction = await TournamentTeam.query().where({ tournamentId }).select('teamId');
  const ids = new Set<string>([
    ...primaryTeams.map((r) => r.id),
    ...junction.map((r) => (r as { teamId: string }).teamId),
  ]);
  return [...ids];
}

/** Validate birth year is not older than the age category allows. Only rejects if birthYear < min (too old). Younger players (birthYear > max) are allowed. Throws badRequest with code BIRTH_YEAR_TOO_OLD if invalid. */
async function validatePlayerBirthYearInCategory(
  tournamentId: string,
  categoryId: string,
  birthYear: number | undefined
): Promise<void> {
  if (birthYear == null) return;
  const cat = await TournamentAgeCategory.query()
    .findById(categoryId)
    .where({ tournamentId });
  if (!cat) return;
  const min = (cat as TournamentAgeCategory).minBirthYear;
  if (birthYear < min) {
    throw createBadRequest(undefined, 'errors.birthYearTooOld');
  }
}

/**
 * Ensure the same player (by idDocumentNumber) is not already registered in another team
 * in THIS tournament. A player may play in different tournaments (different teams);
 * they just cannot be in two different teams within the same tournament.
 * Throws badRequest if duplicate in same tournament.
 */
async function ensurePlayerNotInAnotherTeamInTournament(
  tournamentId: string,
  currentTeamId: string,
  idDocumentNumber: string | null | undefined
): Promise<void> {
  const docNumber = (idDocumentNumber ?? '').toString().trim() || null;
  if (!docNumber) return;
  const teamIds = await getTeamIdsInTournament(tournamentId);
  const otherTeamIds = teamIds.filter((id) => id !== currentTeamId);
  if (otherTeamIds.length === 0) return;
  const existing = await Player.query()
    .whereIn('teamId', otherTeamIds)
    .where('idDocumentNumber', docNumber)
    .where('status', 'active')
    .first();
  if (existing) {
    throw createBadRequest(undefined, 'errors.playerAlreadyInAnotherTeam');
  }
}

const getTeam = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId } = request.params as { id: string };
  await ensureTeamAccess(userId, teamId);

  const team = await Team.query()
    .findById(teamId)
    .withGraphFetched('[players.documents, tournament.ageCategories, venues, technicalStaff, uniforms]');
  const primaryId = (team as Team).tournamentId;
  const tournamentsRequiringConfiguration = await getTournamentsRequiringConfiguration(teamId, primaryId);
  const userIsTournamentAdmin = await isTournamentAdmin(userId, primaryId);

  const linkedTournamentIds = await TournamentTeam.query()
    .where({ teamId })
    .select('tournamentId');
  const allTournamentIds = [
    primaryId,
    ...linkedTournamentIds.map((r) => r.tournamentId).filter((id) => id !== primaryId),
  ];
  const uniqueTournamentIds = [...new Set(allTournamentIds)];
  const participatingTournaments = await Tournament.query()
    .findByIds(uniqueTournamentIds)
    .withGraphFetched('ageCategories')
    .select('id', 'name', 'slug', 'categoryType', 'tournamentType');
  const tournamentsData = (participatingTournaments as Array<{ id: string; name: string; slug: string; categoryType: string; ageCategories?: Array<{ id: string; name: string; minBirthYear: number; maxBirthYear: number }> }>).map(
    (t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      categoryType: t.categoryType,
      ageCategories: t.ageCategories ?? [],
    })
  );

  const playerIds = ((team as { players?: Array<{ id: string }> }).players ?? []).map((p) => p.id);
  const categoryByTournamentByPlayer: Record<string, Record<string, { categoryId: string; categoryName: string }>> = {};
  if (playerIds.length > 0) {
    const ptcs = await PlayerTournamentCategory.query()
      .whereIn('playerId', playerIds)
      .withGraphFetched('tournamentAgeCategory');
    for (const ptc of ptcs as Array<PlayerTournamentCategory & { tournamentAgeCategory?: { name: string } }>) {
      if (!categoryByTournamentByPlayer[ptc.playerId]) categoryByTournamentByPlayer[ptc.playerId] = {};
      categoryByTournamentByPlayer[ptc.playerId][ptc.tournamentId] = {
        categoryId: ptc.tournamentAgeCategoryId,
        categoryName: ptc.tournamentAgeCategory?.name ?? '',
      };
    }
  }

  const playersWithCategoryByTournament = ((team as { players?: Array<Record<string, unknown>> }).players ?? []).map(
    (p) => ({
      ...p,
      categoryByTournament: categoryByTournamentByPlayer[p.id as string] ?? {},
    })
  );

  let owner: { email: string; name?: string } | undefined;
  const ownerEmail = (team as Team & { ownerEmail?: string }).ownerEmail;
  if (ownerEmail) {
    const ownerUser = await User.query()
      .findOne({ email: ownerEmail.toLowerCase() })
      .select('name', 'email');
    if (ownerUser) {
      owner = {
        email: (ownerUser as { email: string }).email,
        name: (ownerUser as { name?: string }).name ?? undefined,
      };
    } else {
      owner = { email: ownerEmail };
    }
  }

  return {
    ...(team as object),
    players: playersWithCategoryByTournament,
    participatingTournaments: tournamentsData,
    tournamentsRequiringConfiguration,
    isTournamentAdmin: userIsTournamentAdmin,
    owner,
  };
};

const listVenues = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId } = request.params as { id: string };
  await ensureTeamAccess(userId, teamId);
  const venues = await TeamVenue.query()
    .where({ teamId })
    .orderByRaw('is_official desc, sort_order asc, name asc');
  return venues;
};

const addVenue = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId } = request.params as { id: string };
  const payload = request.payload as { name: string; isOfficial?: boolean };
  await ensureTeamAccess(userId, teamId, true);

  const isOfficial = payload.isOfficial ?? true;
  if (isOfficial) {
    await TeamVenue.query().where({ teamId }).patch({ isOfficial: false });
  }
  const maxSort = await TeamVenue.query()
    .where({ teamId })
    .max('sortOrder as max')
    .first();
  const sortOrder = ((maxSort?.max as number) ?? 0) + 1;

  const venue = await TeamVenue.query().insert({
    teamId,
    name: payload.name.trim(),
    isOfficial,
    sortOrder,
  });
  return h.response(venue).code(201);
};

const updateVenue = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId, venueId } = request.params as { id: string; venueId: string };
  const payload = request.payload as { name?: string; isOfficial?: boolean };
  await ensureTeamAccess(userId, teamId, true);

  const venue = await TeamVenue.query().findOne({ id: venueId, teamId });
  if (!venue) throw createNotFound(request, 'errors.venueNotFound');

  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) updateData.name = payload.name.trim();
  if (payload.isOfficial !== undefined) updateData.isOfficial = payload.isOfficial;

  if (Object.keys(updateData).length > 0) {
    if (payload.isOfficial === true) {
      await TeamVenue.query().where({ teamId }).whereNot('id', venueId).patch({ isOfficial: false });
    }
    if (payload.isOfficial === false && venue.isOfficial) {
      const officialCount = await TeamVenue.query().where({ teamId, isOfficial: true }).resultSize();
      if (officialCount <= 1) {
        const firstOther = await TeamVenue.query()
          .where({ teamId })
          .whereNot('id', venueId)
          .orderBy('sortOrder', 'asc')
          .orderBy('name', 'asc')
          .first();
        if (firstOther) {
          await TeamVenue.query().findById(firstOther.id).patch({ isOfficial: true });
        }
      }
    }
    await TeamVenue.query().findById(venueId).patch(updateData);
  }
  return TeamVenue.query().findById(venueId);
};

const removeVenue = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId, venueId } = request.params as { id: string; venueId: string };
  const team = await ensureTeamAccess(userId, teamId, true);

  const venue = await TeamVenue.query().findOne({ id: venueId, teamId });
  if (!venue) throw createNotFound(request, 'errors.venueNotFound');

  const tournament = await Tournament.query().findById(team.tournamentId);
  const isSingleVenue = (tournament as { isSingleVenue?: boolean } | undefined)?.isSingleVenue;

  if (!isSingleVenue) {
    const count = await TeamVenue.query().where({ teamId }).resultSize();
    if (count <= 1) {
      throw createBadRequest(request, 'errors.teamMustHaveOneVenue');
    }

    const officialCount = await TeamVenue.query().where({ teamId, isOfficial: true }).resultSize();
    const alternateCount = count - officialCount;
    if (venue.isOfficial && officialCount <= 1) {
      throw createBadRequest(request, 'errors.teamMustHaveOfficialVenue');
    }
    if (!venue.isOfficial && alternateCount <= 1) {
      throw createBadRequest(request, 'errors.teamMustHaveAlternateVenue');
    }
  }

  await TeamVenue.query().findById(venueId).delete();
  return h.response({ success: true }).code(200);
};

// --- Technical staff ---
const listTechnicalStaff = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId } = request.params as { id: string };
  await ensureTeamAccess(userId, teamId);
  return TeamTechnicalStaff.query()
    .where({ teamId })
    .orderBy('sortOrder', 'asc')
    .orderBy('fullName', 'asc');
};

const addTechnicalStaff = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId } = request.params as { id: string };
  const payload = request.payload as { fullName: string; idDocumentNumber: string; type: string; coachLicense?: string | null; photoUrl?: string | null };
  await ensureTeamAccess(userId, teamId, true);
  const maxSort = await TeamTechnicalStaff.query().where({ teamId }).max('sortOrder as max').first();
  const sortOrder = ((maxSort?.max as number) ?? 0) + 1;
  const staff = await TeamTechnicalStaff.query().insert({
    teamId,
    fullName: payload.fullName.trim(),
    idDocumentNumber: payload.idDocumentNumber.trim(),
    type: payload.type,
    coachLicense: payload.coachLicense?.trim() || null,
    photoUrl: payload.photoUrl?.trim() || null,
    sortOrder,
  });
  return h.response(staff).code(201);
};

const updateTechnicalStaff = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId, staffId } = request.params as { id: string; staffId: string };
  const payload = request.payload as { fullName?: string; idDocumentNumber?: string; type?: string; coachLicense?: string | null; photoUrl?: string | null };
  await ensureTeamAccess(userId, teamId, true);
  const staff = await TeamTechnicalStaff.query().findOne({ id: staffId, teamId });
  if (!staff) throw createNotFound(request, 'errors.technicalStaffNotFound');
  const updateData: Record<string, unknown> = {};
  if (payload.fullName !== undefined) updateData.fullName = payload.fullName.trim();
  if (payload.idDocumentNumber !== undefined) updateData.idDocumentNumber = payload.idDocumentNumber.trim();
  if (payload.type !== undefined) updateData.type = payload.type;
  if (payload.coachLicense !== undefined) updateData.coachLicense = payload.coachLicense?.trim() || null;
  if (payload.photoUrl !== undefined) updateData.photoUrl = payload.photoUrl?.trim() || null;
  if (Object.keys(updateData).length > 0) {
    await TeamTechnicalStaff.query().findById(staffId).patch(updateData);
  }
  return TeamTechnicalStaff.query().findById(staffId);
};

const removeTechnicalStaff = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId, staffId } = request.params as { id: string; staffId: string };
  await ensureTeamAccess(userId, teamId, true);
  const staff = await TeamTechnicalStaff.query().findOne({ id: staffId, teamId });
  if (!staff) throw createNotFound(request, 'errors.technicalStaffNotFound');
  await TeamTechnicalStaff.query().findById(staffId).delete();
  return h.response({ success: true }).code(200);
};

// --- Uniforms ---
const listUniforms = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId } = request.params as { id: string };
  await ensureTeamAccess(userId, teamId);
  return TeamUniform.query().where({ teamId }).orderBy('sortOrder', 'asc');
};

const addUniform = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId } = request.params as { id: string };
  const payload = request.payload as { jerseyColor: string; shortsColor: string; socksColor: string };
  await ensureTeamAccess(userId, teamId, true);
  const maxSort = await TeamUniform.query().where({ teamId }).max('sortOrder as max').first();
  const sortOrder = ((maxSort?.max as number) ?? 0) + 1;
  const uniform = await TeamUniform.query().insert({
    teamId,
    jerseyColor: payload.jerseyColor.trim(),
    shortsColor: payload.shortsColor.trim(),
    socksColor: payload.socksColor.trim(),
    sortOrder,
  });
  return h.response(uniform).code(201);
};

const updateUniform = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId, uniformId } = request.params as { id: string; uniformId: string };
  const payload = request.payload as { jerseyColor?: string; shortsColor?: string; socksColor?: string };
  await ensureTeamAccess(userId, teamId, true);
  const uniform = await TeamUniform.query().findOne({ id: uniformId, teamId });
  if (!uniform) throw createNotFound(request, 'errors.uniformNotFound');
  const updateData: Record<string, unknown> = {};
  if (payload.jerseyColor !== undefined) updateData.jerseyColor = payload.jerseyColor.trim();
  if (payload.shortsColor !== undefined) updateData.shortsColor = payload.shortsColor.trim();
  if (payload.socksColor !== undefined) updateData.socksColor = payload.socksColor.trim();
  if (Object.keys(updateData).length > 0) {
    await TeamUniform.query().findById(uniformId).patch(updateData);
  }
  return TeamUniform.query().findById(uniformId);
};

const removeUniform = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId, uniformId } = request.params as { id: string; uniformId: string };
  await ensureTeamAccess(userId, teamId, true);
  const uniform = await TeamUniform.query().findOne({ id: uniformId, teamId });
  if (!uniform) throw createNotFound(request, 'errors.uniformNotFound');
  await TeamUniform.query().findById(uniformId).delete();
  return h.response({ success: true }).code(200);
};

function buildPlayerName(p: { name?: string; firstName?: string; lastName?: string }): string {
  if (p.name?.trim()) return p.name.trim();
  const parts = [p.firstName, p.lastName].filter(Boolean).map((s) => (s ?? '').trim());
  return parts.join(' ').trim() || '';
}

const addPlayer = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId } = request.params as { id: string };
  const payload = request.payload as {
    name?: string;
    firstName?: string;
    lastName?: string;
    birthYear?: number;
    birthDate?: string;
    tournamentAgeCategoryId?: string;
    idDocumentType?: string | null;
    idDocumentNumber?: string | null;
    guardianName?: string | null;
    guardianRelation?: string | null;
    guardianIdNumber?: string | null;
    guardianPhone?: string | null;
    guardianEmail?: string | null;
    photoUrl?: string | null;
    documents?: Array<{ documentType: string; fileUrl: string; fileName?: string; mimeType?: string }>;
  };

  const team = await ensureTeamAccess(userId, teamId, true);
  const tournament = await Tournament.query().findById(team.tournamentId);
  const name = buildPlayerName(payload);
  if (!name) throw createBadRequest(request, 'errors.nameOrFirstLastNameRequired');

  if (payload.tournamentAgeCategoryId && tournament?.categoryType === 'ages') {
    const cat = await TournamentAgeCategory.query()
      .findById(payload.tournamentAgeCategoryId)
      .where({ tournamentId: team.tournamentId });
    if (!cat) throw createBadRequest(request, 'errors.invalidAgeCategory');
    await validatePlayerBirthYearInCategory(
      team.tournamentId,
      payload.tournamentAgeCategoryId,
      payload.birthYear
    );
  }
  await ensurePlayerNotInAnotherTeamInTournament(
    team.tournamentId,
    teamId,
    payload.idDocumentNumber
  );

  const userIsTournamentAdmin = await isTournamentAdmin(userId, team.tournamentId);
  const today = new Date().toISOString().slice(0, 10);
  const startDateStr = tournament?.startDate ? String(tournament.startDate).slice(0, 10) : null;
  const isBeforeTournamentStart = !!startDateStr && today < startDateStr;

  if (userIsTournamentAdmin || isBeforeTournamentStart) {
    const maxSort = await Player.query().where({ teamId }).max('sortOrder as max').first();
    const sortOrder = ((maxSort?.max as number) ?? 0) + 1;
    const insertData: PartialModelObject<Player> = {
      teamId,
      name,
      firstName: payload.firstName || null,
      lastName: payload.lastName || null,
      birthYear: payload.birthYear,
      birthDate: payload.birthDate || null,
      tournamentAgeCategoryId: payload.tournamentAgeCategoryId,
      idDocumentType: payload.idDocumentType || null,
      idDocumentNumber: payload.idDocumentNumber || null,
      guardianName: payload.guardianName || null,
      guardianRelation: payload.guardianRelation || null,
      guardianIdNumber: payload.guardianIdNumber || null,
      guardianPhone: payload.guardianPhone || null,
      guardianEmail: payload.guardianEmail || null,
      photoUrl: payload.photoUrl || null,
      sortOrder,
      status: 'active',
    };
    const player = await Player.query().insert(insertData);
    if (payload.documents?.length) {
      for (const doc of payload.documents) {
        await PlayerDocument.query().insert({
          playerId: player.id,
          documentType: doc.documentType as 'player_id_copy' | 'birth_certificate' | 'guardian_id_copy',
          fileUrl: doc.fileUrl,
          fileName: doc.fileName ?? null,
          mimeType: doc.mimeType ?? null,
        });
      }
    }
    return h.response(await Player.query().findById(player.id).withGraphFetched('documents')).code(201);
  }

  const req = await PlayerChangeRequest.query().insert({
    tournamentId: team.tournamentId,
    teamId,
    playerId: null,
    type: 'add',
    payload: {
      name,
      firstName: payload.firstName,
      lastName: payload.lastName,
      birthYear: payload.birthYear,
      birthDate: payload.birthDate,
      tournamentAgeCategoryId: payload.tournamentAgeCategoryId,
      idDocumentType: payload.idDocumentType,
      idDocumentNumber: payload.idDocumentNumber,
      guardianName: payload.guardianName,
      guardianRelation: payload.guardianRelation,
      guardianPhone: payload.guardianPhone,
      guardianEmail: payload.guardianEmail,
      photoUrl: payload.photoUrl,
      documents: payload.documents,
    },
    requestedByUserId: userId,
    status: 'pending',
  });

  const requester = await User.query().findById(userId).select('name');
  await notifyTournamentAdminsOfPlayerRequest(
    team.tournamentId,
    teamId,
    req.id,
    'add',
    team.name,
    (requester as { name?: string })?.name ?? undefined
  );

  return h
    .response({
      id: req.id,
      status: 'pending',
      message: 'Request sent to tournament administrator for approval',
    })
    .code(202);
};

const updatePlayer = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId, playerId } = request.params as { id: string; playerId: string };
  const payload = request.payload as {
    name?: string;
    firstName?: string | null;
    lastName?: string | null;
    birthYear?: number;
    birthDate?: string | null;
    tournamentAgeCategoryId?: string | null;
    idDocumentType?: string | null;
    idDocumentNumber?: string | null;
    guardianName?: string | null;
    guardianRelation?: string | null;
    guardianIdNumber?: string | null;
    guardianPhone?: string | null;
    guardianEmail?: string | null;
    photoUrl?: string | null;
    documents?: Array<{ documentType: string; fileUrl: string; fileName?: string; mimeType?: string }>;
  };

  const team = await ensureTeamAccess(userId, teamId, true);
  const player = await Player.query().findOne({ id: playerId, teamId });
  if (!player) throw createNotFound(request, 'errors.playerNotFound');

  const tournament = await Tournament.query().findById(team.tournamentId);
  if (payload.tournamentAgeCategoryId && tournament?.categoryType === 'ages') {
    const cat = await TournamentAgeCategory.query()
      .findById(payload.tournamentAgeCategoryId)
      .where({ tournamentId: team.tournamentId });
    if (!cat) throw createBadRequest(request, 'errors.invalidAgeCategory');
  }

  const userIsTournamentAdmin = await isTournamentAdmin(userId, team.tournamentId);

  if (userIsTournamentAdmin) {
    const updateData: PartialModelObject<Player> = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.firstName !== undefined) updateData.firstName = payload.firstName || null;
    if (payload.lastName !== undefined) updateData.lastName = payload.lastName || null;
    if (payload.birthYear !== undefined) updateData.birthYear = payload.birthYear;
    if (payload.birthDate !== undefined) updateData.birthDate = payload.birthDate || null;
    if (payload.tournamentAgeCategoryId !== undefined) updateData.tournamentAgeCategoryId = payload.tournamentAgeCategoryId ?? undefined;
    if (payload.idDocumentType !== undefined) updateData.idDocumentType = payload.idDocumentType || null;
    if (payload.idDocumentNumber !== undefined) updateData.idDocumentNumber = payload.idDocumentNumber || null;
    if (payload.guardianName !== undefined) updateData.guardianName = payload.guardianName || null;
    if (payload.guardianRelation !== undefined) updateData.guardianRelation = payload.guardianRelation || null;
    if (payload.guardianIdNumber !== undefined) updateData.guardianIdNumber = payload.guardianIdNumber || null;
    if (payload.guardianPhone !== undefined) updateData.guardianPhone = payload.guardianPhone || null;
    if (payload.guardianEmail !== undefined) updateData.guardianEmail = payload.guardianEmail || null;
    if (payload.photoUrl !== undefined) updateData.photoUrl = payload.photoUrl || null;
    if (Object.keys(updateData).length > 0) {
      await Player.query().findById(playerId).patch(updateData);
    }
    if (payload.documents?.length) {
      await PlayerDocument.query().where({ playerId }).delete();
      for (const doc of payload.documents) {
        await PlayerDocument.query().insert({
          playerId,
          documentType: doc.documentType as 'player_id_copy' | 'birth_certificate' | 'guardian_id_copy',
          fileUrl: doc.fileUrl,
          fileName: doc.fileName ?? null,
          mimeType: doc.mimeType ?? null,
        });
      }
    }
    return Player.query().findById(playerId).withGraphFetched('documents');
  }

  const req = await PlayerChangeRequest.query().insert({
    tournamentId: team.tournamentId,
    teamId,
    playerId,
    type: 'edit',
    payload: {
      name: payload.name,
      firstName: payload.firstName,
      lastName: payload.lastName,
      birthYear: payload.birthYear,
      birthDate: payload.birthDate,
      tournamentAgeCategoryId: payload.tournamentAgeCategoryId ?? undefined,
      idDocumentType: payload.idDocumentType,
      idDocumentNumber: payload.idDocumentNumber,
      guardianName: payload.guardianName,
      guardianRelation: payload.guardianRelation,
      guardianIdNumber: payload.guardianIdNumber,
      guardianPhone: payload.guardianPhone,
      guardianEmail: payload.guardianEmail,
      photoUrl: payload.photoUrl,
      documents: payload.documents,
    },
    requestedByUserId: userId,
    status: 'pending',
  });

  const requester = await User.query().findById(userId).select('name');
  await notifyTournamentAdminsOfPlayerRequest(
    team.tournamentId,
    teamId,
    req.id,
    'edit',
    team.name,
    (requester as { name?: string })?.name ?? undefined
  );

  return h.response({
    id: req.id,
    status: 'pending',
    message: 'Request sent to tournament administrator for approval',
  }).code(202);
};

const removePlayer = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId, playerId } = request.params as { id: string; playerId: string };

  const team = await ensureTeamAccess(userId, teamId, true);
  const player = await Player.query().findOne({ id: playerId, teamId });
  if (!player) throw createNotFound(request, 'errors.playerNotFound');

  const userIsTournamentAdmin = await isTournamentAdmin(userId, team.tournamentId);

  if (userIsTournamentAdmin) {
    await Player.query().findById(playerId).patch({ status: 'unsubscribed' });
    return h.response({ success: true }).code(200);
  }

  const req = await PlayerChangeRequest.query().insert({
    tournamentId: team.tournamentId,
    teamId,
    playerId,
    type: 'delete',
    payload: {},
    requestedByUserId: userId,
    status: 'pending',
  });

  const requester = await User.query().findById(userId).select('name');
  await notifyTournamentAdminsOfPlayerRequest(
    team.tournamentId,
    teamId,
    req.id,
    'delete',
    team.name,
    (requester as { name?: string })?.name ?? undefined
  );

  return h.response({
    id: req.id,
    status: 'pending',
    message: 'Request sent to tournament administrator for approval',
  }).code(202);
};

const setPlayerCategory = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId, playerId } = request.params as { id: string; playerId: string };
  const payload = request.payload as { tournamentId: string; tournamentAgeCategoryId: string };

  const team = await ensureTeamAccess(userId, teamId, true);
  const player = await Player.query().findOne({ id: playerId, teamId });
  if (!player) throw createNotFound(request, 'errors.playerNotFound');

  const participates =
    team.tournamentId === payload.tournamentId ||
    (await TournamentTeam.query().findOne({ teamId, tournamentId: payload.tournamentId }));
  if (!participates) throw createBadRequest(request, 'errors.teamDoesNotParticipate');

  const category = await TournamentAgeCategory.query()
    .findOne({ id: payload.tournamentAgeCategoryId, tournamentId: payload.tournamentId });
  if (!category) throw createBadRequest(request, 'errors.categoryNotInTournament');

  const existing = await PlayerTournamentCategory.query().findOne({
    playerId,
    tournamentId: payload.tournamentId,
  });
  if (existing) {
    await PlayerTournamentCategory.query().findById(existing.id).patch({
      tournamentAgeCategoryId: payload.tournamentAgeCategoryId,
    });
  } else {
    await PlayerTournamentCategory.query().insert({
      playerId,
      tournamentId: payload.tournamentId,
      tournamentAgeCategoryId: payload.tournamentAgeCategoryId,
    });
  }

  if (team.tournamentId === payload.tournamentId) {
    await Player.query().findById(playerId).patch({
      tournamentAgeCategoryId: payload.tournamentAgeCategoryId,
    });
  }

  return PlayerTournamentCategory.query()
    .findOne({ playerId, tournamentId: payload.tournamentId })
    .withGraphFetched('tournamentAgeCategory');
};

const reorderPlayers = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId } = request.params as { id: string };
  const payload = request.payload as { playerIds: string[] };

  await ensureTeamAccess(userId, teamId, true);
  if (!payload.playerIds?.length) return { success: true };

  const teamPlayers = await Player.query().where({ teamId }).select('id');
  const teamPlayerIds = new Set(teamPlayers.map((p) => p.id));
  const invalid = payload.playerIds.filter((id) => !teamPlayerIds.has(id));
  if (invalid.length > 0) throw createBadRequest(request, 'errors.somePlayerIdsInvalid');

  for (let i = 0; i < payload.playerIds.length; i++) {
    await Player.query().findById(payload.playerIds[i]).patch({ sortOrder: i });
  }
  return { success: true };
};

const listPlayerChangeRequests = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: tournamentId } = request.params as { id: string };
  await ensureTournamentAdmin(userId, tournamentId);

  const status = (request.query as { status?: string }).status;
  let q = PlayerChangeRequest.query()
    .where({ tournamentId })
    .withGraphFetched('[team, player, requestedByUser]')
    .orderBy('createdAt', 'desc');
  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    q = q.where('status', status);
  }
  const rows = await q;
  const teamIds = [...new Set(rows.map((r) => r.teamId).filter(Boolean))] as string[];
  const userIds = [...new Set(rows.map((r) => r.requestedByUserId).filter(Boolean))] as string[];
  const [teams, users] = await Promise.all([
    teamIds.length > 0 ? Team.query().select('id', 'name').whereIn('id', teamIds) : Promise.resolve([]),
    userIds.length > 0 ? User.query().select('id', 'name').whereIn('id', userIds) : Promise.resolve([]),
  ]);
  const teamMap = new Map(teams.map((t) => [(t as { id: string }).id, t as { id: string; name: string }]));
  const userMap = new Map(users.map((u) => [(u as { id: string }).id, u as { id: string; name?: string }]));
  return rows.map((r) => {
    const plain = r.toJSON ? (r as { toJSON: () => Record<string, unknown> }).toJSON() : (r as unknown as Record<string, unknown>);
    const team = (r.team as { id: string; name: string } | undefined) ?? teamMap.get(r.teamId);
    const requestedByUser = (r.requestedByUser as { id: string; name?: string } | undefined) ?? userMap.get(r.requestedByUserId);
    return {
      ...plain,
      team: team ? { id: team.id, name: String(team.name ?? '') } : undefined,
      requestedByUser: requestedByUser ? { id: requestedByUser.id, name: requestedByUser.name ?? undefined } : undefined,
    };
  });
};

const getPlayerChangeRequest = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: requestId } = request.params as { id: string };
  const req = await PlayerChangeRequest.query()
    .findById(requestId)
    .withGraphFetched('[team, player, requestedByUser, tournament]');
  if (!req) throw createNotFound(request, 'errors.playerChangeRequestNotFound');
  await ensureTournamentAdmin(userId, req.tournamentId);
  let team = req.team as (Team & { ownerEmail?: string }) | undefined;
  if (!team && req.teamId) {
    team = (await Team.query().select('id', 'name', 'ownerEmail').findById(req.teamId)) as (Team & { ownerEmail?: string }) | undefined;
  }
  let requestedByUser = req.requestedByUser as { id: string; name?: string } | undefined;
  if (!requestedByUser && req.requestedByUserId) {
    const u = await User.query().select('id', 'name').findById(req.requestedByUserId);
    requestedByUser = u ? { id: (u as { id: string }).id, name: (u as { name?: string }).name } : undefined;
  }
  let teamOwner: { id: string; name?: string } | undefined;
  if (team?.ownerEmail) {
    const ownerUser = await User.query()
      .select('id', 'name')
      .findOne({ email: team.ownerEmail.toLowerCase() });
    if (ownerUser) {
      teamOwner = { id: (ownerUser as { id: string }).id, name: (ownerUser as { name?: string }).name };
    }
  }
  const plain = req.toJSON ? (req as { toJSON: () => Record<string, unknown> }).toJSON() : (req as unknown as Record<string, unknown>);
  return {
    ...plain,
    team: team ? { id: team.id, name: String(team.name ?? '') } : undefined,
    requestedByUser: requestedByUser ? { id: requestedByUser.id, name: requestedByUser.name ?? undefined } : undefined,
    teamOwner: teamOwner ?? undefined,
  };
};

const approvePlayerChangeRequest = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: requestId } = request.params as { id: string };

  const req = await PlayerChangeRequest.query()
    .findById(requestId)
    .withGraphFetched('team');
  if (!req) throw createNotFound(request, 'errors.playerChangeRequestNotFound');
  if (req.status !== 'pending') throw createBadRequest(request, 'errors.requestAlreadyDecided');

  await ensureTournamentAdmin(userId, req.tournamentId);

  const now = new Date().toISOString();
  if (req.type === 'add') {
    const addPayload = req.payload as {
      name?: string;
      firstName?: string;
      lastName?: string;
      birthYear?: number;
      birthDate?: string;
      tournamentAgeCategoryId?: string;
      idDocumentType?: string | null;
      idDocumentNumber?: string | null;
      guardianName?: string | null;
      guardianRelation?: string | null;
      guardianPhone?: string | null;
      guardianEmail?: string | null;
      photoUrl?: string | null;
      documents?: Array<{ documentType: string; fileUrl: string; fileName?: string; mimeType?: string }>;
    };
    if (addPayload.tournamentAgeCategoryId) {
      await validatePlayerBirthYearInCategory(
        req.tournamentId,
        addPayload.tournamentAgeCategoryId,
        addPayload.birthYear
      );
    }
    await ensurePlayerNotInAnotherTeamInTournament(
      req.tournamentId,
      req.teamId,
      addPayload.idDocumentNumber
    );
    const maxSort = await Player.query().where({ teamId: req.teamId }).max('sortOrder as max').first();
    const sortOrder = ((maxSort?.max as number) ?? 0) + 1;
    const p = await Player.query().insert({
      teamId: req.teamId,
      name: addPayload.name ?? buildPlayerName(addPayload),
      firstName: addPayload.firstName ?? null,
      lastName: addPayload.lastName ?? null,
      birthYear: addPayload.birthYear,
      birthDate: addPayload.birthDate ?? null,
      tournamentAgeCategoryId: addPayload.tournamentAgeCategoryId,
      idDocumentType: addPayload.idDocumentType ?? null,
      idDocumentNumber: addPayload.idDocumentNumber ?? null,
      guardianName: addPayload.guardianName ?? null,
      guardianRelation: addPayload.guardianRelation ?? null,
      guardianIdNumber: addPayload.guardianIdNumber ?? null,
      guardianPhone: addPayload.guardianPhone ?? null,
      guardianEmail: addPayload.guardianEmail ?? null,
      photoUrl: addPayload.photoUrl ?? null,
      sortOrder,
      status: 'active',
    });
    if (addPayload.documents?.length) {
      for (const doc of addPayload.documents) {
        await PlayerDocument.query().insert({
          playerId: p.id,
          documentType: doc.documentType as 'player_id_copy' | 'birth_certificate' | 'guardian_id_copy',
          fileUrl: doc.fileUrl,
          fileName: doc.fileName ?? null,
          mimeType: doc.mimeType ?? null,
        });
      }
    }
    (req as { _createdPlayerId?: string })._createdPlayerId = p.id;
  } else if (req.type === 'edit' && req.playerId) {
    const payload = req.payload as PlayerChangeRequestPayload & {
      firstName?: string | null;
      lastName?: string | null;
      birthDate?: string | null;
      idDocumentType?: string | null;
      idDocumentNumber?: string | null;
      guardianName?: string | null;
      guardianRelation?: string | null;
      guardianPhone?: string | null;
      guardianEmail?: string | null;
      photoUrl?: string | null;
      documents?: Array<{ documentType: string; fileUrl: string; fileName?: string; mimeType?: string }>;
    };
    const updateData: PartialModelObject<Player> = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.firstName !== undefined) updateData.firstName = payload.firstName || null;
    if (payload.lastName !== undefined) updateData.lastName = payload.lastName || null;
    if (payload.birthYear !== undefined) updateData.birthYear = payload.birthYear;
    if (payload.birthDate !== undefined) updateData.birthDate = payload.birthDate || null;
    if (payload.tournamentAgeCategoryId !== undefined) updateData.tournamentAgeCategoryId = payload.tournamentAgeCategoryId;
    if (payload.idDocumentType !== undefined) updateData.idDocumentType = payload.idDocumentType || null;
    if (payload.idDocumentNumber !== undefined) updateData.idDocumentNumber = payload.idDocumentNumber || null;
    if (payload.guardianName !== undefined) updateData.guardianName = payload.guardianName || null;
    if (payload.guardianRelation !== undefined) updateData.guardianRelation = payload.guardianRelation || null;
    if (payload.guardianIdNumber !== undefined) updateData.guardianIdNumber = payload.guardianIdNumber || null;
    if (payload.guardianPhone !== undefined) updateData.guardianPhone = payload.guardianPhone || null;
    if (payload.guardianEmail !== undefined) updateData.guardianEmail = payload.guardianEmail || null;
    if (payload.photoUrl !== undefined) updateData.photoUrl = payload.photoUrl || null;
    if (Object.keys(updateData).length > 0) {
      await Player.query().findById(req.playerId).patch(updateData);
    }
    if (payload.documents !== undefined) {
      await PlayerDocument.query().where({ playerId: req.playerId }).delete();
      for (const doc of payload.documents) {
        await PlayerDocument.query().insert({
          playerId: req.playerId,
          documentType: doc.documentType as 'player_id_copy' | 'birth_certificate' | 'guardian_id_copy',
          fileUrl: doc.fileUrl,
          fileName: doc.fileName ?? null,
          mimeType: doc.mimeType ?? null,
        });
      }
    }
  } else if (req.type === 'delete' && req.playerId) {
    await Player.query().findById(req.playerId).patch({ status: 'unsubscribed' });
  }

  await PlayerChangeRequest.query().findById(requestId).patch({
    status: 'approved',
    decidedAt: now,
    decidedByUserId: userId,
    updatedAt: now,
  });

  await notifyRequesterOfPlayerRequestDecision(
    req.requestedByUserId,
    requestId,
    req.teamId,
    req.team?.name ?? 'Equipo',
    'approved'
  );

  return h.response(
    await PlayerChangeRequest.query().findById(requestId).withGraphFetched('[team, player, requestedByUser]')
  ).code(200);
};

const uploadPlayerFile = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId } = request.params as { id: string };
  await ensureTeamAccess(userId, teamId, true);

  const payload = request.payload as {
    type: 'photo' | 'player_id_copy' | 'birth_certificate' | 'guardian_id_copy';
    fileBase64: string;
    fileName: string;
    mimeType: string;
  };
  if (!payload.type || !payload.fileBase64 || !payload.fileName || !payload.mimeType) {
    throw createBadRequest(request, 'errors.uploadFieldsRequired');
  }
  const result = await saveUploadedFileFromBase64(
    payload.fileBase64,
    payload.fileName,
    payload.mimeType,
    payload.type
  );
  return h.response(result).code(201);
};

const servePlayerFile = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId, filename } = request.params as { id: string; filename: string };
  await ensureTeamAccess(userId, teamId);

  if (!/^[0-9a-f-]+\.(pdf|doc|docx|jpg|jpeg|png|gif|webp)$/i.test(filename)) {
    throw createBadRequest(request, 'errors.invalidFilename');
  }
  const relativeUrl = `players/${filename}`;
  const filePath = resolveFilePath(relativeUrl);
  if (!fs.existsSync(filePath)) throw createNotFound(request, 'errors.fileNotFound');
  const stream = fs.createReadStream(filePath);
  const ext = filename.split('.').pop()?.toLowerCase();
  const mime: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return h.response(stream).type(mime[ext ?? ''] || 'application/octet-stream');
};

const rejectPlayerChangeRequest = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: requestId } = request.params as { id: string };

  const req = await PlayerChangeRequest.query()
    .findById(requestId)
    .withGraphFetched('team');
  if (!req) throw createNotFound(request, 'errors.playerChangeRequestNotFound');
  if (req.status !== 'pending') throw createBadRequest(request, 'errors.requestAlreadyDecided');

  await ensureTournamentAdmin(userId, req.tournamentId);

  const now = new Date().toISOString();
  await PlayerChangeRequest.query().findById(requestId).patch({
    status: 'rejected',
    decidedAt: now,
    decidedByUserId: userId,
    updatedAt: now,
  });

  await notifyRequesterOfPlayerRequestDecision(
    req.requestedByUserId,
    requestId,
    req.teamId,
    req.team?.name ?? 'Equipo',
    'rejected'
  );

  return h.response(
    await PlayerChangeRequest.query().findById(requestId).withGraphFetched('[team, player, requestedByUser]')
  ).code(200);
};

/** List pending player change requests for a team (team owner/member). */
const listTeamPlayerChangeRequests = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: teamId } = request.params as { id: string };
  await ensureTeamAccess(userId, teamId);

  const status = (request.query as { status?: string }).status;
  let q = PlayerChangeRequest.query()
    .where({ teamId })
    .select('id', 'teamId', 'playerId', 'type', 'status', 'createdAt')
    .orderBy('createdAt', 'desc');
  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    q = q.where('status', status);
  }
  return q;
};

/** Resend notification to tournament admins for a pending player change request (requester or team admin). */
const resendPlayerChangeRequestNotification = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id: requestId } = request.params as { id: string };

  const req = await PlayerChangeRequest.query().findById(requestId).withGraphFetched('team');
  if (!req) throw createNotFound(request, 'errors.playerChangeRequestNotFound');
  if (req.status !== 'pending') throw createBadRequest(request, 'errors.requestNoLongerPending');

  await ensureTeamAccess(userId, req.teamId);
  if (req.requestedByUserId !== userId) {
    const member = await TeamMember.query().findOne({ teamId: req.teamId, userId });
    if (!member?.isAdmin) throw createForbidden(request, 'errors.onlyRequesterOrTeamAdminResend');
  }

  const team = req.team as { name: string };
  const requester = await User.query().findById(req.requestedByUserId).select('name');
  await notifyTournamentAdminsOfPlayerRequest(
    req.tournamentId,
    req.teamId,
    req.id,
    req.type,
    team?.name ?? '',
    (requester as { name?: string })?.name ?? undefined
  );

  return h.response({ success: true, message: 'Notification sent to tournament administrator(s)' }).code(200);
};

export const teamRoutes: Plugin<void> = {
  name: 'teamRoutes',
  register: (server) => {
    server.route([
      {
        method: 'POST',
        path: '/tournaments/{id}/teams',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Create team and invite owner',
          validate: {
            params: uuidParam,
            payload: teamCreatePayload,
          },
        },
        handler: createTeam,
      },
      {
        method: 'GET',
        path: '/tournaments/{id}/teams/available',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'List teams from other tournaments that can be added (PRO only)',
          validate: { params: uuidParam },
        },
        handler: listAvailableTeams,
      },
      {
        method: 'POST',
        path: '/tournaments/{id}/teams/add-existing',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Add existing team from another tournament (PRO only)',
          validate: {
            params: uuidParam,
            payload: teamAddExistingPayload,
          },
        },
        handler: addExistingTeam,
      },
      {
        method: 'POST',
        path: '/teams/{id}/invite',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Send invitation to team owner',
          validate: {
            params: uuidParam,
            payload: teamInvitePayload,
          },
        },
        handler: inviteTeamOwner,
      },
      {
        method: 'GET',
        path: '/invitations/{token}',
        options: {
          auth: false,
          tags: ['api', 'teams'],
          description: 'Get invitation info by token',
          validate: {
            params: inviteTokenParam,
          },
        },
        handler: getInvitationByToken,
      },
      {
        method: 'GET',
        path: '/teams/mine',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Get teams owned by current user',
        },
        handler: getMyTeams,
      },
      {
        method: 'GET',
        path: '/teams/{id}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Get team with players',
          validate: { params: uuidParam },
        },
        handler: getTeam,
      },
      {
        method: 'GET',
        path: '/teams/{id}/venues',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'List team venues (official and alternate)',
          validate: { params: uuidParam },
        },
        handler: listVenues,
      },
      {
        method: 'POST',
        path: '/teams/{id}/venues',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Add venue to team. Team must have at least one official and one alternate.',
          validate: {
            params: uuidParam,
            payload: teamVenueCreatePayload,
          },
        },
        handler: addVenue,
      },
      {
        method: 'PATCH',
        path: '/teams/{id}/venues/{venueId}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Update team venue',
          validate: {
            params: Joi.object({ id: Joi.string().uuid().required(), venueId: Joi.string().uuid().required() }),
            payload: teamVenueUpdatePayload,
          },
        },
        handler: updateVenue,
      },
      {
        method: 'DELETE',
        path: '/teams/{id}/venues/{venueId}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Remove venue from team',
          validate: {
            params: Joi.object({ id: Joi.string().uuid().required(), venueId: Joi.string().uuid().required() }),
          },
        },
        handler: removeVenue,
      },
      {
        method: 'GET',
        path: '/teams/{id}/technical-staff',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'List team technical staff',
          validate: { params: uuidParam },
        },
        handler: listTechnicalStaff,
      },
      {
        method: 'POST',
        path: '/teams/{id}/technical-staff',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Add technical staff member',
          validate: {
            params: uuidParam,
            payload: teamTechnicalStaffCreatePayload,
          },
        },
        handler: addTechnicalStaff,
      },
      {
        method: 'PATCH',
        path: '/teams/{id}/technical-staff/{staffId}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Update technical staff member',
          validate: {
            params: Joi.object({ id: Joi.string().uuid().required(), staffId: Joi.string().uuid().required() }),
            payload: teamTechnicalStaffUpdatePayload,
          },
        },
        handler: updateTechnicalStaff,
      },
      {
        method: 'DELETE',
        path: '/teams/{id}/technical-staff/{staffId}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Remove technical staff member',
          validate: {
            params: Joi.object({ id: Joi.string().uuid().required(), staffId: Joi.string().uuid().required() }),
          },
        },
        handler: removeTechnicalStaff,
      },
      {
        method: 'GET',
        path: '/teams/{id}/uniforms',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'List team uniforms',
          validate: { params: uuidParam },
        },
        handler: listUniforms,
      },
      {
        method: 'POST',
        path: '/teams/{id}/uniforms',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Add team uniform',
          validate: {
            params: uuidParam,
            payload: teamUniformCreatePayload,
          },
        },
        handler: addUniform,
      },
      {
        method: 'PATCH',
        path: '/teams/{id}/uniforms/{uniformId}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Update team uniform',
          validate: {
            params: Joi.object({ id: Joi.string().uuid().required(), uniformId: Joi.string().uuid().required() }),
            payload: teamUniformUpdatePayload,
          },
        },
        handler: updateUniform,
      },
      {
        method: 'DELETE',
        path: '/teams/{id}/uniforms/{uniformId}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Remove team uniform',
          validate: {
            params: Joi.object({ id: Joi.string().uuid().required(), uniformId: Joi.string().uuid().required() }),
          },
        },
        handler: removeUniform,
      },
      {
        method: 'POST',
        path: '/teams/{id}/players/upload',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Upload a file (photo or document) for a player; returns { url, fileName, mimeType } to use in create/update player',
          validate: {
            params: uuidParam,
            payload: playerUploadPayload,
          },
          payload: { maxBytes: 15 * 1024 * 1024 },
        },
        handler: uploadPlayerFile,
      },
      {
        method: 'GET',
        path: '/teams/{id}/uploads/players/{filename}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Serve an uploaded player file (photo or document); requires team access',
          validate: {
            params: Joi.object({
              id: Joi.string().uuid().required(),
              filename: Joi.string().pattern(/^[0-9a-f-]+\.(pdf|doc|docx|jpg|jpeg|png|gif|webp)$/i).required(),
            }),
          },
        },
        handler: servePlayerFile,
      },
      {
        method: 'POST',
        path: '/teams/{id}/players',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Add player to team (direct if tournament admin, else creates approval request)',
          validate: {
            params: uuidParam,
            payload: playerCreatePayload,
          },
        },
        handler: addPlayer,
      },
      {
        method: 'PATCH',
        path: '/teams/{id}/players/{playerId}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Update player (direct if tournament admin, else creates approval request)',
          validate: {
            params: Joi.object({ id: Joi.string().uuid().required(), playerId: Joi.string().uuid().required() }),
            payload: playerUpdatePayload,
          },
        },
        handler: updatePlayer,
      },
      {
        method: 'PUT',
        path: '/teams/{id}/players/reorder',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Reorder players; body playerIds = array of player IDs in desired order',
          validate: {
            params: Joi.object({ id: Joi.string().uuid().required() }),
            payload: playerReorderPayload,
          },
        },
        handler: reorderPlayers,
      },
      {
        method: 'PATCH',
        path: '/teams/{id}/players/{playerId}/category',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Set player age category for a tournament the team participates in',
          validate: {
            params: Joi.object({ id: Joi.string().uuid().required(), playerId: Joi.string().uuid().required() }),
            payload: playerSetCategoryPayload,
          },
        },
        handler: setPlayerCategory,
      },
      {
        method: 'DELETE',
        path: '/teams/{id}/players/{playerId}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Remove player (direct if tournament admin, else creates approval request)',
          validate: {
            params: Joi.object({ id: Joi.string().uuid().required(), playerId: Joi.string().uuid().required() }),
          },
        },
        handler: removePlayer,
      },
      {
        method: 'GET',
        path: '/tournaments/{id}/player-change-requests',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'List player change requests for tournament (tournament admin only)',
          validate: {
            params: uuidParam,
            query: Joi.object({ status: Joi.string().valid('pending', 'approved', 'rejected').optional() }),
          },
        },
        handler: listPlayerChangeRequests,
      },
      {
        method: 'GET',
        path: '/player-change-requests/{id}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Get a single player change request (tournament admin only)',
          validate: { params: uuidParam },
        },
        handler: getPlayerChangeRequest,
      },
      {
        method: 'POST',
        path: '/player-change-requests/{id}/approve',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Approve a player change request (tournament admin only)',
          validate: { params: uuidParam },
        },
        handler: approvePlayerChangeRequest,
      },
      {
        method: 'POST',
        path: '/player-change-requests/{id}/reject',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Reject a player change request (tournament admin only)',
          validate: { params: uuidParam },
        },
        handler: rejectPlayerChangeRequest,
      },
      {
        method: 'GET',
        path: '/teams/{id}/player-change-requests',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'List player change requests for a team (team owner/member); query status=pending to get pending only',
          validate: { params: uuidParam },
        },
        handler: listTeamPlayerChangeRequests,
      },
      {
        method: 'POST',
        path: '/player-change-requests/{id}/resend-notification',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'teams'],
          description: 'Resend notification to tournament admin(s) for a pending request (requester or team admin)',
          validate: { params: uuidParam },
        },
        handler: resendPlayerChangeRequestNotification,
      },
    ]);
  },
};
