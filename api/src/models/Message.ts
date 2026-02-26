import { Model } from './Model';

export class Message extends Model {
  static tableName = 'messages';

  id!: string;
  conversationId!: string;
  senderId!: string;
  body!: string;
  emailSentAt?: string | null;
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
          from: 'messages.conversation_id',
          to: 'conversations.id',
        },
      },
      sender: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'messages.sender_id',
          to: 'users.id',
        },
      },
    };
  }
}
