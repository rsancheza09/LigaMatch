import { Model } from './Model';

export class Team extends Model {
  static tableName = 'teams';

  id!: string;
  tournamentId!: string; // Primary/origin tournament
  sport!: string;
  groupId?: string;
  name!: string;
  logoUrl?: string | null;
  ownerEmail?: string;
  description?: string;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { Player } = require('./Player');
    const { TeamMember } = require('./TeamMember');
    const { Tournament } = require('./Tournament');
    const { TournamentGroup } = require('./TournamentGroup');
    const { TeamInvitation } = require('./TeamInvitation');
    return {
      tournament: {
        relation: Model.BelongsToOneRelation,
        modelClass: Tournament,
        join: {
          from: 'teams.tournamentId',
          to: 'tournaments.id',
        },
      },
      group: {
        relation: Model.BelongsToOneRelation,
        modelClass: TournamentGroup,
        join: {
          from: 'teams.groupId',
          to: 'tournament_groups.id',
        },
      },
      players: {
        relation: Model.HasManyRelation,
        modelClass: Player,
        join: {
          from: 'teams.id',
          to: 'players.teamId',
        },
        modify: (qb) => qb.orderBy('status', 'asc').orderBy('sortOrder', 'asc').orderBy('name', 'asc'),
      },
      members: {
        relation: Model.HasManyRelation,
        modelClass: TeamMember,
        join: {
          from: 'teams.id',
          to: 'team_members.teamId',
        },
      },
      invitations: {
        relation: Model.HasManyRelation,
        modelClass: TeamInvitation,
        join: {
          from: 'teams.id',
          to: 'team_invitations.teamId',
        },
      },
      venues: {
        relation: Model.HasManyRelation,
        modelClass: require('./TeamVenue').TeamVenue,
        join: {
          from: 'teams.id',
          to: 'team_venues.teamId',
        },
      },
      technicalStaff: {
        relation: Model.HasManyRelation,
        modelClass: require('./TeamTechnicalStaff').TeamTechnicalStaff,
        join: {
          from: 'teams.id',
          to: 'team_technical_staff.teamId',
        },
        modify: (qb) => qb.orderBy('sortOrder', 'asc').orderBy('fullName', 'asc'),
      },
      uniforms: {
        relation: Model.HasManyRelation,
        modelClass: require('./TeamUniform').TeamUniform,
        join: {
          from: 'teams.id',
          to: 'team_uniforms.teamId',
        },
        modify: (qb) => qb.orderBy('sortOrder', 'asc'),
      },
    };
  }
}
