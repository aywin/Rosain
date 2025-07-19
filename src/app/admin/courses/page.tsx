"use client";
import ProtectSuperAdminRoute from "@/components/auth/ProtectSuperAdminRoute";
import CourseList from "@/components/admin/CourseList";

export default function AdminCoursesPage() {
  return (
    <ProtectSuperAdminRoute>
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Courses Management</h1>
        <CourseList />
      </div>
    </ProtectSuperAdminRoute>
  );
}
