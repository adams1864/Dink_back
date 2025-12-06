DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
		CREATE TYPE product_status AS ENUM ('published', 'unpublished', 'archived');
	END IF;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bundle_status') THEN
		CREATE TYPE bundle_status AS ENUM ('published', 'unpublished');
	END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = CURRENT_TIMESTAMP;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS "products" (
	"id" BIGSERIAL PRIMARY KEY,
	"name" VARCHAR(255) NOT NULL,
	"description" TEXT,
	"category" VARCHAR(100) DEFAULT '',
	"size" VARCHAR(50) DEFAULT '',
	"gender" VARCHAR(50) DEFAULT '',
	"color" VARCHAR(100) DEFAULT '',
	"price" NUMERIC(10, 2) NOT NULL,
	"stock" INTEGER NOT NULL DEFAULT 0,
	"status" product_status NOT NULL DEFAULT 'unpublished',
	"cover_image" VARCHAR(255) DEFAULT '',
	"image_1" VARCHAR(255) DEFAULT '',
	"image_2" VARCHAR(255) DEFAULT '',
	"created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bundles" (
	"id" SERIAL PRIMARY KEY,
	"title" VARCHAR(255) NOT NULL,
	"description" TEXT,
	"status" bundle_status NOT NULL DEFAULT 'unpublished',
	"cover_image" VARCHAR(255) DEFAULT '',
	"created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER bundles_set_updated_at
BEFORE UPDATE ON "bundles"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS "orders" (
	"id" SERIAL PRIMARY KEY,
	"order_number" VARCHAR(64) NOT NULL,
	"customer_name" VARCHAR(255) NOT NULL,
	"customer_email" VARCHAR(255) NOT NULL,
	"status" VARCHAR(50) DEFAULT 'pending',
	"total_cents" INTEGER DEFAULT 0,
	"notes" TEXT,
	"created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS orders_order_number_idx ON "orders" ("order_number");

CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON "orders"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS "bundle_products" (
	"bundle_id" INTEGER NOT NULL,
	"product_id" BIGINT NOT NULL,
	CONSTRAINT bundle_products_pk PRIMARY KEY ("bundle_id", "product_id"),
	CONSTRAINT bundle_products_bundle_id_fk FOREIGN KEY ("bundle_id") REFERENCES "bundles" ("id") ON DELETE CASCADE,
	CONSTRAINT bundle_products_product_id_fk FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS bundle_products_bundle_idx ON "bundle_products" ("bundle_id");
CREATE INDEX IF NOT EXISTS bundle_products_product_idx ON "bundle_products" ("product_id");
