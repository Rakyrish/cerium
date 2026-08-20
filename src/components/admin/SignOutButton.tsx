"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/admin/sign-in" })}
      className="text-caption font-medium text-primary underline underline-offset-4"
    >
      Sign out
    </button>
  );
}
