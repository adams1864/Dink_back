-- Migration: Extend products and orders tables for shop integration
-- Add new product fields: sku, material, weight, fit, features, is_new, is_best_seller
ALTER TABLE "products" ADD COLUMN "sku" varchar(100);
ALTER TABLE "products" ADD COLUMN "material" varchar(255);
ALTER TABLE "products" ADD COLUMN "weight" varchar(100);
ALTER TABLE "products" ADD COLUMN "fit" varchar(100);
ALTER TABLE "products" ADD COLUMN "features" text;
ALTER TABLE "products" ADD COLUMN "is_new" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN "is_best_seller" boolean DEFAULT false;

-- Add new order fields: customer_phone, selected_size, selected_color, delivery_preferences
ALTER TABLE "orders" ADD COLUMN "customer_phone" varchar(20) NOT NULL DEFAULT '';
ALTER TABLE "orders" ADD COLUMN "selected_size" varchar(50);
ALTER TABLE "orders" ADD COLUMN "selected_color" varchar(50);
ALTER TABLE "orders" ADD COLUMN "delivery_preferences" text;

-- Remove default constraint from customer_phone after adding it
ALTER TABLE "orders" ALTER COLUMN "customer_phone" DROP DEFAULT;
