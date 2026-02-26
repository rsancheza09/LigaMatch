import { Model } from './Model';

export class TeamTechnicalStaff extends Model {
  static tableName = 'team_technical_staff';

  id!: string;
  teamId!: string;
  fullName!: string;
  idDocumentNumber!: string;
  type!: string; // coach | assistant | masseur | utilero
  coachLicense!: string | null;
  photoUrl?: string | null;
  sortOrder!: number;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { Team } = require('./Team');
    return {
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: 'team_technical_staff.teamId',
          to: 'teams.id',
        },
      },
    };
  }
}
