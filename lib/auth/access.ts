import { currentUser } from "@clerk/nextjs/server";

export type UserAppAccess = {
  isSignedIn: boolean;
  role: "signed-in" | "anonymous";
};

export async function getUserAppAccess(): Promise<UserAppAccess> {
  const user = await currentUser();

  if (!user) {
    return { isSignedIn: false, role: "anonymous" };
  }

  return {
    isSignedIn: true,
    role: "signed-in",
  };
}
