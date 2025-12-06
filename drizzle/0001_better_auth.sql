-- Better Auth schema for PostgreSQL

CREATE TABLE IF NOT EXISTS "users" (
  "id" VARCHAR(64) PRIMARY KEY,
  "email" VARCHAR(191) NOT NULL,
  "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "password_hash" VARCHAR(255),
  "name" VARCHAR(255),
  "image" VARCHAR(255),
  "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON "users" ("email");

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS "user_emails" (
  "id" VARCHAR(64) PRIMARY KEY,
  "user_id" VARCHAR(64) NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "email" VARCHAR(191) NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS user_emails_user_idx ON "user_emails" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS user_emails_email_unique ON "user_emails" ("email");

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id" VARCHAR(64) PRIMARY KEY,
  "user_id" VARCHAR(64) NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "token" VARCHAR(191) NOT NULL,
  "expires_at" TIMESTAMP WITHOUT TIME ZONE,
  "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_active" TIMESTAMP WITHOUT TIME ZONE,
  "ip_address" VARCHAR(191),
  "user_agent" VARCHAR(255),
  "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_token_unique ON "user_sessions" ("token");
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON "user_sessions" ("user_id");

CREATE TRIGGER user_sessions_set_updated_at
BEFORE UPDATE ON "user_sessions"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" VARCHAR(64) PRIMARY KEY,
  "user_id" VARCHAR(64) NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "provider_id" VARCHAR(64) NOT NULL,
  "account_id" VARCHAR(128) NOT NULL,
  "access_token" VARCHAR(512),
  "refresh_token" VARCHAR(512),
  "access_token_expires_at" TIMESTAMP WITHOUT TIME ZONE,
  "refresh_token_expires_at" TIMESTAMP WITHOUT TIME ZONE,
  "scope" VARCHAR(255),
  "id_token" VARCHAR(512),
  "password" VARCHAR(255),
  "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_account_unique
  ON "accounts" ("provider_id", "account_id");
CREATE INDEX IF NOT EXISTS accounts_user_idx ON "accounts" ("user_id");

CREATE TRIGGER accounts_set_updated_at
BEFORE UPDATE ON "accounts"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS "email_verifications" (
  "id" VARCHAR(64) PRIMARY KEY,
  "identifier" VARCHAR(191) NOT NULL,
  "value" VARCHAR(255) NOT NULL,
  "expires_at" TIMESTAMP WITHOUT TIME ZONE,
  "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS email_verifications_identifier_idx
  ON "email_verifications" ("identifier");

CREATE TRIGGER email_verifications_set_updated_at
BEFORE UPDATE ON "email_verifications"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
