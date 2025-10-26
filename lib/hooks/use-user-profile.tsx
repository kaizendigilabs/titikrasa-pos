"use client";

import * as React from "react";

type UserProfileContextValue = {
  userId: string;
  displayName: string;
  email: string;
} | null;

const UserProfileContext = React.createContext<UserProfileContextValue>(null);

export function UserProfileProvider({
  value,
  children,
}: {
  value: UserProfileContextValue;
  children: React.ReactNode;
}) {
  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return React.useContext(UserProfileContext);
}
