import type { RequestOptions, ApiResponse } from '../../types/client.js';
import type { AddressData } from '../../types/address.js';
import { transformAddress } from '../../utils/transformers.js';
import type { Address } from '../../types/address.js';

/**
 * Request to list all addresses for the authenticated user
 */
export class ListAddressesRequest {
  getRequestOptions(): RequestOptions {
    return {
      method: 'GET',
      endpoint: '/api/addresses',
    };
  }

  transformResponse(response: ApiResponse<{ data: AddressData[] }>): Address[] {
    return response.data.data.map(transformAddress);
  }
}