import LoginForm from "@/components/admin/LoginForm";
import { safeAdminRedirectPath } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.next) ? params.next[0] : params.next;
  return <LoginForm next={safeAdminRedirectPath(raw)} />;
}
