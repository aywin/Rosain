"use client";
import ProtectSuperAdminRoute from "@/components/auth/ProtectSuperAdminRoute";
import SubjectList from "@/components/admin/SubjectList";

export default function AdminSubjectsPage() {
  return (
    <ProtectSuperAdminRoute>
      <div className="max-w-xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Subjects Management</h1>
        <SubjectList />
      </div>
    </ProtectSuperAdminRoute>
  );
}
