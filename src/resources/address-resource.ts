import type { HttpClient } from '../client/http-client.js';
import type { Address, CreateAddressRequest, UpdateAddressRequest } from '../types/address.js';
import {
  ListAddressesRequest,
  CreateAddressRequest as CreateAddressReq,
  GetAddressRequest,
  UpdateAddressRequest as UpdateAddressReq,
  DeleteAddressRequest,
} from '../requests/addresses/index.js';

/**
 * Address resource for managing email addresses
 */
export class AddressResource {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * List all addresses for the authenticated user
   */
  async list(): Promise<Address[]> {
    const request = new ListAddressesRequest();
    const requestOptions = request.getRequestOptions();
    const response = await this.httpClient.request<{ data: any[] }>(requestOptions);
    return request.transformResponse(response);
  }

  /**
   * Create a new email address
   */
  async create(params: CreateAddressRequest): Promise<Address>;
  async create(webhookUrl: string, isPermanent?: boolean): Promise<Address>;
  async create(
    paramsOrWebhookUrl: CreateAddressRequest | string,
    isPermanent: boolean = true
  ): Promise<Address> {
    const params = typeof paramsOrWebhookUrl === 'string' 
      ? { webhookUrl: paramsOrWebhookUrl, isPermanent }
      : paramsOrWebhookUrl;

    const request = new CreateAddressReq(params);
    const requestOptions = request.getRequestOptions();
    const response = await this.httpClient.request<{ data: any }>(requestOptions);
    return request.transformResponse(response);
  }

  /**
   * Get a specific address by ID
   */
  async get(addressId: string): Promise<Address> {
    const request = new GetAddressRequest(addressId);
    const requestOptions = request.getRequestOptions();
    const response = await this.httpClient.request<{ data: any }>(requestOptions);
    return request.transformResponse(response);
  }

  /**
   * Update an existing address
   */
  async update(addressId: string, params: UpdateAddressRequest): Promise<Address> {
    const request = new UpdateAddressReq(addressId, params);
    const requestOptions = request.getRequestOptions();
    const response = await this.httpClient.request<{ data: any }>(requestOptions);
    return request.transformResponse(response);
  }

  /**
   * Delete an address
   */
  async delete(addressId: string): Promise<void> {
    const request = new DeleteAddressRequest(addressId);
    const requestOptions = request.getRequestOptions();
    await this.httpClient.request(requestOptions);
  }

  /**
   * Enable an address
   */
  async enable(addressId: string): Promise<Address> {
    return this.update(addressId, { isEnabled: true });
  }

  /**
   * Disable an address
   */
  async disable(addressId: string): Promise<Address> {
    return this.update(addressId, { isEnabled: false });
  }

  /**
   * Update webhook URL for an address
   */
  async updateWebhookUrl(addressId: string, webhookUrl: string): Promise<Address> {
    return this.update(addressId, { webhookUrl });
  }
}