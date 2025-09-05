/**
 * User information data object
 */
export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerifiedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * API token information
 */
export interface ApiToken {
  readonly id: string;
  readonly name: string;
  readonly token: string;
  readonly abilities: string[];
  readonly expiresAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Raw user data from API response
 */
export interface UserData {
  id: string;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Raw API token data from API response
 */
export interface ApiTokenData {
  id: string;
  name: string;
  token: string;
  abilities: string[];
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * API token creation request
 */
export interface CreateApiTokenRequest {
  name: string;
  abilities?: string[];
  expiresAt?: Date;
}