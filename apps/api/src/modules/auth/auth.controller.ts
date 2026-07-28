import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import {
  ForgotDto,
  forgotSchema,
  LoginDto,
  loginSchema,
  ResetDto,
  resetSchema,
  SignupDto,
  signupSchema,
} from './dto/auth.dto';
import { Request, Response } from 'express';
import { Authservice } from './auth.service';
import { Public, Roles } from 'src/common/decorators/roles.decorators';
import { UserRole } from 'src/common/enums/roles.enums';
import { SkipRateLimit } from 'src/common/decorators/rate-limit.decorator';

@SkipRateLimit()
@Controller('auth')
export class AuthController {
  constructor(private service: Authservice) {}

  @Public()
  @Post('login')
  async login(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: LoginDto,
  ) {
    const dto = loginSchema.parse(body);

    const result = await this.service.login({
      email: dto.email,
      password: dto.password,
      ip: req.clientIp,
      country: req.clientCountry,
      userAgent: req.headers['user-agent'],
    });

    return res.success(result, 'Login successful');
  }

  // @Public()
  // @Post('signup')
  // async signup(
  //   @Req() req: Request,
  //   @Res() res: Response,
  //   @Body() body: SignupDto,
  // ) {
  //   const dto = signupSchema.parse(body);

  //   const result = await this.service.signup({
  //     firstName: dto.firstName,
  //     lastName: dto.lastName,
  //     email: dto.email,
  //     password: dto.password,
  //     country: req.clientCountry,
  //     ip: req.clientIp,
  //   });

  //   return res.success(result, 'account created successful');
  // }

  //send generated pin to user

  @Public()
  @Post('forgot')
  async requestReset(
    @Req() req: Request,
    @Res() res: Response,
    @Body()
    body: ForgotDto,
  ) {
    const dto = forgotSchema.parse(body);
    const result = await this.service.requestReset(dto);

    return res.success(result, 'Reset link send successful');
  }

  @Public()
  @Post('reset')
  async confirmReset(
    @Res() res: Response,
    @Body()
    body: ResetDto,
  ) {
    const dto = resetSchema.parse(body);
    const result = await this.service.confirmReset(dto);

    const responseMessage ='Password was reset successful'


    return res.success(result, responseMessage);
  }

  @Roles(UserRole.SuperAdmin, UserRole.Admin, UserRole.User)
  @Get('profile')
  getProfile(@Req() req: Request, @Res() res: Response) {
    const user = req.user;
    return res.success(user, 'ok');
  }
}
