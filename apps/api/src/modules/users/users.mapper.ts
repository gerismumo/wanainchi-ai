

import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersMapper {


  public sanitizeUser(user: any) {
    if (!user) return null;

    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  public sanitizeUsers(users: any[]) {
    return users.map((user) => this.sanitizeUser(user));
  }
}
