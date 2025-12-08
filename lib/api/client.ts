import { AppError, ERR } from '@/lib/utils/errors';

/**
 * Standard API response format from backend
 */
type ApiResponse<T> = {
  data: T;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

/**
 * Centralized API client for all HTTP requests.
 * 
 * Provides consistent error handling, type safety, and request/response formatting
 * across all features in the application.
 * 
 * @example
 * ```typescript
 * // GET request
 * const { data } = await apiClient.get<Product>('/api/products/123');
 * 
 * // POST request
 * const { data } = await apiClient.post<Product>('/api/products', {
 *   name: 'New Product',
 *   price: 100,
 * });
 * ```
 */
class ApiClient {
  /**
   * Makes an HTTP request with standardized error handling
   * 
   * @param url - API endpoint URL
   * @param init - Fetch request options
   * @returns Promise resolving to typed data and metadata
   * @throws {AppError} When request fails or returns error response
   */
  private async request<T>(
    url: string,
    init?: RequestInit
  ): Promise<{ data: T; meta: Record<string, unknown> | null }> {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    let payload: ApiResponse<T>;
    
    try {
      payload = await response.json();
    } catch (error) {
      throw new AppError(
        ERR.SERVER_ERROR.statusCode,
        error instanceof Error ? error.message : 'Unexpected response from server'
      );
    }

    // Payload is guaranteed to be non-null here due to try-catch above
    if (!response.ok || payload.error) {
      throw new AppError(
        payload.error?.code ?? response.status,
        payload.error?.message ?? 'Request failed'
      );
    }

    return {
      data: payload.data,
      meta: payload.meta ?? null,
    };
  }

  /**
   * Performs a GET request
   * 
   * @param url - API endpoint URL
   * @param params - Optional query parameters
   * @returns Promise resolving to typed response data and metadata
   * 
   * @example
   * ```typescript
   * const { data, meta } = await apiClient.get<ProductList>(
   *   '/api/products',
   *   { status: 'active', page: '1' }
   * );
   * ```
   */
  async get<T>(
    url: string,
    params?: Record<string, string>
  ): Promise<{ data: T; meta: Record<string, unknown> | null }> {
    const searchParams = new URLSearchParams(params);
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    return this.request<T>(fullUrl);
  }

  /**
   * Performs a POST request
   * 
   * @param url - API endpoint URL
   * @param body - Request body data
   * @returns Promise resolving to typed response data and metadata
   * 
   * @example
   * ```typescript
   * const { data } = await apiClient.post<Product>('/api/products', {
   *   name: 'Coffee',
   *   price: 25000,
   * });
   * ```
   */
  async post<T>(
    url: string,
    body?: unknown
  ): Promise<{ data: T; meta: Record<string, unknown> | null }> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Performs a PATCH request
   * 
   * @param url - API endpoint URL
   * @param body - Request body data (partial update)
   * @returns Promise resolving to typed response data and metadata
   * 
   * @example
   * ```typescript
   * const { data } = await apiClient.patch<Product>('/api/products/123', {
   *   price: 30000,
   * });
   * ```
   */
  async patch<T>(
    url: string,
    body?: unknown
  ): Promise<{ data: T; meta: Record<string, unknown> | null }> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * Performs a PUT request
   * 
   * @param url - API endpoint URL
   * @param body - Request body data (full replacement)
   * @returns Promise resolving to typed response data and metadata
   * 
   * @example
   * ```typescript
   * const { data } = await apiClient.put<Product>('/api/products/123', {
   *   name: 'Updated Coffee',
   *   price: 30000,
   *   isActive: true,
   * });
   * ```
   */
  async put<T>(
    url: string,
    body?: unknown
  ): Promise<{ data: T; meta: Record<string, unknown> | null }> {
    return this.request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * Performs a DELETE request
   * 
   * @param url - API endpoint URL
   * @returns Promise resolving to typed response data and metadata
   * 
   * @example
   * ```typescript
   * const { data } = await apiClient.delete<{ success: boolean }>(
   *   '/api/products/123'
   * );
   * ```
   */
  async delete<T>(
    url: string
  ): Promise<{ data: T; meta: Record<string, unknown> | null }> {
    return this.request<T>(url, {
      method: 'DELETE',
    });
  }
}

/**
 * Singleton instance of ApiClient
 * 
 * Use this for all API calls throughout the application.
 * Do NOT create new instances of ApiClient.
 * 
 * @example
 * ```typescript
 * import { apiClient } from '@/lib/api/client';
 * 
 * export async function listProducts(filters: ProductFilters) {
 *   const { data, meta } = await apiClient.get<ProductListResponse>(
 *     '/api/products',
 *     filters as Record<string, string>
 *   );
 *   return { items: data.items, meta };
 * }
 * ```
 */
export const apiClient = new ApiClient();
