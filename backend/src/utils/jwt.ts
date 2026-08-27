import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JwtPayload, AuthTokens } from '../types/index.js';

export const generateAccessToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: '1d' } // 1 day access token
  );
};

export const generateRefreshToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
};

export const generateAuthTokens = (userId: string, email: string): AuthTokens => {
  return {
    accessToken: generateAccessToken(userId, email),
    refreshToken: generateRefreshToken(userId, email),
    expiresIn: '1d'
  };
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};
