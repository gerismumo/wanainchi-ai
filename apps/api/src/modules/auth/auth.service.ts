import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { JwtService } from '@nestjs/jwt';
import { ForgotDto } from './dto/auth.dto';
import { MailService } from '../mail/mail.service';
import { APP_CONSTANTS } from 'src/common/config/constants.config';
import { PasswordReset } from 'knex/types/tables';
import { email } from 'zod';


@Injectable()
export class Authservice {
  constructor(
    private usersService: UsersService,
    private usersRepo: UsersRepository,
    private jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async login(data: {
    email: string;
    password: string;
    ip?: string;
    country?: string;
    userAgent?: string;
  }) {
    const { email, password, country, ip, userAgent } = data;
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('User not active');
    }

    if (user.failed_attempts >= APP_CONSTANTS.MAX_FAILED_ATTEMPTS) {
      throw new UnauthorizedException(
        'Too many failed login attempts. Please reset your password.',
      );
    }

    const valid = await this.usersService.validatePassword(
      password,
      user.password_hash,
    );

    if (!valid) {
      await this.usersRepo.recordLoginHistory({
        user_id: user.id,
        ip_address: ip ?? null,
        country: country ?? null,
        city: null,
        user_agent: userAgent || '',
        is_successful: false,
      });

      await this.usersRepo.incrementFailedAttempts(user.id);

      if (user.failed_attempts + 1 >= APP_CONSTANTS.MAX_FAILED_ATTEMPTS) {
        throw new UnauthorizedException(
          'Too many failed login attempts. Please reset your password.',
        );
      }

      throw new UnauthorizedException('Invalid password');
    }

    await this.usersRepo.recordLoginHistory({
      user_id: user.id,
      ip_address: ip || '',
      country: country || '',
      city: null,
      user_agent: userAgent || '',
      is_successful: true,
    });

    await this.usersRepo.resetFailedAttempts(user.id);
    await this.usersRepo.updateLastLogin(user.id);

    //generate auth token here
    const payload = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      roles: user.roles.map((r) => r.name),
      canSellBelowNetPrice: user.can_sell_below_net_price,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '1y',
    });

    return {
      user: payload,
      accessToken,
    };
  }

  // async signup(data: {
  //   firstName:string;
  //   lastName:string;
  //   email:string;
  //   password: string;
  //   country?: string;
  //   ip?: string;
  //   userAgent?: string;
  // }) {
  //   const { firstName, lastName, email, password, country, ip } = data;
  //   const exits = await this.usersService.findByEmail(email);

  //   if (exits) {
  //     throw new BadRequestException('user already exits');
  //   }

  //   const user = await this.usersService.createUser({
  //     first_name:firstName,
  //     last_name:lastName,
  //     email,
  //     password,
  //     country: country || "",
  //   });

  //   //generate auth token here
  //   return user;
  // }

  async requestReset(data: ForgotDto) {
    const { type, email } = data;

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 12);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

    await this.usersRepo.createResetToken({
      userId: user.id,
      tokenHash,
      type: type,
      expiresAt,
    });

    //add mailer service here if available
    await this.mailService.sendResetLink({
      email: email,
      token: rawToken,
      type,
    });

    return true;
  }

  async confirmReset(data: {
    token: string;
    newValue: string;
    email: string;
  }) {

    const user = await this.usersRepo.findByEmail(data.email)

    if(!user) {
      throw new BadRequestException("user not found")
    }
    const resets = await this.usersRepo.getUnusedResetTokens(data.email);

    let matchedReset: PasswordReset | null = null;

    for (const reset of resets) {
      const match = await bcrypt.compare(data.token, reset.token_hash);
      if (match) {
        matchedReset = reset;
        break;
      }
    }

    if (!matchedReset) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (matchedReset.expires_at < new Date()) {
      throw new BadRequestException('Token expired');
    }


      await this.usersService.updatePassword(
        matchedReset.user_id,
        data.newValue,
      );
    

    let pinPayLoad = null;

    await this.usersRepo.deleteAllResetTokensForUser(matchedReset.user_id);

    //generate new access token

    return pinPayLoad;
  }
}
