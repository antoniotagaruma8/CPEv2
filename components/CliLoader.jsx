'use client';
import React, { useState, useEffect, useMemo } from 'react';
import './CliLoader.css';

const STEPS = [
  { label: 'Initializing exam engine', threshold: 10 },
  { label: 'Generating questions & content', threshold: 35 },
  { label: 'Applying Cambridge standards', threshold: 60 },
  { label: 'Finalizing exam paper', threshold: 85 },
  { label: 'Ready!', threshold: 100 },
];

const CliLoader = ({ onComplete, finished }) => {
  const [progress, setProgress] = useState(0);
  const isComplete = progress >= 100;

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(oldProgress => {
        // Cap at 90% until actually finished
        if (!finished && oldProgress >= 90) {
          return 90;
        }

        if (oldProgress >= 100) {
          clearInterval(interval);
          if (onComplete) {
            setTimeout(onComplete, 800);
          }
          return 100;
        }

        const increment = finished ? 10 : Math.floor(Math.random() * 4) + 1;
        return Math.min(oldProgress + increment, 100);
      });
    }, 180);

    return () => clearInterval(interval);
  }, [onComplete, finished]);

  const currentStepIndex = useMemo(() => {
    for (let i = STEPS.length - 1; i >= 0; i--) {
      if (progress >= STEPS[i].threshold) return i;
    }
    return 0;
  }, [progress]);

  return (
    <div className="loader-overlay">
      <div className={`loader-modal ${isComplete ? 'loader-success' : ''}`}>
        {/* Animated Icon */}
        <div className="loader-icon-container">
          <div className="loader-spinner-ring"></div>
          <div className="loader-inner-icon">
            {isComplete ? '✓' : '📝'}
          </div>
        </div>

        {/* Title */}
        <div className="loader-title">
          {isComplete ? 'Exam Ready!' : 'Generating Your Exam'}
        </div>
        <div className="loader-subtitle">
          {isComplete
            ? 'Your Cambridge exam has been generated successfully.'
            : 'AI is crafting your personalized Cambridge exam paper...'}
        </div>

        {/* Progress Bar */}
        <div className="loader-progress-wrapper">
          <div className="loader-progress-track">
            <div
              className="loader-progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="loader-progress-label">
            <span>{STEPS[currentStepIndex]?.label}</span>
            <span className="loader-progress-percent">{progress}%</span>
          </div>
        </div>

        {/* Step indicators */}
        <div className="loader-steps">
          {STEPS.slice(0, -1).map((step, idx) => {
            const isDone = progress >= STEPS[idx + 1]?.threshold;
            const isActive = currentStepIndex === idx && !isDone;
            return (
              <div
                key={idx}
                className={`loader-step ${isDone ? 'done' : isActive ? 'active' : ''}`}
              >
                <div className="loader-step-icon">
                  {isDone ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <div className="loader-step-dot"></div>
                  )}
                </div>
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CliLoader;