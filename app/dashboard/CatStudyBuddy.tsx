"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface CatStudyBuddyProps {
    isGenerating?: boolean;
    hasExam?: boolean;
    examType?: string;
    timeLeftSeconds?: number;
}

type CatMood = 'idle' | 'happy' | 'excited' | 'studying' | 'sleepy' | 'cheering' | 'thinking' | 'worried';

const SPEECH_BUBBLES: Record<CatMood, string[]> = {
    idle: [
        "Pick a topic and let's go! 📚",
        "I believe in you! ✨",
        "Ready when you are~ 🐾",
        "Let's ace this exam! 💪",
        "Meow! Let's study! 🎓",
    ],
    happy: [
        "Great choice! 🌟",
        "Ooh, exciting topic! ✨",
        "This will be fun! 😸",
        "Purr-fect pick! 🐱",
    ],
    excited: [
        "Here it comes...! 🚀",
        "Building your exam! ⚡",
        "Almost there, nya~! 🔥",
        "Working hard...! 💫",
    ],
    studying: [
        "You got this! 📖",
        "Focus mode ON! 🧠",
        "Take your time~ 🍀",
        "Think carefully! 🤔",
    ],
    sleepy: [
        "Zzz... *yawn* 😴",
        "Still here... 💤",
        "Waiting for you~ 🌙",
    ],
    cheering: [
        "Amazing work!! 🎉",
        "You're a star! ⭐",
        "Purr-fection! 🏆",
    ],
    thinking: [
        "Hmm, let me think... 🤔",
        "Processing... 💭",
        "Interesting choice! 🧐",
    ],
    worried: [
        "Time's running out! ⏰",
        "Hurry, hurry! 🏃",
        "You can do it! 💨",
    ],
};

