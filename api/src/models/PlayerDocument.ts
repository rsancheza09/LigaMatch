import { Model } from './Model';

export type PlayerDocumentType = 'player_id_copy' | 'birth_certificate' | 'guardian_id_copy';

export class PlayerDocument extends Model {
  static tableName = 'player_documents';

  id!: string;
  playerId!: string;
  documentType!: PlayerDocumentType;
  fileUrl!: string;
  fileName!: string | null;
  mimeType!: string | null;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { Player } = require('./Player');
    return {
      player: {
        relation: Model.BelongsToOneRelation,
        modelClass: Player,
        join: {
          from: 'player_documents.player_id',
          to: 'players.id',
        },
      },
    };
  }
}
