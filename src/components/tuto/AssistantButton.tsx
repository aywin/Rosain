"use client";

import { FC } from "react";

interface AssistantButtonProps {
  onClick: () => void;
}

const AssistantButton: FC<AssistantButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="mt-4 self-end px-3 py-2 border rounded hover:bg-blue-600 hover:text-white transition"
    >
      Ouvrir Assistant IA →
    </button>
  );
};

export default AssistantButton;
