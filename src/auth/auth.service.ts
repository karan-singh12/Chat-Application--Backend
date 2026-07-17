import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import { MESSAGES } from '../common/constants/messages.constant';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
    return this.jwtService.sign(payload);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async signup(signupDto: SignupDto) {
    const { email, password, username, role, avatar } = signupDto;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestException(MESSAGES.auth.emailExists);
    }

    const hashedPassword = await this.hashPassword(password);

    let assignedRole: Role = Role.USER;
    if (role?.toUpperCase() === 'ADMIN') {
      assignedRole = Role.ADMIN;
    }

    const user = await this.prisma.user.create({
      data: {
        email:    email.toLowerCase(),
        password: hashedPassword,
        username: username || null,
        role:     assignedRole,
        avatar:   avatar || null,
      },
    });

    const token = await this.generateToken({
      userId:   user.id,
      email:    user.email,
      role:     user.role,
      username: user.username || undefined,
    });

    return {
      message: MESSAGES.auth.signupSuccess,
      data: {
        token,
        user: {
          id:       user.id,
          email:    user.email,
          username: user.username,
          role:     user.role,
          bio:      user.bio,
          phone:    user.phone,
          location: user.location,
          avatar:   user.avatar,
        },
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException(MESSAGES.auth.invalidCredentials);
    }

    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(MESSAGES.auth.invalidCredentials);
    }

    const token = await this.generateToken({
      userId:   user.id,
      email:    user.email,
      role:     user.role,
      username: user.username || undefined,
    });

    return {
      message: MESSAGES.auth.loginSuccess,
      data: {
        token,
        user: {
          id:       user.id,
          email:    user.email,
          username: user.username,
          role:     user.role,
          bio:      user.bio,
          phone:    user.phone,
          location: user.location,
          avatar:   user.avatar,
        },
      },
    };
  }
}
