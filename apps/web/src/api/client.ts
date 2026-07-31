import { createApiClient, type ApiClient } from "@pixelanea/api-client";

let client: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!client) {
    client = createApiClient();
  }
  return client;
}
