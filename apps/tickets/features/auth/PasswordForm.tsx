"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { isValidPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@makkigo/auth/password-policy";
import { Button, FieldError, Input, Label } from "@makkigo/ui";
import { useState } from "react";

import { apiClient } from "@/libs/common/apiClient";

import type { FormEvent } from "react";

const passwordProblem = (current: string, next: string, confirm: string) => {
  if (!isValidPassword(next)) return `새 비밀번호는 ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자로 정해 주세요.`;
  if (next === current) return "지금 비밀번호와 다른 비밀번호로 정해 주세요.";
  if (next !== confirm) return "새 비밀번호가 서로 달라요.";
  return null;
};

export default function PasswordForm({ required }: Readonly<{ required: boolean }>) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = passwordProblem(currentPassword, newPassword, confirmPassword);
    if (problem) {
      setError(problem);
      return;
    }
    setPending(true);
    setError("");
    try {
      await apiClient.post("account/password", { json: { currentPassword, newPassword } });
      window.location.replace("/");
    } catch (cause) {
      setError(getErrorMessage(cause, "비밀번호를 바꾸지 못했어요. 다시 시도해 주세요."));
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_8px_32px_rgba(3,9,15,0.08)]">
      <h1 className="text-2xl font-bold tracking-tight">비밀번호 변경</h1>
      <p className="mt-2 text-sm leading-relaxed break-keep text-(--tertiary-color)">
        {required
          ? "운영팀이 발급한 임시 비밀번호를 쓰고 있어요. 계속하려면 새 비밀번호로 바꿔 주세요."
          : "비밀번호를 바꾸면 다른 기기에서는 다시 로그인해야 해요."}
      </p>
      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="currentPassword">지금 비밀번호</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="newPassword">새 비밀번호</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            aria-describedby="newPasswordHint"
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <p id="newPasswordHint" className="text-xs text-(--tertiary-color)">
            {PASSWORD_MIN_LENGTH}~{PASSWORD_MAX_LENGTH}자, 지금 비밀번호와 다르게 정해 주세요.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            maxLength={PASSWORD_MAX_LENGTH}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        {error && <FieldError className="text-center">{error}</FieldError>}
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
          {pending ? "바꾸는 중…" : "비밀번호 바꾸기"}
        </Button>
      </div>
    </form>
  );
}
