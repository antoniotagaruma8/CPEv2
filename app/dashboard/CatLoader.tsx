"use client";

import React, { useState, useEffect } from 'react';

interface CatLoaderProps {
  finished: boolean;
  onComplete: () => void;
}

const CatLoader: React.FC<CatLoaderProps> = ({ finished, onComplete }) => {
  const [phase, setPhase] = useState<'searching' | 'building'>('searching');

  useEffect(() => {
    if (finished) {
      setPhase('building');
      const timer = setTimeout(() => {
        onComplete();
      }, 4000); // Duration of the building animation

      return () => clearTimeout(timer);
    } else {
      setPhase('searching');
    }
  }, [finished, onComplete]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100vh',
      backgroundColor: '#f0f2f5',
      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#333',
      overflow: 'hidden',
      textAlign: 'center',
    }}>
      <style>{`
        .cat-loader-cat {
          transform-origin: bottom center;
          animation: cat-bob-anim 2s infinite ease-in-out;
        }
        @keyframes cat-bob-anim {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.05); }
        }
        .cat-loader-magnifying-glass {
          animation: search-anim 3.5s ease-in-out infinite;
          transform-origin: 50% 100%;
        }
        @keyframes search-anim {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-30px, -20px) rotate(-25deg); }
          75% { transform: translate(30px, -15px) rotate(25deg); }
        }
        .cat-loader-hammer {
          transform-origin: bottom right;
          animation: hammer-anim 0.5s infinite ease-in-out;
        }
        @keyframes hammer-anim {
          0%, 100% { transform: rotate(20deg); }
          50% { transform: rotate(-45deg); }
        }
        .cat-loader-block {
          opacity: 0;
          animation: build-anim 3s ease-out forwards;
        }
        @keyframes build-anim {
          from { opacity: 0; transform: translateY(30px) scale(0.8); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cat-loader-block-1 { animation-delay: 0.2s; }
        .cat-loader-block-2 { animation-delay: 1.2s; }
        .cat-loader-block-3 { animation-delay: 2.2s; }
      `}</style>
      <div style={{ position: 'relative', width: 200, height: 200, marginBottom: '2rem' }}>
        {/* Cat Body */}
        <svg className="cat-loader-cat" width="120" height="140" viewBox="0 0 120 140" style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <path d="M 20 40 Q 25 10 40 20 Z" fill="#FF6B6B"/>
          <path d="M 100 40 Q 95 10 80 20 Z" fill="#FF6B6B"/>
          <circle cx="60" cy="60" r="40" fill="#FFE66D"/>
          <circle cx="45" cy="55" r="5" fill="#333"/>
          <circle cx="75" cy="55" r="5" fill="#333"/>
          <path d="M 58 65 L 62 65 L 60 70 Z" fill="#4ECDC4"/>
          <path d="M 50 75 Q 60 85 70 75" stroke="#333" fill="transparent" strokeWidth="2"/>
          <path d="M 40 90 C 20 140, 100 140, 80 90 Z" fill="#FFE66D"/>
        </svg>

        {phase === 'searching' && (
          <div className="cat-loader-magnifying-glass" style={{ position: 'absolute', top: 40, left: 70, zIndex: 20 }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="30" cy="30" r="25" stroke="#4ECDC4" strokeWidth="8" fill="rgba(78, 205, 196, 0.2)"/>
              <line x1="50" y1="50" x2="70" y2="70" stroke="#4ECDC4" strokeWidth="10" strokeLinecap="round"/>
            </svg>
          </div>
        )}

        {phase === 'building' && (
          <>
            <div className="cat-loader-hammer" style={{ position: 'absolute', top: 50, left: 80, zIndex: 20 }}>
              <svg width="60" height="60" viewBox="0 0 60 60">
                <rect x="0" y="0" width="40" height="20" rx="4" fill="#A9A9A9"/>
                <rect x="15" y="20" width="10" height="40" fill="#F7B731"/>
              </svg>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: -20, zIndex: 5 }}>
              <svg className="cat-loader-block cat-loader-block-1" width="50" height="50"><rect width="50" height="50" fill="#FF6B6B" rx="5"/></svg>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 30, zIndex: 5 }}>
              <svg className="cat-loader-block cat-loader-block-2" width="50" height="50"><rect width="50" height="50" fill="#4ECDC4" rx="5"/></svg>
            </div>
             <div style={{ position: 'absolute', bottom: 50, left: -20, zIndex: 5 }}>
              <svg className="cat-loader-block cat-loader-block-3" width="50" height="50"><rect width="50" height="50" fill="#FFE66D" rx="5"/></svg>
            </div>
          </>
        )}
      </div>
      <h2 style={{ fontSize: '1.5em', letterSpacing: '1px', fontWeight: 600 }}>
        {phase === 'searching' ? 'Preparing your exam...' : 'Building your exam paper...'}
      </h2>
      <p style={{ color: '#666', marginTop: '0.5rem' }}>This may take a moment. Please wait.</p>
    </div>
  );
};

export default CatLoader;

```

### 2. Updating the Dashboard Page

Next, I've updated your dashboard page to use the new `CatLoader` component instead of the old `CliLoader`.

```diff
--- a/c:\Users\Anton\Desktop\OLD FILES\GOALS\AI\GitHub 2025\CPE\app\dashboard\page.tsx
+++ b/c:\Users\Anton\Desktop\OLD FILES\GOALS\AI\GitHub 2025\CPE\app\dashboard\page.tsx
@@ -1,6 +1,6 @@
 "use client";
 
 import React, { useState, useEffect } from 'react';
 import { useExam } from './ExamContext';
-import CliLoader from '../../components/CliLoader';
+import CatLoader from '../../components/CatLoader';
 
 interface Question {
   id: number;
@@ -226,9 +226,9 @@
 
   if (loading || isProcessing || isLoaderVisible) {
     return (
-      <CliLoader 
-        finished={!loading && !isProcessing} 
-        onComplete={() => setIsLoaderVisible(false)} 
+      <CatLoader
+        finished={!loading && !isProcessing}
+        onComplete={() => setIsLoaderVisible(false)}
       />
     );
   }

```

These changes will give your application a much more lively and branded loading screen. Let me know if you'd like any adjustments to the animation or colors!

<!--
[PROMPT_SUGGESTION]Can you make the cat animation faster?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Add a sound effect to the hammer animation in the cat loader.[/PROMPT_SUGGESTION]
-->