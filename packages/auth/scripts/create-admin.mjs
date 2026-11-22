import { readPassword } from "./cli.mjs";

const [loginIdArgument = "", ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ").trim();
const { isValidPassword, normalizeLoginId } = await import("../src/password-policy.ts");
const loginId = normalizeLoginId(loginIdArgument);

if (!loginId || !name) {
  console.error("사용법: create-admin <아이디(영문 소문자·숫자·._- 4~32자)> <이름>  (비밀번호는 입력 프롬프트나 표준 입력으로)");
  process.exit(1);
}

const password = await readPassword();
if (!isValidPassword(password)) {
  console.error("비밀번호는 8~72자여야 합니다.");
  process.exit(1);
}

const { hashPassword } = await import("../src/password.ts");
const { prisma } = await import("database");

try {
  const admin = await prisma.admin.create({
    data: { loginId, name, passwordHash: await hashPassword(password) },
    select: { id: true, loginId: true },
  });
  console.log(`슈퍼 어드민 계정을 만들었습니다: ${admin.loginId} (id ${admin.id})`);
} catch (error) {
  console.error(error?.code === "P2002" ? "이미 있는 아이디입니다." : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
