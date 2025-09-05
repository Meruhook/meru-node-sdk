/**
 * Email address data object
 */
export interface Address {
  readonly id: string;
  readonly address: string;
  readonly webhookUrl: string | null;
  readonly isEnabled: boolean;
  readonly isPermanent: boolean;
  readonly expiresAt: Date | null;
  readonly emailCount: number;
  readonly lastReceivedAt: string | null;
  readonly isExpired: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Raw address data from API response
 */
export interface AddressData {
  id: string;
  address: string;
  webhook_url: string | null;
  is_enabled: boolean;
  is_permanent: boolean;
  expires_at: string | null;
  email_count: number;
  last_received_at: string | null;
  is_expired: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Address creation request parameters
 */
export interface CreateAddressRequest {
  webhookUrl: string;
  isPermanent?: boolean;
}

/**
 * Address update request parameters
 */
export interface UpdateAddressRequest {
  webhookUrl?: string;
  isEnabled?: boolean;
}