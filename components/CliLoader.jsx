'use client';
import React, { useState, useEffect, useMemo } from 'react';
import './CliLoader.css';

const STEPS = [
  { label: 'Initializing AI context', threshold: 10 },
  { label: 'Generating content & questions', threshold: 40 },
  { label: 'Applying CEFR Mock rubric', threshold: 65 },
  { label: 'Finalizing exam structure', threshold: 90 },
  { label: 'Ready!', threshold: 100 },
];

const CliLoader = ({ onComplete, finished }) => {
  const [progress, setProgress] = useState(0);
  const isComplete = progress >= 100;

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(oldProgress => {
        if (!finished && oldProgress >= 90) return 90;

        if (oldProgress >= 100) {
          clearInterval(interval);
          if (onComplete) setTimeout(onComplete, 1000);
          return 100;
        }

        const increment = finished ? 8 : Math.floor(Math.random() * 3) + 1;
        return Math.min(oldProgress + increment, 100);
      });
    }, 150);

    return () => clearInterval(interval);
  }, [onComplete, finished]);

  const currentStepIndex = useMemo(() => {
    for (let i = STEPS.length - 1; i >= 0; i--) {
      if (progress >= STEPS[i].threshold) return i;
    }
    return 0;
  }, [progress]);

  return (
    <div className="modern-loader-overlay dark:bg-slate-900/80 bg-slate-900/60 transition-colors duration-500">
      <div className={`modern-loader-modal dark:bg-slate-800 dark:border-slate-700 bg-white border-slate-200 ${isComplete ? 'is-complete' : ''}`}>

        {/* Top Glow Ring */}
        <div className="loader-glow-ring dark:opacity-40 opacity-20"></div>

        <div className="loader-content-wrapper">
          {/* Animated Graphic */}
          <div className="loader-graphic-container">
            {isComplete ? (
              <div className="success-checkmark dark:text-emerald-400 text-emerald-500">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
            ) : (
              <div className="pulse-orbs">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
              </div>
            )}
          </div>

          <h2 className="loader-heading dark:text-white text-slate-800">
            {isComplete ? 'Exam Generated' : 'Crafting Your Exam'}
          </h2>
          <p className="loader-subheading dark:text-slate-400 text-slate-500">
            {isComplete
              ? 'Your personalized CEFR Mock materials are ready.'
              : 'Our AI is dynamically assembling questions and grading logic.'}
          </p>

          <div className="loader-progress-section">
            <div className="progress-bar-container dark:bg-slate-700 bg-slate-100">
              <div
                className="progress-bar-fill dark:bg-blue-500 bg-blue-600"
                style={{ width: `${progress}%` }}
              >
                <div className="progress-bar-shine"></div>
              </div>
            </div>

            <div className="progress-details">
              <span className="step-label dark:text-slate-300 text-slate-600">
                {STEPS[currentStepIndex]?.label}
              </span>
              <span className="step-percent dark:text-white text-slate-900">
                {progress}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CliLoader;