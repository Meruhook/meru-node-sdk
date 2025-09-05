import type { RequestOptions } from '../../types/client.js';
import { InputValidator } from '../../security/input-validator.js';
import { ValidationException } from '../../exceptions/index.js';

/**
 * Request to delete an address with input validation
 */
export class DeleteAddressRequest {
  constructor(private readonly addressId: string) {
    this.validateAddressId();
  }

  getRequestOptions(): RequestOptions {
    return {
      method: 'DELETE',
      endpoint: `/api/addresses/${this.addressId}`,
    };
  }

  private validateAddressId(): void {
    const validation = InputValidator.validateUuid(this.addressId, 'Address ID');
    if (!validation.isValid) {
      throw new ValidationException(`Delete address validation failed: ${validation.errors.join(', ')}`);
    }
  }
}