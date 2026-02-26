import { Model } from './Model';

export class UserRole extends Model {
  static tableName = 'user_roles';

  id!: string;
  userId!: string;
  roleId!: string;
  createdAt!: string;
  updatedAt!: string;
}
