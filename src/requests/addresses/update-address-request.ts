import type { RequestOptions, ApiResponse } from '../../types/client.js';
import type { AddressData, UpdateAddressRequest as UpdateAddressParams } from '../../types/address.js';
import { transformAddress } from '../../utils/transformers.js';
import type { Address } from '../../types/address.js';
import { InputValidator } from '../../security/input-validator.js';
import { ValidationException } from '../../exceptions/index.js';

/**
 * Request to update an existing address with input validation
 */
export class UpdateAddressRequest {
  constructor(
    private readonly addressId: string,
    private readonly params: UpdateAddressParams
  ) {
    this.validateParams();
  }

  getRequestOptions(): RequestOptions {
    const body: Record<string, unknown> = {};

    if (this.params.webhookUrl !== undefined) {
      body.webhook_url = this.params.webhookUrl;
    }

    if (this.params.isEnabled !== undefined) {
      body.is_enabled = this.params.isEnabled;
    }

    return {
      method: 'PATCH',
      endpoint: `/api/addresses/${this.addressId}`,
      body,
    };
  }

  private validateParams(): void {
    const errors: string[] = [];

    // Validate address ID
    const addressIdValidation = InputValidator.validateUuid(this.addressId, 'Address ID');
    if (!addressIdValidation.isValid) {
      errors.push(...addressIdValidation.errors);
    }

    // Validate webhook URL if provided
    if (this.params.webhookUrl !== undefined) {
      const webhookValidation = InputValidator.validateWebhookUrl(
        this.params.webhookUrl,
        { 
          allowHttp: process.env.NODE_ENV === 'development',
          required: false // Allow empty string to disable webhook
        }
      );
      if (!webhookValidation.isValid) {
        errors.push(...webhookValidation.errors);
      }
    }

    // Validate isEnabled if provided
    if (this.params.isEnabled !== undefined && typeof this.params.isEnabled !== 'boolean') {
      errors.push('isEnabled must be a boolean value');
    }

    if (errors.length > 0) {
      throw new ValidationException(`Update address validation failed: ${errors.join(', ')}`);
    }
  }

  transformResponse(response: ApiResponse<{ data: AddressData }>): Address {
    return transformAddress(response.data.data);
  }
}