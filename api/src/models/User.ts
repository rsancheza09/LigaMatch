import { Model } from './Model';

export class User extends Model {
  static tableName = 'users';

  id!: string;
  email!: string;
  passwordHash!: string;
  name?: string;
  plan!: 'free' | 'pro';
  createdAt!: string;
  updatedAt!: string;
}
