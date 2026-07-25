import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { parseDurationToSeconds } from '../common/utils/duration.util';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueTokens(
    userId: string,
    email: string,
  ): Promise<AuthResponseDto> {
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    const accessExpiresIn = this.config.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    const refreshExpiresIn = this.config.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      { secret: accessSecret, expiresIn: accessExpiresIn as any },
    );

    const rawRefreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(
      Date.now() + parseDurationToSeconds(refreshExpiresIn) * 1000,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawRefreshToken),
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: parseDurationToSeconds(accessExpiresIn),
    };
  }

  async login(
    email: string,
    password: string,
    meta?: { ip?: string },
  ): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const tokens = await this.issueTokens(user.id, user.email);

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        newValue: { ip: meta?.ip ?? null },
      },
    });

    return tokens;
  }

  async refresh(rawRefreshToken: string): Promise<AuthResponseDto> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Refresh token is invalid or has expired.',
      );
    }
    if (!existing.user.isActive || existing.user.deletedAt) {
      throw new UnauthorizedException('User is inactive or no longer exists.');
    }

    // Rotate: revoke the used refresh token and issue a new pair.
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(existing.user.id, existing.user.email);
  }
}
