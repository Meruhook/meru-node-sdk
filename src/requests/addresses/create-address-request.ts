import type { RequestOptions, ApiResponse } from '../../types/client.js';
import type { AddressData, CreateAddressRequest as CreateAddressParams } from '../../types/address.js';
import { transformAddress } from '../../utils/transformers.js';
import type { Address } from '../../types/address.js';
import { InputValidator } from '../../security/input-validator.js';
import { ValidationException } from '../../exceptions/index.js';

/**
 * Request to create a new email address with input validation
 */
export class CreateAddressRequest {
  constructor(private readonly params: CreateAddressParams) {
    this.validateParams();
  }

  getRequestOptions(): RequestOptions {
    return {
      method: 'POST',
      endpoint: '/api/addresses',
      body: {
        webhook_url: this.params.webhookUrl,
        is_permanent: this.params.isPermanent ?? true,
      },
    };
  }

  private validateParams(): void {
    const errors: string[] = [];

    // Validate webhook URL
    const webhookValidation = InputValidator.validateWebhookUrl(
      this.params.webhookUrl,
      { allowHttp: process.env.NODE_ENV === 'development' }
    );
    if (!webhookValidation.isValid) {
      errors.push(...webhookValidation.errors);
    }

    // Validate isPermanent if provided
    if (this.params.isPermanent !== undefined && typeof this.params.isPermanent !== 'boolean') {
      errors.push('isPermanent must be a boolean value');
    }

    if (errors.length > 0) {
      throw new ValidationException(`Create address validation failed: ${errors.join(', ')}`);
    }
  }

  transformResponse(response: ApiResponse<{ data: AddressData }>): Address {
    return transformAddress(response.data.data);
  }
}