"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeacherResourcesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/teacher"); }, [router]);
  return null;
}
