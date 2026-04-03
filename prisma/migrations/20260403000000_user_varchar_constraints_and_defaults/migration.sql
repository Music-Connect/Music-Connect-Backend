-- AlterTable: add VARCHAR constraints to name and image
ALTER TABLE "users" ALTER COLUMN "name" TYPE VARCHAR(100);
ALTER TABLE "users" ALTER COLUMN "image" TYPE VARCHAR(500);

-- AlterTable: convert nullable profile fields to non-null with empty string default
-- Step 1: fill existing NULLs before adding NOT NULL constraint
UPDATE "users" SET "telefone" = '' WHERE "telefone" IS NULL;
UPDATE "users" SET "descricao" = '' WHERE "descricao" IS NULL;
UPDATE "users" SET "cidade" = '' WHERE "cidade" IS NULL;
UPDATE "users" SET "estado" = '' WHERE "estado" IS NULL;

-- Step 2: apply NOT NULL + DEFAULT + VARCHAR type
ALTER TABLE "users"
  ALTER COLUMN "telefone" SET NOT NULL,
  ALTER COLUMN "telefone" SET DEFAULT '',
  ALTER COLUMN "telefone" TYPE VARCHAR(20);

ALTER TABLE "users"
  ALTER COLUMN "descricao" SET NOT NULL,
  ALTER COLUMN "descricao" SET DEFAULT '',
  ALTER COLUMN "descricao" TYPE VARCHAR(1000);

ALTER TABLE "users"
  ALTER COLUMN "cidade" SET NOT NULL,
  ALTER COLUMN "cidade" SET DEFAULT '',
  ALTER COLUMN "cidade" TYPE VARCHAR(100);

ALTER TABLE "users"
  ALTER COLUMN "estado" SET NOT NULL,
  ALTER COLUMN "estado" SET DEFAULT '',
  ALTER COLUMN "estado" TYPE VARCHAR(2);
