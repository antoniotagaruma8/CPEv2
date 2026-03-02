'use client';
import React, { useState, useEffect } from 'react';
import './CliLoader.css';

const CliLoader = ({ onComplete, finished }) => {
  const [progress, setProgress] = useState(0);
  const loadingText = "Generating your exam...";

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(oldProgress => {
        if (finished === false && oldProgress >= 90) {
          return 90;
        }

        if (oldProgress >= 100) {
          clearInterval(interval);
          if (onComplete) {
            setTimeout(onComplete, 500); // Brief delay before completing
          }
          return 100;
        }
        // Simulate progress
        const randomIncrement = finished ? 10 : Math.floor(Math.random() * 5) + 1;
        return Math.min(oldProgress + randomIncrement, 100);
      });
    }, 150); // Adjust speed of loading here

    return () => {
      clearInterval(interval);
    };
  }, [onComplete, finished]);

  const progressBarLength = 30;
  const filledLength = Math.round(progressBarLength * progress / 100);
  const emptyLength = progressBarLength - filledLength;
  const progressBar = `[${'#'.repeat(filledLength)}${'-'.repeat(emptyLength)}]`;

  return (
    <div className="cli-loader-container">
      <div className="cli-loader">
        <p><span className="prompt">&gt;</span> {loadingText}</p>
        <div className="progress-line">
          <span>{progressBar}</span>
          <span className="progress-percent">{progress}%</span>
        </div>
        {progress < 100 && <div className="cursor"></div>}
        {progress === 100 && <p><span className="prompt-success">&gt;</span> Exam generated successfully!</p>}
      </div>
    </div>
  );
};

export default CliLoader;