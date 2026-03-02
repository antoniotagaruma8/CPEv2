"use client";

import { useState, useEffect } from "react";

// Logic Concept:
// Input: duration (minutes)
// Display: LARGE font (e.g., 15:00)
// Color: Turns RED when < 1 minute left.

interface ExamTimerProps {
  duration: number; // in minutes
}

export default function ExamTimer({ duration }: ExamTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration * 60);

  useEffect(() => {
    setTimeLeft(duration * 60);
  }, [duration]);

  const isActive = timeLeft > 0;

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const isUrgent = timeLeft < 60;

  return (
    <div className="flex items-center gap-4">
      <div className={`text-6xl font-bold tabular-nums ${isUrgent ? "text-red-600" : "text-gray-900"}`}>
        {formattedTime}
      </div>
      <button
        onClick={() => setTimeLeft(duration * 60)}
        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
        title="Reset Timer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>
  );
}