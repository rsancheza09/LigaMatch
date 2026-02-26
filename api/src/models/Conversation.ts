import { Model } from './Model';

export class Conversation extends Model {
  static tableName = 'conversations';

  id!: string;
  createdAt!: string;
  updatedAt!: string;

  static get relationMappings() {
    const { ConversationParticipant } = require('./ConversationParticipant');
    const { Message } = require('./Message');
    return {
      participants: {
        relation: Model.HasManyRelation,
        modelClass: ConversationParticipant,
        join: {
          from: 'conversations.id',
          to: 'conversation_participants.conversation_id',
        },
      },
      messages: {
        relation: Model.HasManyRelation,
        modelClass: Message,
        join: {
          from: 'conversations.id',
          to: 'messages.conversation_id',
        },
      },
    };
  }
}
