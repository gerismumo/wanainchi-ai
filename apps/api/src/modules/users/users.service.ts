import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository';
import { IUser, UserPayload } from './types/user.types';
import { UsersMapper } from './users.mapper';
import { MailService } from '../mail/mail.service';
import { UpdateUserDto, UserDto } from './dto/auth.dto';
import { APP_CONSTANTS } from 'src/common/config/constants.config';
import { StorageUpload } from '../storage/storage.upload';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly usersMapper: UsersMapper,
    private mailService: MailService,
    private upload: StorageUpload,
    private storageService: StorageService,
  ) {}

  async findByRoles(roleNames: string[]): Promise<IUser[]> {
    return this.usersRepo.findByRoles(roleNames);
  }

  async findById(id: string): Promise<IUser | null> {
    const result = await this.usersRepo.findById(id);

    return result;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const result = await this.usersRepo.findByEmail(email);

    return result;
  }

  async findByEmailPublic(email: string): Promise<IUser> {
    const result = await this.usersRepo.findByEmail(email);

    if (!result) {
      throw new BadRequestException('user was not found');
    }

    return result;
  }

  async createUser(
    data: UserDto & { country: string },
    avatar?: Express.Multer.File,
  ) {
    const {
      first_name,
      last_name,
      email,
      password,
      phone_number,
      is_active,
      roles,
      country,
    } = data;

    // 1. check email exists
    const existing = await this.usersRepo.findByEmail(email);
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    // 2. validate roles exist
    const dbRoles = await this.usersRepo.getRolesByIds(roles);

    if (dbRoles.length !== roles.length) {
      throw new BadRequestException('One or more roles are invalid');
    }

    const totalUsers = await this.usersRepo.findTotalUsers();

    if (totalUsers === 20) {
      throw new ConflictException('maximum total of users reached');
    }

    let avatar_url: string | null = null;
    try {
      // 3. upload avatar first
      if (avatar) {
        avatar_url = await this.upload.handleUsersImageUpload(avatar);
      }

      const password_hash = await bcrypt.hash(password, 12);

      // 4. create user
      const user = await this.usersRepo.createUserWithRoles({
        first_name,
        last_name,
        email,
        password_hash,
        phone_number,
        is_active,
        country,
        avatar_url,
        role_ids: roles,
      });

      const fullUser = await this.usersRepo.findById(user.id);

      if (!fullUser) {
        throw new InternalServerErrorException('User creation failed');
      }

      return {
        user: {
          id: fullUser.id,
          email: fullUser.email,
          avatar_url: fullUser.avatar_url,
          roles: fullUser.roles.map((r) => r.name),
        },
      };
    } catch (error) {
      // rollback uploaded image
      if (avatar_url) {
        await this.storageService.delete(avatar_url);
      }

      throw error;
    }
  }

  async updateUser(
    userId: string,
    data: UpdateUserDto,
    avatar?: Express.Multer.File,
  ) {
    const user = await this.usersRepo.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.email) {
      const existingUser = await this.usersRepo.findByEmail(data.email);

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Email is already in use');
      }
    }

    // 1. validate roles if provided
    if (data.roles?.length) {
      const roles = await this.usersRepo.getRolesByIds(data.roles);

      if (roles.length !== data.roles.length) {
        throw new BadRequestException('One or more roles are invalid');
      }
    }

    let newAvatarUrl: string | null = null;

    try {
      // upload new avatar
      if (avatar) {
        newAvatarUrl = await this.upload.handleUsersImageUpload(avatar);

        data.avatar_url = newAvatarUrl;
      }

      const updated = await this.usersRepo.updateUserWithRoles(userId, data);

      // delete old avatar AFTER successful update
      if (newAvatarUrl && user.avatar_url) {
        await this.storageService.delete(user.avatar_url);
      }

      return {
        user: updated,
      };
    } catch (error) {
      // rollback newly uploaded image
      if (newAvatarUrl) {
        await this.storageService.delete(newAvatarUrl);
      }

      throw error;
    }
  }

  async updatePassword(userId: string, password: string) {
    const user = await this.findById(userId);

    if (!user || !user.password_hash) {
      throw new BadRequestException('user not found');
    }

    const valid = await this.validatePassword(password, user.password_hash);

    if (valid) {
      throw new ConflictException(
        'New password must be different from your current password.',
      );
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await this.usersRepo.updatePassword(userId, password_hash);

    this.mailService
      .sendPasswordChangedEmail({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
      })
      .catch((err) => {
        console.error('Password email failed:', err);
      });

    return result;
  }

  async validatePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async validatePin(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async deleteuser({ id }: { id: string }) {
    //handle authentication here

    const user = await this.findById(id);

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('user not found');
    }

    // if (!user.is_active) {
    //   throw new UnauthorizedException('User not active');
    // }

    if (user.failed_attempts >= APP_CONSTANTS.MAX_FAILED_ATTEMPTS) {
      throw new UnauthorizedException(
        'Too many failed authentication attempts. Please reset your password to delete your account.',
      );
    }

    await this.usersRepo.deleteUser(id);
  }

  async getUsers(data: {
    page: number;
    limit: number;
    q?: string;
    role?: string;
    roleId?: string;
  }) {
    const { page, limit, q, role, roleId } = data;

    const search = q?.trim() || '';

    const result = await this.usersRepo.getUsers({
      page,
      limit,
      q: search,
      role,
      roleId,
    });

    return result;
  }

  async getRoles() {
    return await this.usersRepo.getRoles();
  }
}
