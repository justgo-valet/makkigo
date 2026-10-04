-- CreateTable
CREATE TABLE "car_brands" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT NOT NULL,

    CONSTRAINT "car_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_models" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "brand_id" INTEGER NOT NULL,

    CONSTRAINT "car_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "car_brands_name_key" ON "car_brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "car_models_name_brand_id_key" ON "car_models"("name", "brand_id");

-- AddForeignKey
ALTER TABLE "car_models" ADD CONSTRAINT "car_models_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "car_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
