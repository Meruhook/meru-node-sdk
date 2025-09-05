import type { RequestOptions, ApiResponse } from '../../types/client.js';
import type { AddressData } from '../../types/address.js';
import { transformAddress } from '../../utils/transformers.js';
import type { Address } from '../../types/address.js';
import { InputValidator } from '../../security/input-validator.js';
import { ValidationException } from '../../exceptions/index.js';

/**
 * Request to get a specific address by ID with input validation
 */
export class GetAddressRequest {
  constructor(private readonly addressId: string) {
    this.validateAddressId();
  }

  getRequestOptions(): RequestOptions {
    return {
      method: 'GET',
      endpoint: `/api/addresses/${this.addressId}`,
    };
  }

  private validateAddressId(): void {
    const validation = InputValidator.validateUuid(this.addressId, 'Address ID');
    if (!validation.isValid) {
      throw new ValidationException(`Get address validation failed: ${validation.errors.join(', ')}`);
    }
  }

  transformResponse(response: ApiResponse<{ data: AddressData }>): Address {
    return transformAddress(response.data.data);
  }
}