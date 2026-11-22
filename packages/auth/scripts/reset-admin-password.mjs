import { readPassword } from "./cli.mjs";

const { isValidPassword, normalizeLoginId } = await import("../src/password-policy.ts");
const loginId = normalizeLoginId(process.argv[2] ?? "");

if (!loginId) {
  console.error("사용법: reset-admin-password <아이디>  (새 비밀번호는 입력 프롬프트나 표준 입력으로)");
  process.exit(1);
}

const password = await readPassword();
if (!isValidPassword(password)) {
  console.error("비밀번호는 8~72자여야 합니다.");
  process.exit(1);
}

const { hashPassword } = await import("../src/password.ts");
const { prisma } = await import("database");
const passwordHash = await hashPassword(password);

try {
  const admin = await prisma.$transaction(async (transaction) => {
    const found = await transaction.admin.findFirst({ where: { loginId, disabledAt: null }, select: { id: true } });
    if (!found) return null;
    await transaction.admin.update({
      where: { id: found.id },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    });
    await transaction.adminRefreshToken.updateMany({
      where: { adminId: found.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return found;
  });
  if (admin) {
    console.log(`${loginId} 의 비밀번호를 바꾸고 모든 기기에서 로그아웃시켰습니다.`);
  } else {
    console.error("없는 아이디이거나 비활성 계정입니다.");
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
