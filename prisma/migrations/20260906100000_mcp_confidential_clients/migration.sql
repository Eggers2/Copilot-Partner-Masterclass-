-- MCP: vertrauliche OAuth-Clients. Copilot Studio und M365 Copilot verlangen bei
-- der Dynamic Client Registration ein Client-Secret; Claude bleibt Public Client.

ALTER TABLE "mcp_clients" ADD COLUMN "token_endpoint_auth_method" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "mcp_clients" ADD COLUMN "client_secret_hash" TEXT;

-- PKCE bleibt für Public Clients Pflicht; vertrauliche Clients dürfen darauf verzichten.
ALTER TABLE "mcp_auth_codes" ALTER COLUMN "code_challenge" DROP NOT NULL;
