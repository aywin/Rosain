"use client";
import ProtectSuperAdminRoute from "@/components/auth/ProtectSuperAdminRoute";
import VideoList from "@/components/admin/VideoList";

export default function AdminVideosPage() {
  return (
    <ProtectSuperAdminRoute>
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Videos Management</h1>
        <VideoList />
      </div>
    </ProtectSuperAdminRoute>
  );
}
