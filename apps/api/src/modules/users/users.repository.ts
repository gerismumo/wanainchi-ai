import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from 'nestjs-knex';
import { IUser } from './types/user.types';
import {
  buildPaginationMeta,
  PaginatedResult,
} from 'src/common/util/pagination.util';
import { ResolvedLocation } from 'src/common/util/location.util';
import { UsersMapper } from './users.mapper';
import { UpdateUserDto } from './dto/auth.dto';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectKnex() private readonly knex: Knex,
    private readonly usersMapper: UsersMapper,
  ) {}

  async findTotalUsers(): Promise<number> {
    const result = await this.knex('users').count('* as count').first();
    return Number((result as { count?: string })?.count ?? 0);
  }

  async findByRoles(roleNames: string[]): Promise<IUser[]> {
    if (!roleNames.length) return [];

    return this.knex('users as u')
      .join('user_roles as ur', 'u.id', 'ur.user_id')
      .join('roles as r', 'ur.role_id', 'r.id')
      .whereIn('r.name', roleNames)
      .where('u.is_active', true)
      .select(
        'u.id',
        'u.first_name',
        'u.last_name',
        'u.email',
        'u.phone_number',
        'u.avatar_url',
        'u.is_active',
        'u.location_type',
        'u.location_code',
        'u.location_name',
        'u.county_code',
        'u.county_name',
        'u.constituency_code',
        'u.constituency_name',
        'u.locality_code',
        'u.locality_name',
        'u.created_at',
      )
      .distinct('u.id') as Promise<IUser[]>;
  }

  async findById(id: string): Promise<IUser | null> {
    const user = await this.baseUserWithRolesQuery()
      .where({ 'u.id': id })
      .first();

    return user ?? null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const user = await this.baseUserWithRolesQuery()
      .where({ 'u.email': email })
      .first();

    return user ?? null;
  }

  async createUser(
    data: {
      first_name: string;
      last_name: string;
      email: string;
      password_hash: string;
      role_id: string;
    } & Partial<ResolvedLocation>,
  ): Promise<any> {
    const { first_name, last_name, email, password_hash, role_id, ...location } = data;

    return this.knex.transaction(async (trx: Knex.Transaction) => {
      const [user] = await trx('users')
        .insert({
          first_name,
          last_name,
          email,
          password_hash,
          ...location,
        })
        .returning('*');

      if (!user) {
        throw new InternalServerErrorException('user not created');
      }

      await this.assignRole({ trx, userId: user.id, roleId: role_id });

      return user;
    });
  }

  async createUserWithRoles(
    data: {
      first_name: string;
      last_name: string;
      email: string;
      password_hash: string;
      phone_number?: string;
      is_active?: boolean;
      role_ids: string[];
      avatar_url: string | null;
    } & Partial<ResolvedLocation>,
  ) {
    const {
      first_name,
      last_name,
      email,
      password_hash,
      phone_number,
      is_active,
      role_ids,
      avatar_url,
      ...location
    } = data;

    return this.knex.transaction(async (trx) => {
      const [user] = await trx('users')
        .insert({
          first_name,
          last_name,
          email,
          password_hash,
          phone_number,
          is_active,
          avatar_url,
          ...location,
        })
        .returning('*');

      if (!user) {
        throw new InternalServerErrorException('User not created');
      }

      const roleInserts = role_ids.map((roleId) => ({
        user_id: user.id,
        role_id: roleId,
      }));

      await trx('user_roles').insert(roleInserts);

      return user;
    });
  }

  /**
   * `location` is passed separately (rather than folded into `data`) so we
   * can tell "no location fields were submitted, leave the columns alone"
   * apart from "location fields were submitted, overwrite the ancestry" —
   * the latter is a full 9-column replace since resolveLocation() always
   * returns every level, nulling out ones that don't apply to the new type.
   */
  async updateUserWithRoles(
    userId: string,
    data: UpdateUserDto,
    location?: Partial<ResolvedLocation>,
  ) {
    const { first_name, last_name, phone_number, email, is_active, roles, avatar_url } = data;

    return this.knex.transaction(async (trx: Knex.Transaction) => {
      const updatePayload: Record<string, unknown> = {
        first_name,
        last_name,
        phone_number: phone_number ?? null,
        email,
        is_active,
        avatar_url,
        updated_at: new Date(),
      };

      if (location) {
        Object.assign(updatePayload, location);
      }

      const [updatedUser] = await trx('users')
        .where('id', userId)
        .update(updatePayload, [
          'id',
          'first_name',
          'last_name',
          'email',
          'location_type',
          'location_name',
        ]);

      if (!updatedUser) {
        throw new Error('User update failed');
      }

      if (roles?.length) {
        await trx('user_roles').where({ user_id: userId }).del();

        const roleRows = roles.map((roleId) => ({
          user_id: userId,
          role_id: roleId,
        }));

        await trx('user_roles').insert(roleRows);
      }

      return updatedUser;
    });
  }

  async getRolesByIds(roleIds: string[]) {
    return this.knex('roles').whereIn('id', roleIds).select('*');
  }

  async getRoleByName(name: string) {
    return await this.knex('roles').select('*').where('name', name).first();
  }

  async assignRole(data: {
    trx: Knex.Transaction;
    userId: string;
    roleId: string;
  }): Promise<void> {
    const { trx, userId, roleId } = data;
    await trx('user_roles').insert({
      user_id: userId,
      role_id: roleId,
    });
  }

  async incrementFailedAttempts(userId: string): Promise<void> {
    await this.knex('users')
      .where({ id: userId })
      .increment('failed_attempts', 1);
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await this.knex('users')
      .where({ id: userId })
      .update({ failed_attempts: 0 });
  }

  async updateLastLogin(userId: string) {
    await this.knex('users')
      .where({ id: userId })
      .update({ last_login_at: new Date() });
  }

  async recordLoginHistory(data: {
    user_id: string;
    ip_address: string | null;
    country: string | null;
    city: string | null;
    user_agent: string;
    is_successful: boolean;
  }): Promise<void> {
    await this.knex('user_login_history').insert(data);
  }

  async createResetToken(data: {
    userId: string;
    tokenHash: string;
    type: 'password' | 'pin';
    expiresAt: Date;
  }) {
    return this.knex('password_resets').insert({
      user_id: data.userId,
      token_hash: data.tokenHash,
      expires_at: data.expiresAt,
    });
  }

  async getUnusedResetTokens(id: string) {
    return await this.knex('password_resets').select('*').where({
      used: false,
      user_id: id,
    });
  }

  async findValidResetToken(tokenHash: string) {
    return this.knex('password_resets')
      .where({
        token_hash: tokenHash,
        used: false,
      })
      .andWhere('expires_at', '>', new Date())
      .first();
  }

  async deleteAllResetTokensForUser(userId: string) {
    return await this.knex('password_resets').where({ user_id: userId }).del();
  }

  async markResetTokenUsed(id: string) {
    return await this.knex('password_resets')
      .where({ id })
      .update({ used: true });
  }

  async updatePassword(userId: string, passwordHash: string) {
    return this.knex('users')
      .where({ id: userId })
      .update({ password_hash: passwordHash, failed_attempts: 0 });
  }

  async deleteUser(id: string) {
    return await this.knex('users').where({ id: id }).del();
  }

  async getUsers(data: {
    page: number;
    limit: number;
    q?: string;
    role?: string;
    roleId?: string;
  }): Promise<PaginatedResult<IUser>> {
    const { page, limit, q, role, roleId } = data;

    const baseQuery = this.knex('users as u')
      .leftJoin('user_roles as ur', 'u.id', 'ur.user_id')
      .leftJoin('roles as r', 'ur.role_id', 'r.id');

    // Apply filters
    if (q) {
      baseQuery.where((qb) => {
        qb.whereILike('u.email', `%${q}%`)
          .orWhereILike('u.first_name', `%${q}%`)
          .orWhereILike('u.last_name', `%${q}%`);
      });
    }

    if (role) {
      baseQuery.andWhereILike('r.name', `%${role}%`);
    }

    if (roleId) {
      baseQuery.andWhere('r.id', roleId);
    }

    // total count
    const totalQuery = baseQuery.clone().countDistinct('u.id as count').first();

    // users query
    const usersQuery = this.baseUserWithRolesQuery()
      .modify((qb) => {
        if (q) {
          qb.where((subQb) => {
            subQb
              .whereILike('u.email', `%${q}%`)
              .orWhereILike('u.first_name', `%${q}%`)
              .orWhereILike('u.last_name', `%${q}%`);
          });
        }

        if (role) {
          qb.andWhereILike('r.name', `%${role}%`);
        }

        if (roleId) {
          qb.andWhere('r.id', roleId);
        }
      })
      .orderBy('u.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const [users, totalResult]: any = await Promise.all([
      usersQuery,
      totalQuery,
    ]);

    const total = Number(totalResult?.count || 0);

    return {
      items: this.usersMapper.sanitizeUsers(users),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getRoles() {
    return await this.knex('roles')
      .select('id', 'name', 'description')
      .whereNotIn('name', ['super_admin']);
  }

  private baseUserWithRolesQuery() {
    return this.knex('users as u')
      .leftJoin('user_roles as ur', 'u.id', 'ur.user_id')
      .leftJoin('roles as r', 'ur.role_id', 'r.id')
      .select(
        'u.id',
        'u.first_name',
        'u.last_name',
        'u.email',
        'u.phone_number',
        'u.avatar_url',
        'u.password_hash',
        'u.failed_attempts',
        'u.locked_until',
        'u.last_login_at',
        'u.is_active',
        'u.is_email_verified',
        'u.added_by',
        'u.location_type',
        'u.location_code',
        'u.location_name',
        'u.county_code',
        'u.county_name',
        'u.constituency_code',
        'u.constituency_name',
        'u.locality_code',
        'u.locality_name',
        'u.location_raw',
        'u.created_at',
        this.knex.raw(`
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', r.id,
              'name', r.name
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) as roles
      `),
      )
      .groupBy('u.id');
  }
}