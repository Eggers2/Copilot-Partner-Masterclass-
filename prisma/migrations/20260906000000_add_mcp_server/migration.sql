-- MCP-Server für Claude: OAuth-Clients, Auth-Codes, Tokens (nur Hashes) und Audit-Log

CREATE TABLE "mcp_clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" TEXT NOT NULL,
    "name" TEXT,
    "redirect_uris" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mcp_clients_client_id_key" ON "mcp_clients"("client_id");

CREATE TABLE "mcp_auth_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code_hash" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "code_challenge" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_auth_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mcp_auth_codes_code_hash_key" ON "mcp_auth_codes"("code_hash");

ALTER TABLE "mcp_auth_codes" ADD CONSTRAINT "mcp_auth_codes_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "mcp_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mcp_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "access_token_hash" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "access_expires_at" TIMESTAMP(3) NOT NULL,
    "refresh_expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mcp_tokens_access_token_hash_key" ON "mcp_tokens"("access_token_hash");
CREATE UNIQUE INDEX "mcp_tokens_refresh_token_hash_key" ON "mcp_tokens"("refresh_token_hash");
CREATE INDEX "mcp_tokens_client_id_idx" ON "mcp_tokens"("client_id");

ALTER TABLE "mcp_tokens" ADD CONSTRAINT "mcp_tokens_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "mcp_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mcp_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_id" UUID,
    "tool" TEXT NOT NULL,
    "args" JSONB,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "duration_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mcp_audit_logs_created_at_idx" ON "mcp_audit_logs"("created_at");

ALTER TABLE "mcp_audit_logs" ADD CONSTRAINT "mcp_audit_logs_token_id_fkey"
    FOREIGN KEY ("token_id") REFERENCES "mcp_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
