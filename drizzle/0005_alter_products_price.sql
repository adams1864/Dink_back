ALTER TABLE "products"
  ALTER COLUMN "price" TYPE numeric(10, 2)
    USING "price"::numeric(10, 2);
ALTER TABLE "products"
  ALTER COLUMN "price" SET NOT NULL;
