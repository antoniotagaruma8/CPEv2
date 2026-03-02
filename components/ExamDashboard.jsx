'use client';
import React, { useState } from 'react';
import CliLoader from './CliLoader';

const ExamDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoaded = () => {
    setIsLoading(false);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {isLoading ? (
        <CliLoader onComplete={handleLoaded} />
      ) : (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#111827' }}>Exam Generated</h1>
          <p style={{ color: '#4b5563', marginBottom: '2rem' }}>
            Your exam is ready. You can now proceed with the test.
          </p>
          <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
            <p>Exam content goes here...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamDashboard;