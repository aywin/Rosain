"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function GroupeRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => { router.replace("/teacher"); }, [id, router]);
  return null;
}