const CatStudyBuddy: React.FC<CatStudyBuddyProps> = ({
    isGenerating = false,
    hasExam = false,
    examType = 'Reading',
    timeLeftSeconds,
}) => {
    const [mood, setMood] = useState<CatMood>('idle');
    const [isHovered, setIsHovered] = useState(false);
    const [isPetting, setIsPetting] = useState(false);
    const [bubbleText, setBubbleText] = useState('');
    const [showBubble, setShowBubble] = useState(false);
    const [blinkCount, setBlink] = useState(0);
    const [tailWag, setTailWag] = useState(0);
    const petTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Determine mood based on app state
    useEffect(() => {
        if (isGenerating) {
            setMood('excited');
        } else if (hasExam && timeLeftSeconds !== undefined && timeLeftSeconds < 300) {
            setMood('worried');
        } else if (hasExam) {
            setMood('studying');
        } else {
            setMood('idle');
        }
    }, [isGenerating, hasExam, timeLeftSeconds]);

    // Blinking animation
    useEffect(() => {
        const blinkInterval = setInterval(() => {
            setBlink(prev => prev + 1);
        }, 3000 + Math.random() * 2000);
        return () => clearInterval(blinkInterval);
    }, []);

    // Tail wag
    useEffect(() => {
        const wagInterval = setInterval(() => {
            setTailWag(prev => prev + 1);
        }, 150);
        return () => clearInterval(wagInterval);
    }, []);

    // Show speech bubble periodically
    useEffect(() => {
        const showRandomBubble = () => {
            const messages = SPEECH_BUBBLES[mood];
            const randomMsg = messages[Math.floor(Math.random() * messages.length)];
            setBubbleText(randomMsg);
            setShowBubble(true);

            bubbleTimeoutRef.current = setTimeout(() => {
                setShowBubble(false);
            }, 4000);
        };

        // Show first bubble after a short delay
        const initialTimer = setTimeout(showRandomBubble, 1500);

        // Then periodically
        const interval = setInterval(showRandomBubble, 12000 + Math.random() * 5000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
            if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
        };
    }, [mood]);

    const handleMouseEnter = () => {
        setIsHovered(true);
        // Show a reaction bubble on hover
        const hoverMessages = [
            "Nya~! Hi there! 👋",
            "Pet me? 🥺",
            "*purrs* 😻",
            "Hehe~ 😸",
            "Oh! Hello! 🐾",
        ];
        setBubbleText(hoverMessages[Math.floor(Math.random() * hoverMessages.length)]);
        setShowBubble(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setIsPetting(false);
        if (petTimeoutRef.current) clearTimeout(petTimeoutRef.current);
        setTimeout(() => setShowBubble(false), 1000);
    };

    const handleClick = () => {
        setIsPetting(true);
        const petMessages = [
            "Purrrrr~ 😻💕",
            "*nuzzles* 🥰",
            "More pets please! 💖",
            "I love you~! 💗",
            "Nyaaa~! 😸✨",
        ];
        setBubbleText(petMessages[Math.floor(Math.random() * petMessages.length)]);
        setShowBubble(true);

        if (petTimeoutRef.current) clearTimeout(petTimeoutRef.current);
        petTimeoutRef.current = setTimeout(() => setIsPetting(false), 800);
    };

    const isBlinking = blinkCount % 2 === 0 && (Date.now() % 3200 < 200);
    const tailAngle = Math.sin(tailWag * 0.3) * (isHovered ? 30 : 15);

    // Dynamic eye style based on mood
    const getEyeExpression = () => {
        if (isBlinking) return { scaleY: 0.1, radiusY: 1 };
        if (isPetting) return { scaleY: 0.4, radiusY: 2.5 }; // happy squint
        if (mood === 'excited') return { scaleY: 1.2, radiusY: 6 }; // wide eyes
        if (mood === 'worried') return { scaleY: 0.8, radiusY: 4.5 };
        if (mood === 'sleepy') return { scaleY: 0.5, radiusY: 3 };
        return { scaleY: 1, radiusY: 5 };
    };

    const eyeExpr = getEyeExpression();

    // Dynamic colors
    const catColor = '#FFD699'; // warm golden
    const catColorDark = '#F5C06B';
    const earInner = '#FFB3B3';
    const noseColor = '#FF8FAB';
    const cheekColor = '#FFB3C6';

    return (
        <div
            className="cat-study-buddy-wrapper"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            style={{ cursor: 'pointer', userSelect: 'none' }}
        >
            <style>{`
        .cat-study-buddy-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px 16px 4px 16px;
          margin-bottom: 4px;
        }

        .cat-svg-main {
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.08));
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .cat-study-buddy-wrapper:hover .cat-svg-main {
          transform: scale(1.08) translateY(-4px);
        }

        .cat-body-bounce {
          animation: catBounce 2.5s ease-in-out infinite;
        }

        .cat-body-bounce-excited {
          animation: catBounceExcited 0.6s ease-in-out infinite;
        }

        .cat-body-pet {
          animation: catPet 0.3s ease-in-out;
        }

        @keyframes catBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes catBounceExcited {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          25% { transform: translateY(-5px) rotate(2deg); }
          50% { transform: translateY(-2px) rotate(-1deg); }
          75% { transform: translateY(-6px) rotate(1deg); }
        }

        @keyframes catPet {
          0% { transform: scale(1); }
          50% { transform: scale(0.95) rotate(-3deg); }
          100% { transform: scale(1); }
        }

        .speech-bubble {
          position: absolute;
          top: -8px;
          right: -10px;
          background: white;
          border: 2px solid #E2E8F0;
          border-radius: 16px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02);
          opacity: 0;
          transform: translateY(4px) scale(0.9);
          transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          pointer-events: none;
          z-index: 10;
        }

        .speech-bubble.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .speech-bubble::after {
          content: '';
          position: absolute;
          bottom: -7px;
          left: 20px;
          width: 12px;
          height: 12px;
          background: white;
          border-right: 2px solid #E2E8F0;
          border-bottom: 2px solid #E2E8F0;
          transform: rotate(45deg);
        }

        .cat-sparkle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #FFD700;
          opacity: 0;
          pointer-events: none;
        }

        .cat-study-buddy-wrapper:hover .cat-sparkle {
          animation: sparkle 1.5s ease-in-out infinite;
        }

        .cat-sparkle:nth-child(2) { animation-delay: 0.3s; top: 10px; left: 15px; }
        .cat-sparkle:nth-child(3) { animation-delay: 0.6s; top: 5px; right: 20px; }
        .cat-sparkle:nth-child(4) { animation-delay: 0.9s; top: 20px; right: 10px; }

        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
        }

        .heart-float {
          position: absolute;
          opacity: 0;
          pointer-events: none;
          font-size: 14px;
        }

        .heart-float.active {
          animation: heartFloat 1s ease-out forwards;
        }

        @keyframes heartFloat {
          0% { opacity: 1; transform: translateY(0) scale(0.5); }
          100% { opacity: 0; transform: translateY(-30px) scale(1.2); }
        }

        /* Studying sparkle aura */
        .studying-aura {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
          background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
          transition: opacity 0.5s ease;
        }

        .studying-aura.active {
          opacity: 1;
          animation: auraGlow 2s ease-in-out infinite;
        }

        @keyframes auraGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        .paw-prints {
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .cat-study-buddy-wrapper:hover .paw-prints {
          opacity: 0.3;
        }

        .dark .speech-bubble {
          background: #1e293b;
          border-color: #334155;
          color: #cbd5e1;
        }
        .dark .speech-bubble::after {
          background: #1e293b;
          border-right-color: #334155;
          border-bottom-color: #334155;
        }
      `}</style>

            {/* Sparkle particles */}
            <div className="cat-sparkle" style={{ top: 2, left: 25 }} />
            <div className="cat-sparkle" />
            <div className="cat-sparkle" />
            <div className="cat-sparkle" />

            {/* Heart on pet */}
            {isPetting && (
                <>
                    <span className="heart-float active" style={{ top: 0, left: '40%' }}>💕</span>
                    <span className="heart-float active" style={{ top: 5, left: '55%', animationDelay: '0.15s' }}>💖</span>
                </>
            )}

            {/* Speech bubble */}
            <div className={`speech-bubble ${showBubble ? 'visible' : ''}`}>
                {bubbleText}
            </div>

            {/* The Cat SVG */}
            <svg
                className={`cat-svg-main ${isPetting ? 'cat-body-pet' : mood === 'excited' ? 'cat-body-bounce-excited' : 'cat-body-bounce'}`}
                width="100"
                height="85"
                viewBox="0 0 120 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Studying aura */}
                {mood === 'studying' && (
                    <circle cx="60" cy="55" r="48" fill="url(#studyGlow)" opacity="0.3">
                        <animate attributeName="r" values="46;50;46" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.2;0.4;0.2" dur="2s" repeatCount="indefinite" />
                    </circle>
                )}

                <defs>
                    <radialGradient id="studyGlow" cx="50%" cy="50%">
                        <stop offset="0%" stopColor="#818CF8" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="bodyGrad" cx="50%" cy="40%">
                        <stop offset="0%" stopColor={catColor} />
                        <stop offset="100%" stopColor={catColorDark} />
                    </radialGradient>
                </defs>

                {/* Tail */}
                <g transform={`rotate(${tailAngle}, 95, 75)`}>
                    <path
                        d="M 90 72 Q 108 50 115 35 Q 118 28 112 30"
                        stroke={catColorDark}
                        strokeWidth="5"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* Tail tip */}
                    <circle cx="112" cy="30" r="4" fill={catColorDark} />
                </g>

                {/* Body */}
                <ellipse cx="60" cy="70" rx="30" ry="22" fill="url(#bodyGrad)" />

                {/* Belly patch */}
                <ellipse cx="60" cy="74" rx="16" ry="13" fill="#FFF5E6" opacity="0.7" />

                {/* Left ear */}
                <path d="M 32 38 L 22 12 L 45 30 Z" fill={catColor} />
                <path d="M 34 36 L 26 18 L 43 32 Z" fill={earInner} />

                {/* Right ear */}
                <path d="M 88 38 L 98 12 L 75 30 Z" fill={catColor} />
                <path d="M 86 36 L 94 18 L 77 32 Z" fill={earInner} />

                {/* Head */}
                <circle cx="60" cy="45" r="25" fill={catColor} />

                {/* Whiskers - left */}
                <line x1="20" y1="48" x2="40" y2="50" stroke="#D4A574" strokeWidth="1" opacity="0.5">
                    <animate attributeName="y1" values="48;46;48" dur="3s" repeatCount="indefinite" />
                </line>
                <line x1="18" y1="54" x2="40" y2="54" stroke="#D4A574" strokeWidth="1" opacity="0.5">
                    <animate attributeName="y1" values="54;52;54" dur="3.2s" repeatCount="indefinite" />
                </line>
                <line x1="22" y1="60" x2="40" y2="57" stroke="#D4A574" strokeWidth="1" opacity="0.5">
                    <animate attributeName="y1" values="60;58;60" dur="2.8s" repeatCount="indefinite" />
                </line>

                {/* Whiskers - right */}
                <line x1="100" y1="48" x2="80" y2="50" stroke="#D4A574" strokeWidth="1" opacity="0.5">
                    <animate attributeName="y1" values="48;46;48" dur="3s" repeatCount="indefinite" />
                </line>
                <line x1="102" y1="54" x2="80" y2="54" stroke="#D4A574" strokeWidth="1" opacity="0.5">
                    <animate attributeName="y1" values="54;52;54" dur="3.2s" repeatCount="indefinite" />
                </line>
                <line x1="98" y1="60" x2="80" y2="57" stroke="#D4A574" strokeWidth="1" opacity="0.5">
                    <animate attributeName="y1" values="60;58;60" dur="2.8s" repeatCount="indefinite" />
                </line>

                {/* Eyes */}
                <ellipse
                    cx="49"
                    cy="43"
                    rx="4.5"
                    ry={eyeExpr.radiusY}
                    fill="#2D3436"
                >
                    {mood === 'excited' && (
                        <animate attributeName="ry" values="5;6;5" dur="0.8s" repeatCount="indefinite" />
                    )}
                </ellipse>
                <ellipse
                    cx="71"
                    cy="43"
                    rx="4.5"
                    ry={eyeExpr.radiusY}
                    fill="#2D3436"
                >
                    {mood === 'excited' && (
                        <animate attributeName="ry" values="5;6;5" dur="0.8s" repeatCount="indefinite" />
                    )}
                </ellipse>

                {/* Eye highlights */}
                {!isPetting && eyeExpr.radiusY > 3 && (
                    <>
                        <circle cx="47" cy="41" r="1.8" fill="white" opacity="0.9" />
                        <circle cx="69" cy="41" r="1.8" fill="white" opacity="0.9" />
                        <circle cx="51" cy="44" r="0.8" fill="white" opacity="0.6" />
                        <circle cx="73" cy="44" r="0.8" fill="white" opacity="0.6" />
                    </>
                )}

                {/* Happy squint lines when petting */}
                {isPetting && (
                    <>
                        <path d="M 44 43 Q 49 40 54 43" stroke="#2D3436" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <path d="M 66 43 Q 71 40 76 43" stroke="#2D3436" strokeWidth="2" fill="none" strokeLinecap="round" />
                    </>
                )}

                {/* Nose */}
                <path d="M 58 50 L 62 50 L 60 53 Z" fill={noseColor} />

                {/* Mouth */}
                {isPetting || isHovered ? (
                    // Open happy mouth
                    <path d="M 53 55 Q 56 60 60 58 Q 64 60 67 55" stroke="#2D3436" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                ) : mood === 'worried' ? (
                    // Worried wobble mouth
                    <path d="M 54 57 Q 57 55 60 57 Q 63 55 66 57" stroke="#2D3436" strokeWidth="1.5" fill="none" strokeLinecap="round">
                        <animate attributeName="d" values="M 54 57 Q 57 55 60 57 Q 63 55 66 57;M 54 56 Q 57 58 60 56 Q 63 58 66 56;M 54 57 Q 57 55 60 57 Q 63 55 66 57" dur="1s" repeatCount="indefinite" />
                    </path>
                ) : (
                    // Normal smile
                    <path d="M 54 55 Q 57 59 60 56 Q 63 59 66 55" stroke="#2D3436" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                )}

                {/* Cheek blush */}
                <ellipse cx="40" cy="52" rx="5" ry="3" fill={cheekColor} opacity={isHovered || isPetting ? "0.7" : "0.35"}>
                    {isHovered && <animate attributeName="opacity" values="0.5;0.8;0.5" dur="1.5s" repeatCount="indefinite" />}
                </ellipse>
                <ellipse cx="80" cy="52" rx="5" ry="3" fill={cheekColor} opacity={isHovered || isPetting ? "0.7" : "0.35"}>
                    {isHovered && <animate attributeName="opacity" values="0.5;0.8;0.5" dur="1.5s" repeatCount="indefinite" />}
                </ellipse>

                {/* Front paws */}
                <ellipse cx="45" cy="88" rx="8" ry="5" fill={catColorDark} />
                <ellipse cx="75" cy="88" rx="8" ry="5" fill={catColorDark} />

                {/* Paw details */}
                <circle cx="42" cy="87" r="1.5" fill="#FAEBD7" />
                <circle cx="45" cy="86" r="1.5" fill="#FAEBD7" />
                <circle cx="48" cy="87" r="1.5" fill="#FAEBD7" />
                <circle cx="72" cy="87" r="1.5" fill="#FAEBD7" />
                <circle cx="75" cy="86" r="1.5" fill="#FAEBD7" />
                <circle cx="78" cy="87" r="1.5" fill="#FAEBD7" />

                {/* Accessory based on exam type */}
                {examType === 'Reading' && (
                    // Tiny reading glasses
                    <>
                        <circle cx="48" cy="43" r="7" stroke="#6366F1" strokeWidth="1.2" fill="none" opacity="0.7" />
                        <circle cx="72" cy="43" r="7" stroke="#6366F1" strokeWidth="1.2" fill="none" opacity="0.7" />
                        <line x1="55" y1="43" x2="65" y2="43" stroke="#6366F1" strokeWidth="1" opacity="0.7" />
                    </>
                )}
                {examType === 'Listening' && (
                    // Tiny headphones
                    <>
                        <path d="M 35 38 Q 35 20 60 20 Q 85 20 85 38" stroke="#6366F1" strokeWidth="2.5" fill="none" opacity="0.6" />
                        <rect x="31" y="35" width="7" height="10" rx="3" fill="#6366F1" opacity="0.6" />
                        <rect x="82" y="35" width="7" height="10" rx="3" fill="#6366F1" opacity="0.6" />
                    </>
                )}
                {examType === 'Writing' && (
                    // Tiny pencil in paw
                    <g transform="rotate(-30, 82, 80)">
                        <rect x="78" y="70" width="3" height="18" rx="1" fill="#F59E0B" opacity="0.8" />
                        <polygon points="78,88 81,88 79.5,93" fill="#2D3436" opacity="0.6" />
                        <rect x="78" y="70" width="3" height="3" rx="0.5" fill="#FF6B6B" opacity="0.7" />
                    </g>
                )}
                {examType === 'Speaking' && (
                    // Tiny microphone
                    <g>
                        <rect x="83" y="58" width="6" height="10" rx="3" fill="#6366F1" opacity="0.6" />
                        <line x1="86" y1="68" x2="86" y2="74" stroke="#6366F1" strokeWidth="1.5" opacity="0.6" />
                        <line x1="82" y1="74" x2="90" y2="74" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                    </g>
                )}

                {/* Generating sparkles */}
                {mood === 'excited' && (
                    <>
                        <circle cx="25" cy="25" r="2" fill="#FFD700" opacity="0.8">
                            <animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite" />
                            <animate attributeName="r" values="1;3;1" dur="0.8s" repeatCount="indefinite" />
                        </circle>
                        <circle cx="95" cy="22" r="2" fill="#FFD700" opacity="0.8">
                            <animate attributeName="opacity" values="0;1;0" dur="1s" begin="0.3s" repeatCount="indefinite" />
                            <animate attributeName="r" values="1;3;1" dur="1s" begin="0.3s" repeatCount="indefinite" />
                        </circle>
                        <circle cx="15" cy="55" r="1.5" fill="#818CF8" opacity="0.8">
                            <animate attributeName="opacity" values="0;1;0" dur="0.9s" begin="0.5s" repeatCount="indefinite" />
                        </circle>
                        <circle cx="105" cy="50" r="1.5" fill="#818CF8" opacity="0.8">
                            <animate attributeName="opacity" values="0;1;0" dur="1.1s" begin="0.2s" repeatCount="indefinite" />
                        </circle>
                    </>
                )}
            </svg>

            {/* Label */}
            <p style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#94A3B8',
                letterSpacing: '0.5px',
                marginTop: '2px',
                textTransform: 'uppercase',
                textAlign: 'center',
                transition: 'color 0.3s ease',
            }}
                className={isHovered ? '!text-blue-400' : ''}
            >
                Study Buddy 🐾
            </p>
        </div>
    );
};

export default CatStudyBuddy;
