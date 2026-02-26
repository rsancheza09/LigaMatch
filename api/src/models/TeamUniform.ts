import { Model } from './Model';

export class TeamUniform extends Model {
  static tableName = 'team_uniforms';

  id!: string;
  teamId!: string;
  jerseyColor!: string;
  shortsColor!: string;
  socksColor!: string;
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
          from: 'team_uniforms.teamId',
          to: 'teams.id',
        },
      },
    };
  }
}
