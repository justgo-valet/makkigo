"use client";

import { useEffect } from "react";

import { setAppAuthenticated } from "@/features/auth/appBridge";

interface AppSessionBridgeProps {
  authenticated: boolean;
}

export default function AppSessionBridge({ authenticated }: Readonly<AppSessionBridgeProps>) {
  useEffect(() => setAppAuthenticated(authenticated), [authenticated]);
  return null;
}
