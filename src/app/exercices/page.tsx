// app/exo/page.tsx
"use client";

import ExoList from "@/components/exo/ExoList";

export default function ExoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <ExoList />
    </div>
  );
}
