import { Card, CardContent, CardHeader, CardTitle } from "@makkigo/ui/components/ui/card";
import { notFound } from "next/navigation";

import { formatDateTime } from "@/features/common/formatters";
import PageHeader from "@/features/common/PageHeader";
import StatusBadge from "@/features/common/StatusBadge";
import MerchantAdminAccountActions from "@/features/merchantAdmins/MerchantAdminAccountActions";
import MerchantAdminMerchant from "@/features/merchantAdmins/MerchantAdminMerchant";
import { merchantAdminStatus } from "@/features/merchantAdmins/merchantAdminStatus";
import { requireAdminPage } from "@/server/auth/adminSession";
import { parseId } from "@/server/common/parseId";
import { readMerchantAdmin } from "@/server/merchantAdmin/merchantAdmins";

export default async function MerchantAdminPage({ params }: Readonly<{ params: Promise<{ merchantAdminId: string }> }>) {
  const { merchantAdminId: rawId } = await params;
  await requireAdminPage(`/merchant-admins/${encodeURIComponent(rawId)}`);
  const merchantAdminId = parseId(rawId);
  const merchantAdmin = merchantAdminId ? await readMerchantAdmin(merchantAdminId) : null;
  if (!merchantAdmin) notFound();

  return (
    <>
      <PageHeader title={merchantAdmin.name} description={merchantAdmin.loginId} />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>계정</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
              <dt className="text-(--tertiary-color)">상태</dt>
              <dd>
                <StatusBadge {...merchantAdminStatus(merchantAdmin, new Date())} />
              </dd>
              <dt className="text-(--tertiary-color)">만든 날</dt>
              <dd>{formatDateTime(merchantAdmin.createdAt)}</dd>
              {merchantAdmin.disabledAt && (
                <>
                  <dt className="text-(--tertiary-color)">중지한 날</dt>
                  <dd>{formatDateTime(merchantAdmin.disabledAt)}</dd>
                </>
              )}
            </dl>
            <MerchantAdminAccountActions merchantAdminId={merchantAdmin.id} disabled={merchantAdmin.disabledAt !== null} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>업체</CardTitle>
          </CardHeader>
          <CardContent>
            <MerchantAdminMerchant
              merchantAdminId={merchantAdmin.id}
              merchant={
                merchantAdmin.merchant && {
                  id: merchantAdmin.merchant.id,
                  name: merchantAdmin.merchant.name,
                  address: merchantAdmin.merchant.address,
                  deleted: merchantAdmin.merchant.deletedAt !== null,
                }
              }
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
