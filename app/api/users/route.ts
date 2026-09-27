import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/api";
import { getOrganizationUsers } from "@/lib/data/users";

export async function GET() {
  const auth = await authorize("manage_users");
  if (auth.error) return auth.error;

  const users = await getOrganizationUsers(auth.session.organizationId);
  return NextResponse.json({ users });
}
