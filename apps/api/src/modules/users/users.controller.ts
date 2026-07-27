import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService } from './users.service';
import {
  UpdatePasswordDto,
  updatePasswordSchema,
  UpdateUserDto,
  updateUserSchema,
  UserDto,
  userSchema,
} from './dto/auth.dto';
import { Roles } from 'src/common/decorators/roles.decorators';
import { APP_CONSTANTS } from 'src/common/config/constants.config';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from 'src/common/enums/roles.enums';

const avatarInterceptor = FileInterceptor('avatar', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Roles(UserRole.Admin, UserRole.SuperAdmin)
  @Patch(':id/password')
  async updatePassword(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdatePasswordDto,
    @Res() res: Response,
  ) {
    const dto = updatePasswordSchema.parse(body);

    const result = await this.service.updatePassword(id, dto.password);

    res.success(result);
  }

  @Roles(
    UserRole.Admin,
    UserRole.SuperAdmin,
    UserRole.Agent,
    UserRole.Moderator,
  )
  @Get('roles')
  async getRoles(@Res() res: Response) {
    const result = await this.service.getRoles();
    res.success(result);
  }

  @Roles(
    UserRole.Admin,
    UserRole.SuperAdmin,
    UserRole.Agent,
    UserRole.Moderator,
  )
  @Get(':id')
  async getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const result = await this.service.findById(id);

    if (!result) {
      return null;
    }

    const { password_hash, ...userWithoutPassword } = result;

    res.success(userWithoutPassword);
  }

  @Roles(UserRole.Admin, UserRole.SuperAdmin)
  @Post()
  @UseInterceptors(avatarInterceptor)
  async createUser(
    @Req() req: Request,
    @Body() body: UserDto,
    @Res() res: Response,
    @UploadedFile() avatar: Express.Multer.File | undefined,
  ) {
    const dto = userSchema.parse(body);

    const result = await this.service.createUser(
      {
        ...dto,
        ...{ country: req.clientCountry ?? 'KE' },
      },
      avatar,
    );

    res.success(result);
  }

  @Roles(UserRole.Admin, UserRole.SuperAdmin)
  @Patch(':id')
  @UseInterceptors(avatarInterceptor)
  async updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @Res() res: Response,
    @UploadedFile() avatar: Express.Multer.File | undefined,
  ) {
    const dto = updateUserSchema.parse(body);

    const result = await this.service.updateUser(id, dto, avatar);

    res.success(result);
  }

  @Roles(UserRole.Admin, UserRole.SuperAdmin, UserRole.Moderator, UserRole.Agent)
  @Get()
  async getUsers(
    @Query('page') page = '1',
    @Res() res: Response,
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('roleId') roleId?: string,
  ) {
    const result = await this.service.getUsers({
      page: Number(page),
      limit: APP_CONSTANTS.PAGINATION.MAX_LIMIT,
      q,
      role,
      roleId,
    });

    res.success(result);
  }

  @Roles(UserRole.Admin, UserRole.SuperAdmin)
  @Delete(':id')
  async deleteUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.service.deleteuser({
      id,
    });

    return res.success(result, 'Account Deleted Succesful');
  }
}
