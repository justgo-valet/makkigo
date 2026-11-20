import { Card, CardContent } from "@makkigo/ui/components/ui/card";

import PageHeader from "@/features/common/PageHeader";
import MerchantForm from "@/features/merchants/MerchantForm";
import { requireAdminPage } from "@/server/auth/adminSession";

export default async function NewMerchantPage() {
  await requireAdminPage("/merchants/new");

  return (
    <>
      <PageHeader title="업체 추가" description="카카오 장소를 골라 채우거나 직접 입력하세요. 사진 · QR 은 추가한 뒤 상세 화면에서 관리합니다." />
      <Card className="max-w-3xl">
        <CardContent>
          <MerchantForm />
        </CardContent>
      </Card>
    </>
  );
}
