"use client";
import ProtectSuperAdminRoute from "@/components/auth/ProtectSuperAdminRoute";
import QuotaLimit from "@/components/admin/QuotaLimit";

export default function QuotaLimitPage() {
    return (
        <ProtectSuperAdminRoute>
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
                <div className="max-w-7xl mx-auto px-4">
                    <QuotaLimit />
                </div>
            </div>
        </ProtectSuperAdminRoute>
    );
}