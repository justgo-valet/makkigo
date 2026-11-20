import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith(".")) throw error;
      if (error.code === "ERR_MODULE_NOT_FOUND") return nextResolve(`${specifier}.ts`, context);
      if (error.code === "ERR_UNSUPPORTED_DIR_IMPORT") return nextResolve(`${specifier}/index.ts`, context);
      throw error;
    }
  },
});

const readHidden = (question) =>
  new Promise((resolve) => {
    let value = "";
    const onData = (chunk) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\u0003") process.exit(130);
        if (char === "\r" || char === "\n") {
          process.stdin.off("data", onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        value = char === "\u007f" || char === "\b" ? value.slice(0, -1) : value + char;
      }
    };
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.on("data", onData);
    process.stdin.resume();
  });

const readPassword = async () => {
  if (!process.stdin.isTTY) {
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    return input.replace(/\r?\n$/, "");
  }
  const password = await readHidden("비밀번호: ");
  if ((await readHidden("비밀번호 확인: ")) !== password) throw new Error("두 비밀번호가 다릅니다.");
  return password;
};

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
