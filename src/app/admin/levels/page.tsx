"use client";
import ProtectSuperAdminRoute from "@/components/auth/ProtectSuperAdminRoute";
import LevelList from "@/components/admin/LevelList";

export default function AdminLevelsPage() {
  return (
    <ProtectSuperAdminRoute>
      <div className="max-w-xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Gestion des niveaux</h1>
        <LevelList />
      </div>
    </ProtectSuperAdminRoute>
  );
}
