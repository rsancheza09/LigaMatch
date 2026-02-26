import { Model } from './Model';

export class ConversationParticipant extends Model {
  static tableName = 'conversation_participants';

  id!: string;
  conversationId!: string;
  userId!: string;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { Conversation } = require('./Conversation');
    const { User } = require('./User');
    return {
      conversation: {
        relation: Model.BelongsToOneRelation,
        modelClass: Conversation,
        join: {
          from: 'conversation_participants.conversation_id',
          to: 'conversations.id',
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'conversation_participants.user_id',
          to: 'users.id',
        },
      },
    };
  }
}
