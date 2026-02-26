import { Model } from './Model';

export class Role extends Model {
  static tableName = 'roles';

  id!: string;
  name!: string;
  createdAt!: string;
  updatedAt!: string;
}
