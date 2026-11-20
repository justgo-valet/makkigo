import { Card, CardContent, CardHeader, CardTitle } from "@makkigo/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@makkigo/ui/components/ui/table";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDateTime } from "@/features/common/formatters";
import PageHeader from "@/features/common/PageHeader";
import StatusBadge from "@/features/common/StatusBadge";
import { BOOTH_MERCHANT_STATUS } from "@/features/common/statusLabels";
import DeleteMerchantButton from "@/features/merchants/DeleteMerchantButton";
import MerchantForm from "@/features/merchants/MerchantForm";
import MerchantPhotos from "@/features/merchants/MerchantPhotos";
import MerchantQrCode from "@/features/merchants/MerchantQrCode";
import { requireAdminPage } from "@/server/auth/adminSession";
import { toImageUrl } from "@/server/common/imageUrl";
import { parseId } from "@/server/common/parseId";
import { createMerchantQrCode } from "@/server/merchant/merchantQrCode";
import { readMerchant } from "@/server/merchant/merchants";

export default async function MerchantPage({ params }: Readonly<{ params: Promise<{ merchantId: string }> }>) {
  const { merchantId: rawId } = await params;
  await requireAdminPage(`/merchants/${encodeURIComponent(rawId)}`);
  const merchantId = parseId(rawId);
  const merchant = merchantId ? await readMerchant(merchantId) : null;
  if (!merchant) notFound();
  const qrCode = await createMerchantQrCode(merchant.id);
  const usable = merchant.booths.some(({ status }) => status === "APPROVED");

  return (
    <>
      <PageHeader
        title={merchant.name}
        description={`등록 ${formatDateTime(merchant.createdAt)}`}
        action={<DeleteMerchantButton merchantId={merchant.id} merchantName={merchant.name} />}
      />
      <div className="grid max-w-5xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>업체 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <MerchantForm
              merchantId={merchant.id}
              initialValues={{
                name: merchant.name,
                address: merchant.address,
                addressDetail: merchant.addressDetail ?? "",
                postalCode: merchant.postalCode ?? "",
                latitude: merchant.latitude === null ? "" : String(merchant.latitude),
                longitude: merchant.longitude === null ? "" : String(merchant.longitude),
                phone: merchant.phone ?? "",
                kakaoPlaceId: merchant.kakaoPlaceId ?? "",
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>사진</CardTitle>
          </CardHeader>
          <CardContent>
            <MerchantPhotos
              merchantId={merchant.id}
              photos={merchant.photos.map(({ id, path }) => ({ id, url: toImageUrl(path) }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>고객용 QR</CardTitle>
          </CardHeader>
          <CardContent>
            <MerchantQrCode merchantId={merchant.id} merchantName={merchant.name} qrCode={qrCode} usable={usable} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>연결된 부스</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>부스</TableHead>
                  <TableHead>주소</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>바뀐 때</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchant.booths.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-(--tertiary-color)">
                      연결된 부스가 없어요. 부스 화면에서 연결 요청을 보내세요.
                    </TableCell>
                  </TableRow>
                )}
                {merchant.booths.map(({ booth, status, updatedAt }) => (
                  <TableRow key={booth.id}>
                    <TableCell>
                      <Link href={`/booths/${booth.id}`} className="font-medium text-primary hover:underline">
                        {booth.name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-80 truncate">{booth.address}</TableCell>
                    <TableCell>
                      <StatusBadge {...BOOTH_MERCHANT_STATUS[status]} />
                    </TableCell>
                    <TableCell>{formatDateTime(updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>업체 관리자</CardTitle>
          </CardHeader>
          <CardContent>
            {merchant.admins.length === 0 ? (
              <p className="py-4 text-sm text-(--tertiary-color)">
                연결된 업체 관리자가 없어요. 업체 관리자 화면에서 계정을 만들거나 연결하세요.
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {merchant.admins.map((admin) => (
                  <li key={admin.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/merchant-admins/${admin.id}`} className="font-medium text-primary hover:underline">
                      {admin.name} ({admin.loginId})
                    </Link>
                    {admin.disabledAt && <StatusBadge label="중지됨" tone="danger" />}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
