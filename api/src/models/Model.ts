import { Model as ObjectionModel } from 'objection';
import knex from '../_db/knex';

ObjectionModel.knex(knex);

export class Model extends ObjectionModel {}
