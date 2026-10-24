ALTER TABLE "push_devices"
ADD COLUMN "installation_hash" CHAR(64);

CREATE UNIQUE INDEX "push_devices_installation_hash_key"
ON "push_devices"("installation_hash");
