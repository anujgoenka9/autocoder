import Link from "next/link";
import { Button } from "./ui/button";
import { getUser } from "@/lib/supabase/user";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const user = await getUser();

  return user ? (
    <div className="flex items-center gap-4">
      Hey, {user.email}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}