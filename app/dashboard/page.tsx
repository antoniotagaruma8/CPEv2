"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useExam } from './ExamContext';
import CliLoader from '../../components/CliLoader';
import OnboardingTour from '../../components/OnboardingTour';
import { fetchStockImageAction } from '../actions/fetchStockImage';
import { analyzePhotosAction } from '../actions/analyzePhotos';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { saveExam, getSavedExams, deleteSavedExam, getExamById } from '../actions/examActions';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { toggleExamFavorite } from '../actions/favoriteActions';
import { assessSpeakingAction } from '../actions/assessSpeaking';
import { assessWritingAction } from '../actions/assessWriting';
import { assessReadingAction } from '../actions/assessReading';
import { createCheckoutSession, createPortalSession } from '../actions/subscriptionActions';
import { isUserTeacher, activateTeacherStatus } from '../actions/teacherActions';
import { Settings, LogOut, Library, Star, Trash2, Lightbulb, X, BarChart2, Mic, Eye, EyeOff, Check, Pencil, Zap, Flag, Loader2, FileText, Share2, Download, RefreshCcw, GraduationCap, BookOpen, Edit3, Headphones } from 'lucide-react';
import html2canvas from 'html2canvas';

interface Question {
  id: number;
  part: number;
  topic: string;
  question: string;
  options: string[];
  correctOption: string;
  explanation: string;
  imagePrompts?: string[];
  possibleAnswers?: string[];
  tips?: string;
  modelAnswer?: string;
  part1Questions?: { question: string; answer: string; tip: string }[];
}

interface ExamPart {
  part: number;
  title: string;
  instructions: string;
  content: string;
  examinerNotes?: string;
  audioUrl?: string;
  audioError?: string;
  tips?: string;
  modelAnswer?: string;
  howToApproach?: string;
}

const AudioPlayer = ({ audioUrl }: { audioUrl?: string }) => {
  const [playCount, setPlayCount] = useState(0);
  const maxPlays = 2;
  const isExhausted = playCount >= maxPlays;
  const audioRef = useRef<HTMLAudioElement>(null);

  if (audioUrl) {
    return (
      <div className={`w-full p-4 rounded-xl border transition-all duration-500 mb-4 ${isExhausted ? 'bg-slate-100 border-slate-300 opacity-70 grayscale' : 'bg-blue-50/80 border-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.4)] ring-2 ring-blue-400'}`}>
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm font-bold text-blue-900 flex items-center gap-2">
            {!isExhausted && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>}
            Audio Track
          </div>
          <div className={`text-xs font-bold px-2 py-1 rounded-md ${isExhausted ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
            Plays remaining: {Math.max(0, maxPlays - playCount)}
          </div>
        </div>

        {isExhausted ? (
          <div className="text-sm text-center text-slate-500 italic p-3 bg-white/50 rounded-lg border border-slate-200">
            Maximum plays reached for this track. Cambridge Standard prohibits further listens.
          </div>
        ) : (
          <audio
            ref={audioRef}
            controls
            controlsList="nodownload"
            src={audioUrl}
            className="w-full focus:outline-none custom-audio-player"
            onEnded={() => setPlayCount(prev => prev + 1)}
            onPlay={() => {
              if (isExhausted && audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
              }
            }}
          />
        )}
      </div>
    );
  }

  // If AI generation failed / no audioUrl, render nothing (no fallback)
  return null;
};

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ImageCacheDB', 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'prompt' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const storeImageInDB = async (prompt: string, dataUrl: string) => {
  try {
    const db = await initDB();
    const tx = db.transaction('images', 'readwrite');
    tx.objectStore('images').put({ prompt, dataUrl });
  } catch (e) { console.error("IDB store error", e); }
};

const getImageFromDB = async (prompt: string): Promise<string | null> => {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('images', 'readonly');
      const req = tx.objectStore('images').get(prompt);
      req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
      req.onerror = () => resolve(null);
    });
  } catch (e) { return null; }
};

const imageCache: Record<string, string> = {};

const AIImage = ({ prompt, indices = [0, 1, 2, 3], onImagesLoaded }: { prompt: string, indices?: number[], onImagesLoaded?: (urls: string[]) => void }) => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reloadingIndex, setReloadingIndex] = useState<number | null>(null);

  const generate = async (specificProvider?: number) => {
    if (specificProvider !== undefined) {
      setReloadingIndex(specificProvider);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const currentUrl = specificProvider !== undefined ? images[specificProvider] : undefined;
      const result = await fetchStockImageAction(prompt, specificProvider, currentUrl);

      if (result.success && result.imageOptions) {
        if (specificProvider !== undefined) {
          setImages(prev => {
            const next = [...prev];
            next[specificProvider] = result.imageOptions![0];
            return next;
          });
        } else {
          setImages(result.imageOptions);
          if (onImagesLoaded) {
            const selectedUrls = indices.map(i => result.imageOptions![i]).filter(Boolean);
            onImagesLoaded(selectedUrls);
          }
        }
        setLoading(false);
        setReloadingIndex(null);
      } else {
        if (specificProvider === undefined) {
          setError(result.error || 'Failed to find images');
          setLoading(false);
        } else {
          setReloadingIndex(null);
        }
      }
    } catch (e) {
      console.error('[AIImage] Unexpected error:', e);
      if (specificProvider === undefined) {
        setError('An unexpected error occurred');
        setLoading(false);
      } else {
        setReloadingIndex(null);
      }
    }
  };
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  if (loading) {
    return (
      <div className="w-full aspect-video bg-slate-50 dark:bg-slate-800/20 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 animate-pulse">
        <div className="text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800/30 text-center">
        <p className="text-red-700 dark:text-red-400 text-xs font-bold mb-2">Image Error</p>
        <button
          onClick={() => generate()}
          className="px-4 py-1.5 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full border border-red-200 dark:border-red-800 hover:bg-red-50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const validIndices = indices.filter(idx => !!images[idx]);

  return (
    <div className="grid gap-3 grid-cols-2">
      {indices.map((providerIdx) => {
        const url = images[providerIdx];
        const isReloading = reloadingIndex === providerIdx;

        if (!url) {
          return (
            <div key={providerIdx} className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/20 flex flex-col items-center justify-center gap-2">
              <RefreshCcw className="w-5 h-5 text-slate-400" />
              <button onClick={() => generate(providerIdx)} className="text-[10px] font-bold text-blue-600 hover:underline">Load Photo</button>
            </div>
          );
        }

        return (
          <div key={providerIdx} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-sm transition-all hover:shadow-md hover:scale-[1.01]">
            <img
              src={url}
              alt={`Stock photo ${providerIdx + 1}`}
              className={`w-full h-full object-cover transition-opacity duration-700 ${isReloading ? 'opacity-40 grayscale' : 'opacity-100'}`}
              loading="lazy"
            />

            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded text-[9px] text-white font-bold font-mono opacity-0 group-hover:opacity-100 transition-opacity z-10">
              P{providerIdx + 1}
            </div>

            <button
              onClick={() => generate(providerIdx)}
              disabled={isReloading}
              className={`absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-all hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 z-10 ${isReloading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              title="Reload Photo"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
            </button>

            {isReloading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const WritingHelpSection = ({ title, icon, content, colorClass, borderColorClass, textColorClass, isVisible, onToggle }: { title: string, icon: string, content: string, colorClass: string, borderColorClass: string, textColorClass: string, isVisible: boolean, onToggle: () => void }) => {
  return (
    <div className={`p-4 ${colorClass} border-l-4 ${borderColorClass} rounded-r-lg shadow-sm transition-all duration-300`}>
      <div className="flex justify-between items-center cursor-pointer select-none" onClick={onToggle}>
        <h4 className={`font-bold ${textColorClass} mb-0 flex items-center gap-2`}>
          <span>{icon}</span> {title}
        </h4>
        <button
          type="button"
          className={`${textColorClass} hover:opacity-75 focus:outline-none transition-opacity`}
          title={isVisible ? "Hide" : "Show"}
        >
          {isVisible ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>
      {isVisible && (
        <div className={`text-sm ${textColorClass} leading-relaxed whitespace-pre-line mt-3 pt-3 border-t ${borderColorClass} border-opacity-30 animate-fade-in`}>
          {content}
        </div>
      )}
    </div>
  );
};

const CEFR_TOPICS = [
  "Travel & Tourism", "Work & Career", "Education & Learning", "Environment & Climate",
  "Technology & Innovation", "Health & Lifestyle", "Hobbies & Leisure", "Social Media",
  "Arts & Culture", "Science & Research", "Shopping & Fashion", "Relationships & Family",
  "Food & Nutrition", "Sport & Fitness"
];

const CEFR_LEVELS = [
  { value: 'A1', label: 'A1 Beginner' },
  { value: 'A2', label: 'A2 Key (KET)' },
  { value: 'B1', label: 'B1 Preliminary (PET)' },
  { value: 'B2', label: 'B2 First (FCE)' },
  { value: 'C1', label: 'C1 Advanced (CAE)' },
  { value: 'C2', label: 'C2 Proficiency' },
];

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export default function DashboardPage() {
  const {
    generatedExam,
    setGeneratedExam,
    loading,
    error,
    examType,
    setExamType,
    cefrLevel,
    setCefrLevel,
    topic,
    setTopic,
    examFor,
    setExamFor,
    file,
    setFile,
    generateExam,
    generationInfo,
    setUserEmail,
  } = useExam();

  const { data: session, status } = useSession();
  const router = useRouter();
  const [checkoutBanner, setCheckoutBanner] = useState<'success' | 'canceled' | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [libraryModalSkill, setLibraryModalSkill] = useState<string | null>(null);
  const [librarySelectedLevel, setLibrarySelectedLevel] = useState<string | null>(null);
  const [loadingLibraryTopic, setLoadingLibraryTopic] = useState<string | null>(null);

  const [isTeacher, setIsTeacher] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherCode, setTeacherCode] = useState('');
  const [teacherStatusMsg, setTeacherStatusMsg] = useState('');

  useEffect(() => {
    if (session?.user?.email) {
      isUserTeacher(session.user.email).then(status => {
        setIsTeacher(status);
      });
    }
  }, [session?.user?.email]);

  const handleActivateTeacher = async () => {
    if (!session?.user?.email) return;
    setTeacherStatusMsg('Verifying code...');
    const result = await activateTeacherStatus(session.user.email, teacherCode);
    if (result.success) {
      setIsTeacher(true);
      setTeacherStatusMsg('Success! Teacher features are now active.');
      setTimeout(() => {
        setIsTeacherModalOpen(false);
        setTeacherStatusMsg('');
        setTeacherCode('');
      }, 2000);
    } else {
      setTeacherStatusMsg(result.error || 'Failed to activate.');
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Handle Stripe checkout redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setCheckoutBanner('success');
      window.history.replaceState({}, '', '/dashboard');
      const t = setTimeout(() => setCheckoutBanner(null), 8000);
      return () => clearTimeout(t);
    } else if (params.get('canceled') === 'true') {
      setCheckoutBanner('canceled');
      window.history.replaceState({}, '', '/dashboard');
      const t = setTimeout(() => setCheckoutBanner(null), 6000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleUpgrade = useCallback(async () => {
    if (!session?.user?.email || isUpgrading) return;
    setIsUpgrading(true);
    try {
      const result = await createCheckoutSession(session.user.email);
      if (result.error) {
        alert(`Checkout error: ${result.error}`);
      } else if (result.url) {
        window.location.href = result.url;
      } else {
        alert('Failed to start checkout — no URL returned.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert(`Failed to start checkout: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUpgrading(false);
    }
  }, [session?.user?.email, isUpgrading]);

  const handleManageSubscription = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
      const result = await createPortalSession(session.user.email);
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Portal error:', err);
      alert('Failed to open subscription management. Please try again.');
    }
  }, [session?.user?.email]);

  // Set user email for generation tracking
  useEffect(() => {
    if (session?.user?.email) {
      setUserEmail(session.user.email);
    }
  }, [session?.user?.email, setUserEmail]);

  const [examParts, setExamParts] = useState<ExamPart[]>([]);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [timeLeft, setTimeLeft] = useState(90 * 60); // Default to 90 mins, will update dynamically
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());
  const [revealedPossibleAnswers, setRevealedPossibleAnswers] = useState<Set<string>>(new Set());
  const [revealedImageSets, setRevealedImageSets] = useState<Record<string, boolean>>({});
  const [revealedTips, setRevealedTips] = useState<Set<number>>(new Set());
  const [localError, setLocalError] = useState('');
  const [isLoaderVisible, setIsLoaderVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedExamsList, setSavedExamsList] = useState<any[]>([]);
  const [isSharingProgress, setIsSharingProgress] = useState(false);
  const [helpVisibility, setHelpVisibility] = useState<Record<string, boolean>>({});

  const sortedExams = useMemo(() => {
    if (!savedExamsList || savedExamsList.length === 0) return [];
    return [...savedExamsList].sort((a, b) => {
      if (!!a.is_favorite !== !!b.is_favorite) return a.is_favorite ? -1 : 1;
      return new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime();
    });
  }, [savedExamsList]);

  // Speaking Recording Assessment States
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<{ transcript: string, score: number, feedback: string, suggestion: string } | null>(null);
  const [recordingQuestionId, setRecordingQuestionId] = useState<string | null>(null);
  const [recordingQuestionText, setRecordingQuestionText] = useState<string>('');
  const [recordingImagePrompts, setRecordingImagePrompts] = useState<string[]>([]);
  const [recordingImageUrls, setRecordingImageUrls] = useState<string[]>([]);
  const [loadedSetImages, setLoadedSetImages] = useState<Record<string, string[]>>({});
  const [generatedSetQuestions, setGeneratedSetQuestions] = useState<Record<string, string>>({});
  const [generatedSetAnswers, setGeneratedSetAnswers] = useState<Record<string, string[]>>({});
  const [analyzingSet, setAnalyzingSet] = useState<Record<string, boolean>>({});
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState<number>(60);
  const [recordingMaxTime, setRecordingMaxTime] = useState<number>(60);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cambridge Speaking time limits by CEFR level
  const getRecordingTimeLimit = useCallback((questionId: string) => {
    const isPhotoSet = questionId.includes('-set-');
    const level = (cefrLevel || 'B2').toUpperCase();
    if (isPhotoSet) {
      // Part 2 (Long Turn / Photo Comparison)
      return level === 'C2' ? 120 : 60; // C2 = 2min, all others = 1min
    } else {
      // Part 1 (Interview questions)
      return (level === 'C1' || level === 'C2') ? 45 : 30;
    }
  }, [cefrLevel]);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsAssessing(true);
    }
  }, [mediaRecorder, isRecording]);

  // Auto-stop recording when timer reaches 0
  useEffect(() => {
    if (isRecording && recordingTimeLeft === 0) {
      stopRecording();
    }
  }, [recordingTimeLeft, isRecording, stopRecording]);

  // Writing Assessment States
  const [isWritingModalOpen, setIsWritingModalOpen] = useState(false);
  const [writingContent, setWritingContent] = useState('');
  const [isAssessingWriting, setIsAssessingWriting] = useState(false);
  const [writingAssessmentResult, setWritingAssessmentResult] = useState<{ score: number, feedback: string, suggestion: string } | null>(null);
  const [writingQuestionId, setWritingQuestionId] = useState<string | null>(null);

  // Reading Assessment States
  const [isAssessingReading, setIsAssessingReading] = useState(false);
  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false);
  const [readingAssessmentResult, setReadingAssessmentResult] = useState<{ score: number, feedback: string, suggestion: string } | null>(null);


  const handleSaveAndExit = async () => {
    await handleSaveExam();
    setGeneratedExam('');
    setExamParts([]);
    setExamQuestions([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cpe_exam_data_backup');
      window.location.reload();
    }
  };

  useEffect(() => {
    // Persistence logic: Use generatedExam from context, or fallback to localStorage
    let activeExamData = generatedExam;
    const STORAGE_KEY = 'cpe_exam_data_backup';

    if (activeExamData) {
      // Save with metadata to persist state on refresh
      // NOTE: We try to save a backup, but if it fails (QuotaExceeded), we just continue in-memory.
      const dataToSave = {
        content: activeExamData,
        type: examType,
        level: cefrLevel,
        topic: topic,
        examFor: examFor
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (e) {
        // Only warn once
        if (!(window as any).__ls_quota_warned) {
          console.warn('LocalStorage Quota Exceeded. Active exam will not persist across browser refreshes.');
          (window as any).__ls_quota_warned = true;
        }
      }
    } else if (typeof window !== 'undefined') {
      // Only try to load if we don't have a new one coming in
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        activeExamData = cached;
      }
    }

    if (activeExamData) {
      // Basic structure validation for console/debugging (minimized)
      if (activeExamData.length > 100000) {
        // Don't log or deep-parse huge strings here, just note the size
      } else {
        try {
          const parsedPreview = JSON.parse(activeExamData);
          if (parsedPreview.parts) {
            // Valid structure
          }
        } catch (e) { }
      }

      // Reset all exam-specific state when a new exam is generated
      // Note: On a refresh, these are already at default, so resetting is fine.
      if (generatedExam) {
        setCurrentQuestion(1);
        setAnswers({});
        setScores({});
        setFlagged(new Set());
        setSubmittedQuestions(new Set());
        setRevealedAnswers(new Set());
        setRevealedPossibleAnswers(new Set());
        setRevealedImageSets({});
        setLocalError('');
        setHelpVisibility({});
        setRecordingQuestionId(null);
        setRetryCount({});
        setIsAssessmentModalOpen(false);

        // Set dynamic time limit based on Level and Type
        let timeInMinutes = 90;
        switch (cefrLevel) {
          case 'A1':
          case 'A2':
            if (examType === 'Reading') timeInMinutes = 60; // Reading & Writing is 60m overall, default 60m for context
            else if (examType === 'Writing') timeInMinutes = 60;
            else if (examType === 'Listening') timeInMinutes = 30;
            else if (examType === 'Speaking') timeInMinutes = 10;
            break;
          case 'B1':
            if (examType === 'Reading') timeInMinutes = 45;
            else if (examType === 'Writing') timeInMinutes = 45;
            else if (examType === 'Listening') timeInMinutes = 30;
            else if (examType === 'Speaking') timeInMinutes = 17;
            break;
          case 'B2':
            if (examType === 'Reading') timeInMinutes = 75; // 1 hr 15 mins
            else if (examType === 'Writing') timeInMinutes = 80; // 1 hr 20 mins
            else if (examType === 'Listening') timeInMinutes = 40;
            else if (examType === 'Speaking') timeInMinutes = 14;
            break;
          case 'C1':
            if (examType === 'Reading') timeInMinutes = 90;
            else if (examType === 'Writing') timeInMinutes = 90;
            else if (examType === 'Listening') timeInMinutes = 40;
            else if (examType === 'Speaking') timeInMinutes = 15;
            break;
          case 'C2':
            if (examType === 'Reading') timeInMinutes = 90;
            else if (examType === 'Writing') timeInMinutes = 90;
            else if (examType === 'Listening') timeInMinutes = 40;
            else if (examType === 'Speaking') timeInMinutes = 16;
            break;
        }
        setTimeLeft(timeInMinutes * 60);
      }

      try {
        let rawData;
        try {
          rawData = typeof activeExamData === 'string' ? JSON.parse(activeExamData) : activeExamData;
        } catch (e) {
          console.error("DEBUG: [Dashboard] Initial JSON parse failed:", e);
          rawData = activeExamData;
        }

        let data: any;
        let processedData = rawData;

        // Handle wrapper object from saved exams (contains answers and score)
        // Repeatable unwrap in case of double-wrapping
        let safetyCounter = 0;
        while (processedData && typeof processedData === 'object' && processedData.content && safetyCounter < 3) {
          // Restore answers if available in ANY layer
          if (processedData.answers) {
            setAnswers(processedData.answers);
          }
          if (processedData.scores) setScores(processedData.scores);

          // Restore metadata if available and not currently generating a new exam
          if (!generatedExam) {
            if (processedData.type) setExamType(processedData.type);
            if (processedData.level) setCefrLevel(processedData.level);
            if (processedData.topic) setTopic(processedData.topic);
            if (processedData.examFor) setExamFor(processedData.examFor);
          }

          // Use the inner content for exam generation
          const innerContent = processedData.content;
          processedData = typeof innerContent === 'string' ? JSON.parse(innerContent) : innerContent;
          safetyCounter++;
        }

        // Drill down if we have a single-key object wrapper like {"Writing": ...} or similar
        // But skip if the single key is a known array key like "parts", "exam", etc.
        const knownArrayKeys = ['parts', 'exam', 'tasks', 'writingTasks', 'questions', 'sections'];
        if (processedData && typeof processedData === 'object' && !Array.isArray(processedData)) {
          const keys = Object.keys(processedData);
          if (keys.length === 1 && !knownArrayKeys.includes(keys[0])) {
            const key = keys[0];
            if (processedData[key] && typeof processedData[key] === 'object') {
              processedData = processedData[key];
            }
          } else if (keys.length === 2 && keys.includes('examTitle')) {
            // Handle {examTitle: "...", parts/exam/etc: [...]} — strip examTitle and drill into the other key
            const otherKey = keys.find(k => k !== 'examTitle');
            if (otherKey && typeof processedData[otherKey] === 'object') {
              processedData = processedData[otherKey];
            }
          }
        }

        // Handle potential wrapper objects or direct arrays
        if (Array.isArray(processedData)) {
          data = processedData;
        } else if (processedData?.parts && Array.isArray(processedData.parts)) {
          data = processedData.parts;
        } else if (processedData?.exam && Array.isArray(processedData.exam)) {
          data = processedData.exam;
        } else if (processedData?.tasks && Array.isArray(processedData.tasks)) {
          data = processedData.tasks;
        } else if (processedData?.sections && Array.isArray(processedData.sections)) {
          data = processedData.sections;
        } else if (processedData?.writingTasks && Array.isArray(processedData.writingTasks)) {
          data = processedData.writingTasks;
        } else if (processedData?.title && (processedData?.content || processedData?.text || processedData?.instructions || processedData?.prompt)) {
          data = [processedData];
        } else {
          // Check if the object is a map of parts (e.g. { part1: {...}, part2: {...} })
          const values = processedData && typeof processedData === 'object' ? Object.values(processedData) : [];
          const flattenedValues = values.flat(); // Handles cases like { Part1: [{}], Part2: [{}] }
          const looksLikeParts = flattenedValues.length > 0 && flattenedValues.every((v: any) => v && typeof v === 'object' && (v.title || v.questions || v.content || v.text));
          if (looksLikeParts) {
            data = flattenedValues;
          } else {
            // Last resort: check if any value in the object is an array of objects
            for (const key of Object.keys(processedData || {})) {
              if (Array.isArray(processedData[key]) && processedData[key].length > 0 && typeof processedData[key][0] === 'object') {
                data = processedData[key];
                break;
              }
            }
            if (!data) data = processedData;
          }
        }

        // Normalize data to always be an array
        const partsArray = Array.isArray(data) ? data : [data];

        console.log("DEBUG: [Dashboard] partsArray length:", partsArray.length, "first item keys:", partsArray[0] ? Object.keys(partsArray[0]) : 'N/A');

        const allParts: ExamPart[] = [];
        const allQuestions: Question[] = [];
        let questionIdCounter = 1;
        let validPartsFound = false;

        partsArray.forEach((item: any, index: number) => {
          // Attempt to unwrap if the object has a single key that looks like a part identifier
          let partData = item;
          if (partData && !partData.title && !partData.questions && typeof partData === 'object' && Object.keys(partData).length === 1) {
            const key = Object.keys(partData)[0];
            if (partData[key] && typeof partData[key] === 'object') {
              partData = partData[key];
            }
          }

          // Extract content from various field names the AI might use
          let rawContent = partData?.content || partData?.text || partData?.instructions || partData?.prompt || partData?.description || partData?.scenario || '';

          // Normalize content to always be a string (AI may return arrays of {speaker, transcript} objects)
          let partContent: string;
          if (typeof rawContent === 'string') {
            partContent = rawContent;
          } else if (Array.isArray(rawContent)) {
            partContent = rawContent.map((item: any) => {
              if (typeof item === 'string') return item;
              if (item?.speaker && item?.transcript) return `${item.speaker}: ${item.transcript}`;
              if (item?.speaker && item?.text) return `${item.speaker}: ${item.text}`;
              if (item?.text) return item.text;
              return JSON.stringify(item);
            }).join('\n');
          } else if (typeof rawContent === 'object' && rawContent !== null) {
            if (rawContent.speaker && rawContent.transcript) {
              partContent = `${rawContent.speaker}: ${rawContent.transcript}`;
            } else {
              // Handle labeled text objects (e.g., {"A": "text", "B": "text"} for cross-text matching)
              const keys = Object.keys(rawContent);
              const looksLabeled = keys.every(k => /^[A-Z]$/i.test(k) || /^(Writer|Text|Section)\s*[A-Z]$/i.test(k));
              if (looksLabeled && keys.length > 0) {
                partContent = keys.map(k => `${k}:\n${rawContent[k]}`).join('\n\n');
              } else {
                partContent = JSON.stringify(rawContent);
              }
            }
          } else {
            partContent = String(rawContent || '');
          }

          // Extract questions array — handle various formats
          let questionsArray: any[] = [];
          if (Array.isArray(partData?.questions)) {
            questionsArray = partData.questions;
          } else if (partData?.questions && typeof partData.questions === 'object') {
            // Single question object instead of array
            questionsArray = [partData.questions];
          } else if (Array.isArray(partData?.task)) {
            questionsArray = partData.task;
          } else if (partData?.task && typeof partData.task === 'object') {
            questionsArray = [partData.task];
          } else if (partData?.question && typeof partData.question === 'string') {
            // The part itself has a question field (flat structure)
            questionsArray = [{ question: partData.question, options: partData.options || [], correctOption: partData.correctOption, explanation: partData.explanation }];
          }

          // If no questions found but part has content, create a synthetic question for Writing/Speaking type exams
          if (questionsArray.length === 0 && partData?.title && partContent) {
            questionsArray = [{ question: partData.title, options: [] }];
          }

          // Validate: need at minimum a title (or part number) and either content or questions
          const hasTitle = !!(partData?.title || partData?.partTitle || partData?.name);
          const hasContent = !!partContent;
          const hasQuestions = questionsArray.length > 0;

          if (partData && (hasTitle || hasContent) && (hasContent || hasQuestions)) {
            validPartsFound = true;
            const partNumber = index + 1;
            const rawTitle = partData.title || partData.partTitle || partData.name || `Part ${partNumber}`;
            // Clean up title to remove duplicated "Part X:" prefix from AI generation
            const cleanedTitle = (rawTitle)
              .replace(/^Part\s*\d+\s*[:.]?\s*/i, '')
              .replace(/^Extract\s*\d+\s*[:.]?\s*/i, '')
              .trim();

            allParts.push({
              part: partNumber,
              title: cleanedTitle,
              instructions: partData.instructions || '',
              content: partContent,
              examinerNotes: partData.examinerNotes || '',
              audioUrl: partData.audioUrl,
              audioError: partData.audioError,
              tips: partData.tips,
              modelAnswer: partData.modelAnswer,
              howToApproach: partData.howToApproach,
            });

            questionsArray.forEach((q: any) => {
              allQuestions.push({
                id: questionIdCounter++,
                part: partNumber,
                topic: rawTitle,
                question: q.text || q.question || q.prompt || '',
                options: Array.isArray(q.options)
                  ? q.options.map((opt: any) => {
                    if (typeof opt === 'string') return opt;
                    if (typeof opt === 'object' && opt !== null) return opt.text || opt.value;
                    return null;
                  }).filter((o: unknown): o is string => typeof o === 'string')
                  : [],
                correctOption: q.correctOption,
                explanation: q.explanation,
                imagePrompts: (Array.isArray(q.imagePrompts)
                  ? q.imagePrompts
                  : (typeof q.imagePrompts === 'string' ? [q.imagePrompts] : [])
                ).map((p: any) => {
                  if (typeof p === 'string') return p;
                  if (typeof p === 'object' && p !== null) return p.description || p.text || p.prompt || '';
                  return '';
                }).filter((s: string) => s && s.trim().length > 0),
                possibleAnswers: Array.isArray(q.possibleAnswers)
                  ? q.possibleAnswers.map((ans: any) => {
                    if (typeof ans === 'string') return ans;
                    if (typeof ans === 'object' && ans !== null) {
                      // Attempt to extract the text from common keys the AI might use
                      const extracted = ans.phrase || ans.answer || ans.text || Object.values(ans)[0] || JSON.stringify(ans);
                      return typeof extracted === 'object' ? JSON.stringify(extracted) : String(extracted);
                    }
                    return String(ans);
                  })
                  : [],
                tips: q.tips ? (typeof q.tips === 'object' ? JSON.stringify(q.tips) : String(q.tips)) : '',
                part1Questions: Array.isArray(q.part1Questions)
                  ? q.part1Questions.map((pq: any) => ({
                    ...pq,
                    tip: pq.tip || pq.tips || '',
                  }))
                  : q.part1Questions,
              });
            });
          } else {
            console.warn(`DEBUG: [Dashboard] Part ${index} skipped. hasTitle=${hasTitle}, hasContent=${hasContent}, hasQuestions=${hasQuestions}. Keys:`, partData ? Object.keys(partData) : 'null');
          }
        });

        if (validPartsFound) {
          setExamParts(allParts);
          setExamQuestions(allQuestions);
        } else {
          console.error("DEBUG: [Dashboard] No valid parts found. Raw data keys:", processedData ? Object.keys(processedData) : 'N/A', "partsArray sample:", JSON.stringify(partsArray[0])?.substring(0, 300));
          setExamParts([]);
          setExamQuestions([]);
          setLocalError("Generated exam data is not in the expected format. It should be an array of exam parts, or a single valid exam object.");
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setExamParts([]);
        setExamQuestions([]);
        setLocalError(`Failed to parse the generated exam: ${errorMessage}. Displaying raw content instead.`);
      }
    } else {
      // When generatedExam is cleared (e.g., on new generation), clear parsed data
      setExamParts([]);
      setExamQuestions([]);
      setLocalError('');
      setRevealedAnswers(new Set());
      setRevealedPossibleAnswers(new Set());
      setRevealedImageSets({});
      setHelpVisibility({});
    }
  }, [generatedExam]);

  useEffect(() => {
    if (session?.user?.email) {
      getSavedExams(session.user.email).then((data) => {
        if (data) setSavedExamsList(data);
      });
    }
  }, [session]);

  const handleSaveExam = async () => {
    if (!generatedExam) return;
    setIsSaving(true);

    try {
      if (!session?.user?.email) {
        alert("Please sign in to save exams.");
        return;
      }

      // Calculate score and status
      const totalQ = examQuestions.length;
      const answeredQ = Object.keys(answers).length;
      let correctCount = 0;

      if (examType === 'Speaking' || examType === 'Writing') {
        const scoreValues = Object.values(scores);
        if (scoreValues.length > 0) {
          correctCount = Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length);
        }
      } else {
        examQuestions.forEach(q => {
          if (answers[q.id] === q.correctOption) {
            correctCount++;
          }
        });
      }

      const isFinished = totalQ > 0 && answeredQ === totalQ;

      const examDataToSave = {
        content: generatedExam,
        answers: answers,
        scores: scores,
        score: correctCount,
        totalQuestions: totalQ,
        isFinished: isFinished,
        savedAt: new Date().toISOString(),
        type: examType,
        level: cefrLevel,
        topic: topic,
        examFor: examFor
      };

      const newExam = {
        type: examType,
        level: cefrLevel,
        topic: topic,
        data: JSON.stringify(examDataToSave)
      };

      let saved;
      try {
        saved = await saveExam(newExam, session.user.email);
        if (!saved) throw new Error("Server save returned no result");
      } catch (error) {
        console.warn('Server action failed, attempting client-side save:', error);
        // Fallback to client-side insert if server action fails (e.g. payload too large)
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data, error: clientError } = await supabase
          .from('exams')
          .insert([
            {
              user_email: session.user.email,
              type: newExam.type,
              level: newExam.level,
              topic: newExam.topic,
              data: newExam.data,
            },
          ])
          .select()
          .single();

        if (clientError) throw clientError;
        saved = data;
      }

      if (saved) {
        setSavedExamsList(prev => [saved, ...prev]);
      } else {
        throw new Error("Failed to save exam");
      }
    } catch (err) {
      console.error('Failed to save exam:', err);
      alert('Failed to save exam.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareProgress = async () => {
    setIsSharingProgress(true);
    try {
      // Small delay to ensure any layout shifts are done
      await new Promise(resolve => setTimeout(resolve, 100));

      const element = document.getElementById('progress-tracking-section');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: resolvedTheme === 'dark' ? '#1e293b' : '#ffffff',
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], `cpe-progress-${Date.now()}.png`, { type: 'image/png' });

        if (navigator.share) {
          try {
            await navigator.share({
              title: 'My CEFR Practice Progress',
              text: 'Check out my English exam practice progress on NativeX! 🚀',
              files: [file],
            });
          } catch (error: any) {
            // Fallback for cancel/unsupported
            if (error.name !== 'AbortError') {
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
            }
          }
        } else {
          // Fallback if Web Share API not supported
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `cpe-progress-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png', 0.95);

      setIsSharingProgress(false);
    } catch (err) {
      console.error("Error generating progress image:", err);
      setIsSharingProgress(false);
    }
  };

  const handleFinishTest = async () => {
    const totalQ = examQuestions.length;
    const answeredQ = Object.keys(answers).length;

    let confirmMessage = "Are you sure you want to finish the exam and get your assessment?";

    if (totalQ > 0 && answeredQ < totalQ) {
      confirmMessage = "You haven't finished the exam! Finishing now will affect your progress tracking and overall statistics. Are you sure you want to finish and get your assessment?";
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    // If it's a Reading exam, trigger assessment before clearing if it hasn't been assessed yet
    if (examType === 'Reading' && !isAssessingReading && !readingAssessmentResult) {
      setIsAssessingReading(true);
      setIsReadingModalOpen(false); // Make sure it's closed while loading
      try {
        const result = await assessReadingAction(answers, examQuestions, cefrLevel);
        if (result.success && result.score !== undefined) {
          setReadingAssessmentResult({
            score: result.score,
            feedback: result.feedback || "Good effort.",
            suggestion: result.suggestion || "Keep practicing."
          });
          setIsReadingModalOpen(true);
        } else {
          console.error("Reading Assessment failed:", result.error);
          alert(`Failed to assess the Reading exam: ${result.error || 'Unknown error. Please try again or check your internet connection.'}`);
        }
      } catch (error) {
        console.error("Error calling reading assessment:", error);
        alert("Error assessing exam.");
      } finally {
        setIsAssessingReading(false);
      }
      return;
    }

    // Clear local state and storage to allow generating a new exam
    setExamParts([]);
    setExamQuestions([]);
    localStorage.removeItem('cpe_exam_data_backup');
    window.location.reload();
  };

  const handleLoadSavedExam = async (exam: any) => {
    if (!exam) return;

    if (confirm(`Load "${exam.topic || 'Untitled'}" exam? This will overwrite any current active exam.`)) {
      setIsLoaderVisible(true);

      try {
        let fullExam = exam;

        // If data is missing (due to optimization), fetch it now
        if (!exam.data) {
          const fetched = await getExamById(exam.id);
          if (!fetched || !fetched.data) {
            throw new Error("Could not retrieve exam data");
          }
          fullExam = fetched;
        }

        let parsed;
        if (typeof fullExam.data === 'string') {
          try {
            parsed = JSON.parse(fullExam.data);
          } catch (e) {
            parsed = { content: fullExam.data };
          }
        } else {
          parsed = fullExam.data;
        }

        // Direct state update (Avoids reload and localStorage quota issues)
        const finalContent = parsed.content || fullExam.data;

        // Set primary exam data
        setGeneratedExam(finalContent);

        // Set metadata
        if (parsed.type || fullExam.type) setExamType(parsed.type || fullExam.type);
        if (parsed.level || fullExam.level) setCefrLevel(parsed.level || fullExam.level);
        if (parsed.topic || fullExam.topic) setTopic(parsed.topic || fullExam.topic);
        if (parsed.examFor || fullExam.examFor) setExamFor(parsed.examFor || fullExam.examFor);

        // Restore associated states if they exist in the saved object
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.scores) setScores(parsed.scores);

        // Reset navigation
        setCurrentQuestion(1);
        setIsLoaderVisible(false);

        // Backup to localStorage (best effort only)
        try {
          const STORAGE_KEY = 'cpe_exam_data_backup';
          const dataToSave = {
            content: finalContent,
            type: parsed.type || fullExam.type,
            level: parsed.level || fullExam.level,
            topic: parsed.topic || fullExam.topic,
            examFor: parsed.examFor || fullExam.examFor,
            answers: parsed.answers || {}
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (quotaError) {
          console.warn("Could not backup loaded exam to localStorage (size too large)");
        }

      } catch (e) {
        console.error("Critical failure during handleLoadSavedExam", e);
        setIsLoaderVisible(false);
        alert("An error occurred while loading this exam.");
      }
    }
  };

  const handleDeleteSavedExam = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this saved exam?')) {
      try {
        await deleteSavedExam(id);
        setSavedExamsList(prev => prev.filter(e => e.id !== id));
      } catch (error) {
        console.error("Failed to delete exam", error);
        alert("Failed to delete exam");
      }
    }
  };

  const handleShareExam = async (id: string, topic: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/shared/${id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: topic || 'CEFR Mock Exam',
          text: 'Check out this Cambridge-style English mock exam!',
          url: url,
        });
      } catch (err) {
        console.log('Share canceled or failed:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Public link copied to clipboard:\n' + url);
    }
  };

  const handleToggleFavorite = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();

    // Optimistic update
    setSavedExamsList(prev => prev.map(exam =>
      exam.id === id ? { ...exam, is_favorite: !currentStatus } : exam
    ));

    try {
      await toggleExamFavorite(id, !currentStatus);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      // Revert on error
      setSavedExamsList(prev => prev.map(exam =>
        exam.id === id ? { ...exam, is_favorite: currentStatus } : exam
      ));
      alert('Failed to update favorite status');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateExam();
  };

  const handleLoadPreloadedExam = async (skill: string, level: string, topicName: string) => {
    const slug = slugify(topicName);
    const url = `/library/${skill.toLowerCase()}/${level.toLowerCase()}/${slug}.json`;
    setLoadingLibraryTopic(topicName);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Exam not found (${res.status})`);
      const content = await res.text();
      setExamType(skill);
      setCefrLevel(level);
      setTopic(topicName);
      setGeneratedExam(content);
      // Reset exam state
      setAnswers({});
      setScores({});
      setCurrentQuestion(1);
      setSubmittedQuestions(new Set());
      setRetryCount({});
    } catch (err) {
      console.error('Failed to load preloaded exam:', err);
      alert('This pre-loaded exam is not available yet. Try generating a custom exam instead.');
    } finally {
      setLoadingLibraryTopic(null);
      setLibraryModalSkill(null);
      setLibrarySelectedLevel(null);
    }
  };

  // Timer logic
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSubmitAnswer = async () => {
    if (!answers[currentQuestion] && examType !== 'Speaking' && examType !== 'Writing') {
      // Do not submit if no answer is selected, unless it's a Speaking/Writing exam
      return;
    }

    const activeQuestionData = examQuestions.find(
      q => q.id.toString() === currentQuestion.toString()
    );

    if (examType !== 'Speaking' && examType !== 'Writing' && activeQuestionData) {
      let isCorrect = false;
      const rawCorrectOption = activeQuestionData.correctOption || '';

      if (!activeQuestionData.options || activeQuestionData.options.length === 0) {
        // Text input
        isCorrect = checkTextAnswer(answers[currentQuestion] || '', rawCorrectOption);
      } else {
        // Multiple choice
        let normalizedCorrectLetter = rawCorrectOption.trim();
        const match = rawCorrectOption.match(/^([A-Z])[\.\)]?\s/i);
        if (match) {
          normalizedCorrectLetter = match[1].toUpperCase();
        } else if (rawCorrectOption.trim().length === 1) {
          normalizedCorrectLetter = rawCorrectOption.trim().toUpperCase();
        }

        const ans = answers[currentQuestion] || '';
        isCorrect = ans === normalizedCorrectLetter;

        if (!isCorrect) {
          const cleanOpt = ans.trim().toLowerCase();
          const cleanCorrectOption = rawCorrectOption.trim().toLowerCase().replace(/^(answer:\s*|correct answer:\s*|correct option:\s*)/i, "");
          isCorrect = cleanOpt === cleanCorrectOption
            || cleanCorrectOption === `option ${cleanOpt}`
            || cleanCorrectOption === `letter ${cleanOpt}`
            || (cleanOpt.length > 3 && cleanCorrectOption.includes(cleanOpt))
            || (cleanCorrectOption.length > 3 && cleanOpt.includes(cleanCorrectOption));
        }
      }

      // One attempt only — mark retryCount as done so answer key / possible answers unlock
      setRetryCount(prev => ({ ...prev, [currentQuestion.toString()]: 2 }));
    }

    const newSubmitted = new Set(submittedQuestions);
    newSubmitted.add(currentQuestion.toString());
    setSubmittedQuestions(newSubmitted);

    // AI Assessment Trigger for Reading Exams
    if (examType === 'Reading' && newSubmitted.size === totalQuestions) {
      setIsAssessingReading(true);
      setIsReadingModalOpen(false); // Make sure it's closed while loading
      try {
        const result = await assessReadingAction(answers, examQuestions, cefrLevel);
        if (result.success && result.score !== undefined) {
          setReadingAssessmentResult({
            score: result.score,
            feedback: result.feedback || "Good effort.",
            suggestion: result.suggestion || "Keep practicing."
          });
          setIsReadingModalOpen(true);
        } else {
          console.error("Reading Assessment failed:", result.error);
        }
      } catch (error) {
        console.error("Error calling reading assessment:", error);
      } finally {
        setIsAssessingReading(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (question: number, option: string) => {
    setAnswers(prev => ({ ...prev, [question]: option }));
  };

  const toggleFlag = (question: number) => {
    setFlagged(prev => {
      const newSet = new Set(prev);
      if (newSet.has(question)) {
        newSet.delete(question);
      } else {
        newSet.add(question);
      }
      return newSet;
    });
  };

  const getQuestionNavClass = (q: number) => {
    if (currentQuestion === q) {
      return 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-[#2d2d2d]';
    }
    if (answers[q.toString()]) {
      return 'bg-gray-500 text-white';
    }
    return 'bg-[#3d3d3d] text-gray-300 hover:bg-[#4d4d4d]';
  };

  // Show loader if loading from server OR if we have the raw data but haven't parsed it yet
  const isProcessing = !!generatedExam && examQuestions.length === 0 && examParts.length === 0 && !localError && !error;

  useEffect(() => {
    if (loading || isProcessing) {
      setIsLoaderVisible(true);
    }
  }, [loading, isProcessing]);

  // Calculate overall score (weighted sum of components)
  const calculateTotalScore = (scores: any) => {
    if (!scores) return 0;
    const { grammar, vocabulary, pronunciation, fluency, relevance } = scores;
    return Math.round((grammar * 0.2) + (vocabulary * 0.2) + (pronunciation * 0.2) + (fluency * 0.2) + (relevance * 0.2));
  };

  const adminEmails = ['antoniotagaruma7@gmail.com', 'antoniotagaruma8@gmail.com', 'public.y2026@gmail.com'];
  const isAdmin = mounted && !!(session?.user?.email && adminEmails.includes(session.user.email));
  // Calculate progress stats from saved exams
  const progressStats = useMemo(() => {
    const stats = {
      Reading: { correct: 0, total: 0 },
      Writing: { correct: 0, total: 0 },
      Listening: { correct: 0, total: 0 },
      Speaking: { correct: 0, total: 0 }
    };

    let totalGenerated = 0;
    let totalCompleted = 0;

    savedExamsList.forEach(exam => {
      totalGenerated++;
      if (!exam.data) return; // Skip if data is not loaded (on-demand)

      try {
        const data = typeof exam.data === 'string' ? JSON.parse(exam.data) : exam.data;
        if (data.isFinished) totalCompleted++;

        const type = exam.type as keyof typeof stats;
        if (!stats[type]) return;

        if (type === 'Reading' || type === 'Listening') {
          // Only count answered questions (not total)
          const answeredCount = data.answers ? Object.keys(data.answers).length : 0;
          if (answeredCount > 0) {
            const correctCount = typeof data.score === 'number' ? data.score : 0;
            stats[type].correct += correctCount;
            stats[type].total += answeredCount; // Only count attempted
          }
        } else if (type === 'Writing' || type === 'Speaking') {
          if (data.scores && typeof data.scores === 'object') {
            const answeredIds = Object.keys(data.answers || {});
            stats[type].total += answeredIds.length;
            answeredIds.forEach((id: string) => {
              const qScore = data.scores[id];
              if (typeof qScore === 'number' && qScore >= 6) {
                stats[type].correct += 1;
              }
            });
          } else {
            // Fallback to old behavior if no scores array
            const answeredCount = data.answers ? Object.keys(data.answers).length : 0;
            if (answeredCount > 0 && typeof data.score === 'number') {
              stats[type].total += answeredCount;
              stats[type].correct += data.score >= 6 ? answeredCount : Math.round(answeredCount * (data.score / 10));
            }
          }
        }
      } catch (e) {
        // Ignore malformed data
      }
    });

    let globalCorrect = 0;
    let globalTotal = 0;

    const parsedStats = Object.entries(stats).map(([name, { correct, total }]) => {
      globalCorrect += correct;
      globalTotal += total;
      return {
        name: name === 'Reading' ? 'Reading & Use of English' : name,
        progress: total > 0 ? Math.round((correct / total) * 100) : 0,
        color: name === 'Reading' ? 'bg-blue-500' : name === 'Writing' ? 'bg-purple-500' : name === 'Listening' ? 'bg-green-500' : 'bg-yellow-500'
      };
    });

    return { parsedStats, totalGenerated, totalCompleted, globalCorrect, globalTotal };
  }, [savedExamsList]);

  // Check if the current exam is already saved
  const isCurrentExamSaved = useMemo(() => {
    if (!generatedExam) return false;

    return savedExamsList.some(saved => {
      try {
        const savedData = JSON.parse(saved.data);
        // Check if content matches
        if (savedData.content !== generatedExam) return false;

        // Check if answers match
        const savedAnswers = savedData.answers || {};
        const currentAnswers = answers || {};

        return JSON.stringify(savedAnswers) === JSON.stringify(currentAnswers);
      } catch (e) {
        return false;
      }
    });
  }, [generatedExam, answers, savedExamsList]);

  const totalQuestions = examQuestions.length;
  const activeQuestionData = examQuestions.find(q => q.id === currentQuestion);
  const activePartData = examParts.find(p => p.part === activeQuestionData?.part);

  const [partChangeAnim, setPartChangeAnim] = useState(false);
  const prevPartRef = useRef<number | null>(null);

  useEffect(() => {
    if (examType === 'Listening' && activePartData?.part) {
      if (prevPartRef.current !== null && prevPartRef.current !== activePartData.part) {
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContext();

          const playBeep = (startTime: number) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, startTime); // Standard 1000Hz beep tone

            // Quick fade in and fade out to avoid popping/clicking, lower volume
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
            gainNode.gain.setValueAtTime(0.3, startTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, startTime + 0.12);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.15);
          };

          // Play double beep (Cambridge exam style)
          playBeep(ctx.currentTime);
          playBeep(ctx.currentTime + 0.2); // Second beep 0.2s after the first
        } catch (e) {
          console.error("Audio context error:", e);
        }

        setPartChangeAnim(true);
        setTimeout(() => setPartChangeAnim(false), 1500);
      }
      prevPartRef.current = activePartData.part;
    }
  }, [activePartData?.part, examType]);

  if (status === 'loading') {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const showLoaderModal = loading || isProcessing || isLoaderVisible;

  const anyError = error || localError;
  if (anyError) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">An error occurred!</strong>
          <span className="block sm:inline"> {anyError}</span>
          {localError && !error && <pre className="mt-4 text-left bg-red-50 p-2 rounded text-xs">{generatedExam}</pre>}
        </div>
      </div>
    );
  }

  // Check if we have questions (either from context or restored from storage)
  if (examQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col transition-colors duration-300 relative z-0">
        <OnboardingTour />
        <div className="fixed inset-0 z-[-1] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        {showLoaderModal && (
          <CliLoader
            finished={!loading && !isProcessing}
            onComplete={() => setIsLoaderVisible(false)}
          />
        )}
        {/* Checkout Success/Cancel Banner */}
        {checkoutBanner === 'success' && (
          <div className="bg-green-500 text-white text-center py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 animate-fade-in">
            <span>🎉</span> Welcome to Premium! Your subscription is now active. Enjoy unlimited exams and Listening access.
            <button onClick={() => setCheckoutBanner(null)} className="ml-4 text-white/80 hover:text-white">✕</button>
          </div>
        )}
        {checkoutBanner === 'canceled' && (
          <div className="bg-amber-500 text-white text-center py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 animate-fade-in">
            <span>ℹ️</span> Checkout was canceled. No charges were made.
            <button onClick={() => setCheckoutBanner(null)} className="ml-4 text-white/80 hover:text-white">✕</button>
          </div>
        )}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex justify-between items-center shadow-md sticky top-0 z-20 transition-colors duration-300">
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <svg className="w-8 h-8 text-blue-900 dark:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg> CEFR Mock Exam Practice
          </h1>
          <div id="user-settings-section" className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => {
                const event = new CustomEvent('startOnboardingTour');
                window.dispatchEvent(event);
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors flex items-center justify-center shrink-0"
              title="Help / Tour"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
            </button>
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-orange-50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/60 transition-colors flex items-center justify-center shrink-0"
              title="View Presentation"
            >
              <FileText className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            <button
              onClick={toggleTheme}
              className="h-9 sm:h-10 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-xs sm:text-sm font-bold shrink-0"
              title={isDarkMode ? "Switch to Classic Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? '☀️ Classic' : '🌙 Dark'}
            </button>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs ring-1 ring-blue-200/50 dark:ring-blue-800/50">
                  {(session?.user?.name || session?.user?.email || 'U')[0].toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 hidden md:block">
                  {session?.user?.name || session?.user?.email?.split('@')[0]}
                </span>
              </div>

              {generationInfo && (
                <div className="hidden sm:flex items-center gap-2 ml-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                  {generationInfo.plan === 'admin' ? (
                    <Link
                      href="/admin"
                      className="flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors"
                      title="Admin Dashboard"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Admin</span>
                    </Link>
                  ) : generationInfo.plan === 'premium' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1">
                        ⭐ Premium
                      </span>
                      <button
                        onClick={handleManageSubscription}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                      >
                        Manage
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">Free Plan</span>
                      <button
                        onClick={handleUpgrade}
                        disabled={isUpgrading}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-1 shadow-sm"
                      >
                        {isUpgrading ? '...' : '⚡ Upgrade'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {!isTeacher && !isAdmin && (
              <button onClick={() => setIsTeacherModalOpen(true)} className="p-2 sm:px-3 sm:py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-all shadow-sm flex items-center gap-2" title="Teacher Access">
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-bold">Teacher Access</span>
              </button>
            )}
            <button onClick={() => signOut({ callbackUrl: '/' })} className="p-2 sm:px-3 sm:py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm flex items-center gap-2" title="Sign Out">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-bold">Sign Out</span>
            </button>
          </div>
        </header >
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Saved Exams Column (1/4) */}
            <div id="saved-exams-section" className="lg:col-span-1 bg-white/95 dark:bg-slate-800/95 p-6 rounded-2xl shadow-xl flex flex-col h-[calc(100vh-140px)] lg:h-[82vh] overflow-y-auto custom-scrollbar border border-slate-200/60 dark:border-slate-700/60 transition-colors">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 shrink-0">
                <Library className="w-5 h-5 text-blue-600" strokeWidth={2} />
                Saved Exams
              </h3>

              {sortedExams.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No saved exams found.</p>
              ) : (
                <div className="space-y-3">
                  {sortedExams
                    .map((exam: any) => {
                      let examForLabel = null;
                      if (typeof exam.data === 'string') {
                        const match = exam.data.match(/"examFor"\s*:\s*"([^"]+)"/);
                        if (match && match[1]) {
                          examForLabel = match[1];
                        }
                      } else if (exam.data && typeof exam.data === 'object') {
                        // Fallback if data is already parsed
                        examForLabel = exam.data.examFor || null;
                      }

                      return (
                        <div
                          key={exam.id}
                          onClick={() => handleLoadSavedExam(exam)}
                          className="group p-3 rounded-md border border-slate-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all relative bg-slate-50/50"
                        >
                          <div className="flex justify-between items-center mb-1.5 gap-2">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">{exam.level}</span>
                            <div className="flex flex-row items-center gap-1">
                              <button
                                onClick={(e) => handleToggleFavorite(exam.id, !!exam.is_favorite, e)}
                                className={`transition-colors p-1 ${exam.is_favorite ? 'text-yellow-400 hover:text-yellow-500' : 'text-slate-300 hover:text-yellow-400'}`}
                                title={exam.is_favorite ? "Remove from favorites" : "Add to favorites"}
                              >
                                <Star className="w-4 h-4" fill={exam.is_favorite ? "currentColor" : "none"} strokeWidth={2} />
                              </button>
                              <button
                                onClick={(e) => handleShareExam(exam.id, exam.topic || 'Untitled Exam', e)}
                                className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                                title="Copy Share Link"
                              >
                                <Share2 className="w-4 h-4" strokeWidth={2.5} />
                              </button>
                              {(isAdmin || isTeacher) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/print/${exam.id}`, '_blank');
                                  }}
                                  className="text-slate-400 hover:text-green-600 transition-colors p-1"
                                  title="Download as PDF"
                                >
                                  <Download className="w-4 h-4" strokeWidth={2.5} />
                                </button>
                              )}
                              <button
                                onClick={(e) => handleDeleteSavedExam(exam.id, e)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm line-clamp-2 mb-1 group-hover:text-blue-700 leading-tight">{exam.topic || 'Untitled Exam'}</h4>
                          {examForLabel && <p className="text-[10px] text-slate-500 mb-1">For: <span className="font-semibold text-slate-700">{examForLabel}</span></p>}
                          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2">
                            <span className="uppercase tracking-wide">{exam.type}</span>
                            <span className="text-right">{new Date(exam.created_at || exam.createdAt).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Generator Column (2/4) */}
            <div id="generator-section" className="lg:col-span-2 bg-white/95 dark:bg-slate-800/95 p-5 md:p-6 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col h-[calc(100vh-140px)] lg:h-[82vh] overflow-y-auto custom-scrollbar transition-colors">
              {/* ── Pre-loaded Exams Library ── */}
              <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-slate-200 shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 shrink-0">
                  <Library className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 leading-tight">Pre-loaded Exams</h3>
                  <p className="text-xs text-slate-500 leading-tight">Choose a skill to browse ready-made practice exams.</p>
                </div>
              </div>

              {/* 4 Clean Skill Buttons */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3 relative z-10">
                {([
                  { skill: 'Reading', icon: <BookOpen className="w-5 h-5" />, color: 'blue', locked: false },
                  { skill: 'Writing', icon: <Edit3 className="w-5 h-5" />, color: 'emerald', locked: false },
                  { skill: 'Listening', icon: <Headphones className="w-5 h-5" />, color: 'violet', locked: !!(generationInfo && generationInfo.plan === 'free') },
                  { skill: 'Speaking', icon: <Mic className="w-5 h-5" />, color: 'orange', locked: false },
                ] as const).map(({ skill, icon, locked }) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => {
                      if (locked) return;
                      setLibraryModalSkill(skill);
                      setLibrarySelectedLevel(null);
                    }}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all relative ${locked ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/60 dark:hover:bg-slate-800/80 hover:shadow-sm active:scale-95'}`}
                  >
                    {locked && <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold uppercase bg-amber-100 text-amber-700 px-1 py-0.5 rounded shadow-sm border border-amber-200 tracking-wider">PRO</span>}
                    <span className="text-slate-400 dark:text-slate-500 mb-1.5">{icon}</span>
                    <span className="text-[11px] font-bold">{skill}</span>
                  </button>
                ))}
              </div>

              {/* ── Divider ── */}
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">or create your own</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>

              {/* ── Custom Generator Form ── */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="w-full">
                  <label htmlFor="cefrLevel" className="block text-[11px] font-bold text-slate-600 mb-1">Target CEFR Level</label>
                  <select id="cefrLevel" value={cefrLevel} onChange={(e) => setCefrLevel(e.target.value)} className="w-full rounded-md border-slate-300 border p-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 transition shadow-sm">
                    <option value="A1">A1 Beginner</option>
                    <option value="A2">A2 Key (KET)</option>
                    <option value="B1">B1 Preliminary (PET)</option>
                    <option value="B2">B2 First (FCE)</option>
                    <option value="C1">C1 Advanced (CAE)</option>
                    <option value="C2">C2 Proficiency</option>
                  </select>
                </div>
                {isAdmin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="examFor" className="block text-[11px] font-bold text-slate-600 mb-1">Exam for (Class/Group)</label>
                      <input type="text" id="examFor" value={examFor} onChange={(e) => setExamFor(e.target.value)} placeholder="e.g., Class 10A, Advanced Group..." className="w-full rounded-md border-slate-300 border p-1.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 transition" />
                    </div>
                    <div>
                      <label htmlFor="topic" className="block text-[11px] font-bold text-slate-600 mb-1">Topic / Theme {file ? '(Optional)' : ''}</label>
                      <input type="text" id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Technology, Climate Change..." className="w-full rounded-md border-slate-300 border p-1.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 transition" />
                    </div>
                  </div>
                )}
                {!isAdmin && (
                  <div>
                    <label htmlFor="topic" className="block text-[11px] font-bold text-slate-600 mb-1">Topic / Theme {file ? '(Optional)' : ''}</label>
                    <input type="text" id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Technology, Climate Change..." className="w-full rounded-md border-slate-300 border p-1.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 transition" />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">CEFR Frequently Used Topics</label>
                  <div className="flex flex-wrap gap-1">
                    {CEFR_TOPICS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTopic(t)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${topic === t
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {generationInfo && !generationInfo.allowed && generationInfo.plan === 'free' ? (
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    disabled={isUpgrading}
                    className="w-full mt-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUpgrading ? 'Redirecting...' : 'Upgrade to Premium — Out of Free Credits'}
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded ml-1">🔒</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full mt-2 py-2.5 px-4 rounded-lg text-white font-bold text-sm shadow-md transition-all flex items-center justify-between ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.01] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'}`}
                  >
                    <span>{loading ? 'Generating...' : 'Generate Custom Exam'}</span>
                    {generationInfo && generationInfo.plan === 'free' && !loading && (
                      <div className="flex items-center gap-2 bg-black/10 px-2 py-0.5 rounded text-[11px] font-medium border border-white/10">
                        <span>Free remaining:</span>
                        <span className={`font-bold text-[12px] bg-white text-slate-900 px-1 rounded shadow-sm`}>
                          {Math.max(0, generationInfo.limit - generationInfo.count)}
                        </span>
                      </div>
                    )}
                  </button>
                )}
              </form>
            </div>

            {/* Progress Tracking Column (1/4) */}
            <div id="progress-tracking-section" className="lg:col-span-1 bg-white/95 dark:bg-slate-800/95 p-5 md:p-6 rounded-2xl shadow-xl flex flex-col justify-between h-[calc(100vh-140px)] lg:h-[82vh] overflow-y-auto custom-scrollbar border border-slate-200/60 dark:border-slate-700/60 transition-colors">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-green-600" strokeWidth={2.5} />
                  Progress Tracking
                </h3>
                <button
                  onClick={handleShareProgress}
                  disabled={isSharingProgress}
                  className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 text-xs font-semibold"
                  title="Share Progress"
                >
                  <Share2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {isSharingProgress ? 'Preparing...' : 'Share'}
                </button>
              </div>
              <div className="space-y-4">
                {progressStats.parsedStats.map((skill) => (
                  <div key={skill.name}>
                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      <span>{skill.name}</span>
                      <span>{skill.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div className={`${skill.color} h-2.5 rounded-full transition-all duration-1000`} style={{ width: `${skill.progress}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-4">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Overall Statistics</h4>

                {/* SVG Donut Chart */}
                <div className="flex justify-center mb-6 relative">
                  <div className="w-32 h-32 relative">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      {/* Background circle */}
                      <path
                        className="text-slate-100 dark:text-slate-700"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                      />
                      {/* Progress circle */}
                      <path
                        className="text-green-500 dark:text-green-400 transition-all duration-1000 ease-out"
                        strokeDasharray={`${progressStats.globalTotal > 0 ? (progressStats.globalCorrect / progressStats.globalTotal) * 100 : 0}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                        {progressStats.globalTotal > 0 ? Math.round((progressStats.globalCorrect / progressStats.globalTotal) * 100) : 0}%
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider pt-1">Accuracy</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 rounded-lg">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{progressStats.totalGenerated}</div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wide">Generated</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 rounded-lg">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{progressStats.totalCompleted}</div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wide">Completed</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 p-2 rounded-lg">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">{progressStats.globalCorrect}</div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wide">Correct</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 p-2 rounded-lg">
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">{progressStats.globalTotal > 0 ? progressStats.globalTotal - progressStats.globalCorrect : 0}</div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wide">Wrong</div>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
                <p className="font-bold mb-1">Weekly Goal</p>
                <p>Complete 3 more exams to reach your weekly target!</p>
              </div>
            </div>

          </div>
        </div>

        {isTeacherModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-spring-up overflow-hidden">
              <button
                onClick={() => setIsTeacherModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mb-4">
                  <GraduationCap className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Activate Teacher Tools</h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  Enter your Teacher Access Code to unlock PDF printables and educator features.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Enter Access Code..."
                    value={teacherCode}
                    onChange={(e) => setTeacherCode(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center tracking-widest uppercase"
                  />
                </div>

                {teacherStatusMsg && (
                  <div className={`p-3 rounded-lg text-sm text-center font-semibold ${teacherStatusMsg.includes('Success') || teacherStatusMsg.includes('Already') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : teacherStatusMsg.includes('Checking') || teacherStatusMsg.includes('Verifying') ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                    {teacherStatusMsg}
                  </div>
                )}

                <button
                  onClick={handleActivateTeacher}
                  disabled={!teacherCode || teacherStatusMsg.includes('Verifying')}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {teacherStatusMsg.includes('Verifying') ? 'Verifying...' : 'Activate Account'}
                </button>
              </div>

              <p className="text-xs text-center text-slate-500 dark:text-slate-500 mt-6">
                If you believe you should have access, please contact the administrator for your code.
              </p>
            </div>
          </div>
        )}

        {/* PDF Presentation Modal */}
        {isPdfModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsPdfModalOpen(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col ring-1 ring-slate-200 dark:ring-slate-800" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 shrink-0">
                <h3 className="text-slate-800 dark:text-white font-bold flex items-center gap-2 text-sm sm:text-base">
                  <FileText className="w-5 h-5 text-orange-500" />
                  CEFR Platform Presentation
                </h3>
                <button
                  onClick={() => setIsPdfModalOpen(false)}
                  className="p-1.5 flex items-center gap-1 rounded-lg text-slate-500 font-medium hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                >
                  <span className="hidden sm:inline">Close</span> <X className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full flex-1 bg-slate-200 dark:bg-slate-800 min-h-0">
                <iframe
                  src="/presentation/AI_Powered_CEFR_Mastery.pdf"
                  className="w-full h-full border-none"
                  style={{ minHeight: '60vh' }}
                  title="AI CEFR Mastery Presentation"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  const dynamicSet1Answers = generatedSetAnswers[`${currentQuestion}-set-1`] || [];
  const dynamicSet2Answers = generatedSetAnswers[`${currentQuestion}-set-2`] || [];
  const displayPossibleAnswers = (dynamicSet1Answers.length > 0 || dynamicSet2Answers.length > 0)
    ? [
      ...(dynamicSet1Answers.length > 0 ? ['--- Set 1 (Top Photos) Answers ---', ...dynamicSet1Answers] : []),
      ...(dynamicSet2Answers.length > 0 ? ['--- Set 2 (Bottom Photos) Answers ---', ...dynamicSet2Answers] : [])
    ]
    : (activeQuestionData?.possibleAnswers || []);

  // --- SPEAKING TEST ASSESSMENT LOGIC ---
  const handleMicClick = (targetQuestionId: string, targetQuestionText: string, imagePrompts: string[] = [], imageUrls: string[] = []) => {
    const attempts = retryCount[targetQuestionId] || 0;
    if (attempts >= 2) {
      alert("You have already used your retry for this question.");
      return;
    }
    setRecordingQuestionId(targetQuestionId);
    setRecordingQuestionText(targetQuestionText);
    setRecordingImagePrompts(imagePrompts);
    setRecordingImageUrls(imageUrls);
    setIsAssessmentModalOpen(true);
    // Auto-start recording when modal opens
    startRecording(targetQuestionId, targetQuestionText);
  };

  const startRecording = async (targetQuestionId: string, targetQuestionText: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        // Stop all hardware tracks immediately
        stream.getTracks().forEach(track => track.stop());

        // Convert to Base64 to send to Server Action
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await submitAudioForAssessment(base64Audio, targetQuestionId, targetQuestionText);
        };
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAssessmentResult(null);

      // Start countdown timer
      const timeLimit = getRecordingTimeLimit(targetQuestionId);
      setRecordingMaxTime(timeLimit);
      setRecordingTimeLeft(timeLimit);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTimeLeft(prev => {
          if (prev <= 1) {
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access your microphone. Please check your browser permissions.');
      setIsAssessmentModalOpen(false);
    }
  };

  const submitAudioForAssessment = async (base64Audio: string, targetQuestionId: string, targetQuestionText: string) => {
    try {
      const result = await assessSpeakingAction(base64Audio, targetQuestionText, cefrLevel);

      if (result.success && result.transcript && result.score !== undefined && result.feedback && result.suggestion) {
        setAssessmentResult({
          transcript: result.transcript,
          score: result.score,
          feedback: result.feedback,
          suggestion: result.suggestion
        });

        // Increment attempt count on successful assessment
        setRetryCount(prev => {
          const next: Record<string, number> = { ...prev };
          next[targetQuestionId] = (prev[targetQuestionId] ?? 0) + 1;
          return next;
        });
        setScores(prev => {
          const newScores: Record<string, number> = { ...prev };
          newScores[targetQuestionId] = result.score as number;
          return newScores;
        });
      } else {
        alert(result.error || 'Failed to assess audio.');
      }
    } catch (error) {
      console.error('Assessment failed:', error);
      alert(`An error occurred during assessment: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsAssessing(false);
    }
  };
  // ------------------------------------

  // --- WRITING TEST ASSESSMENT LOGIC ---
  const handleWritingClick = (targetQuestionId: string, currentAnswerContext?: string) => {
    const attempts = retryCount[targetQuestionId] || 0;
    if (attempts >= 2) {
      alert("You have already used your retry for this question.");
      return;
    }
    setWritingQuestionId(targetQuestionId);

    // Auto-fill textarea with current unsaved draft if any, or empty
    const existingDraft = answers[targetQuestionId] || '';
    setWritingContent(existingDraft);

    setWritingAssessmentResult(null);
    setIsAssessingWriting(false);
    setIsWritingModalOpen(true);
  };

  const submitWritingForAssessment = async (targetQuestionId: string, targetQuestionText: string) => {
    if (!writingContent.trim()) {
      alert("Please write an answer before submitting.");
      return;
    }

    setIsAssessingWriting(true);
    setWritingAssessmentResult(null);

    try {
      const result = await assessWritingAction(writingContent, targetQuestionText, cefrLevel);

      if (result.success && result.score !== undefined && result.feedback && result.suggestion) {
        setWritingAssessmentResult({
          score: result.score,
          feedback: result.feedback,
          suggestion: result.suggestion
        });

        // Save the written content to answers object so it isn't lost
        setAnswers(prev => ({ ...prev, [targetQuestionId]: writingContent }));
        setScores(prev => {
          const newScores: Record<string, number> = { ...prev };
          newScores[targetQuestionId] = result.score as number;
          return newScores;
        });

        // Increment attempt count on successful assessment
        setRetryCount(prev => {
          const next: Record<string, number> = { ...prev };
          next[targetQuestionId] = (prev[targetQuestionId] ?? 0) + 1;
          return next;
        });
      } else {
        alert(result.error || 'Failed to assess writing.');
      }
    } catch (error) {
      console.error('Writing assessment failed:', error);
      alert('An error occurred during assessment.');
    } finally {
      setIsAssessingWriting(false);
    }
  };
  // ------------------------------------

  const checkTextAnswer = (userAnswer: string, correctAnswer: string) => {
    if (!userAnswer || !correctAnswer) return false;

    // Normalize spaces and remove punctuation including quotes and question marks
    const normalize = (str: string) => str.trim().toLowerCase().replace(/[.,/#!$%^&*;:{ }=\-_`~()'"?]/g, "").replace(/\s+/g, " ");

    const u = normalize(userAnswer);
    let c = correctAnswer.trim().toLowerCase().replace(/^(answer:\s*|correct answer:\s*|correct option:\s*)/i, "");

    if (u === normalize(c)) return true;

    const possibleAnswers = c.split(/\s*(?:\/|,|\bor\b)\s*/).map(a => normalize(a)).filter(Boolean);
    if (possibleAnswers.length > 0 && possibleAnswers.includes(u)) return true;

    if (u.length > 2 && normalize(c).includes(u)) return true;
    if (normalize(c).length > 2 && u.includes(normalize(c))) return true;

    return false;
  };

  const isSpeakingWideLayout = examType === 'Speaking';
  const isSpeakingPart3 = examType === 'Speaking' && activePartData?.part === 3;

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'A1': return 'A1 Beginner';
      case 'A2': return 'A2 Key (KET)';
      case 'B1': return 'B1 Preliminary (PET)';
      case 'B2': return 'B2 First (FCE)';
      case 'C1': return 'C1 Advanced (CAE)';
      case 'C2': return 'C2 Proficiency';
      default: return level;
    }
  };

  const getExamTypeLabel = (type: string) => {
    return type === 'Reading' ? 'Reading & Use of English' : type;
  };

  return (
    <div className="flex flex-col h-screen bg-[#e9e9e9] dark:bg-slate-950 font-sans text-[#333] dark:text-slate-300 transition-colors duration-300 relative z-0">
      <div className="fixed inset-0 z-[-1] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-300 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-2 sm:py-0 shrink-0 shadow-md z-10 gap-2 sm:gap-0 h-auto sm:h-16 transition-colors duration-300">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <h1 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-slate-100 truncate">{getLevelLabel(cefrLevel)}: {getExamTypeLabel(examType)}</h1>
          <div className="h-6 w-px bg-gray-300 dark:bg-slate-700"></div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 hidden sm:block">Candidate: <span className="font-bold text-black dark:text-white">{mounted ? (session?.user?.name || session?.user?.email) : ''}</span></div>
          {topic && (
            <>
              <div className="h-6 w-px bg-gray-300 dark:bg-slate-700 hidden sm:block"></div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 hidden sm:block">Topic: <span className="font-bold text-black dark:text-white">{topic}</span></div>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center text-xs sm:text-sm font-bold shrink-0"
            title={isDarkMode ? "Switch to Classic Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-400 font-bold">Time Remaining</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-gray-900 dark:text-white">{formatTime(timeLeft)}</span>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/' })} className="bg-red-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm font-bold hover:bg-red-700 transition-colors flex items-center gap-2">
            <span className="hidden sm:inline">Sign Out</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4">
        <div className={`${isSpeakingWideLayout ? 'lg:flex-[1]' : 'flex-1'} bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-xl border border-gray-200/60 dark:border-slate-800/60 overflow-y-auto p-4 sm:p-6 custom-scrollbar transition-colors duration-300`}>
          <div className="max-w-2xl mx-auto">
            <h2 className={`text-xl font-bold mb-4 border-b border-gray-200 dark:border-slate-800 pb-3 transition-transform duration-700 ease-out origin-left ${partChangeAnim ? 'scale-105 text-blue-600 dark:text-blue-400 drop-shadow-md' : 'text-gray-800 dark:text-slate-100'}`}>
              Part {activePartData?.part}{activePartData?.title ? `: ${activePartData.title}` : ''}
            </h2>
            <div className="prose prose-slate max-w-none text-gray-800 dark:text-slate-300 leading-relaxed">
              {(activePartData?.instructions || '').split('\n').filter(line => line.trim()).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
            {activePartData?.content && examType !== 'Speaking' && (
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg">
                <h4 className="font-semibold text-slate-600 dark:text-slate-400 mb-2 text-sm uppercase tracking-wider">
                  {examType === 'Listening' ? 'Audio Track' : 'Context'}
                </h4>

                {examType === 'Listening' ? (
                  <>
                    <AudioPlayer audioUrl={activePartData.audioUrl} />
                    {isAdmin && (
                      <details className="text-xs text-slate-400 mt-2">
                        <summary className="cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Show Transcript (Admin Only)</summary>
                        <p className="mt-2 p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800 italic">{typeof activePartData.content === 'string' ? activePartData.content : JSON.stringify(activePartData.content)}</p>
                      </details>
                    )}
                  </>
                ) : (
                  <div className="prose prose-slate max-w-none text-slate-700 dark:text-slate-300 leading-relaxed">
                    {examType === 'Writing' && activePartData.part === 1 && activePartData.content.includes('---SPLIT---') ? (
                      activePartData.content.split('---SPLIT---').map((text, idx) => (
                        <div key={idx} className="mb-4 p-4 bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 shadow-sm last:mb-0">
                          <h5 className="font-bold text-gray-800 dark:text-slate-200 mb-2 text-xs uppercase tracking-wider">Text {idx + 1}</h5>
                          {text.split('\n').filter(line => line.trim()).map((line, i) => (
                            <p key={i} className="mb-2 last:mb-0">{line}</p>
                          ))}
                        </div>
                      ))
                    ) : (
                      (() => {
                        let textToRender = activePartData.content || '';
                        // Try to parse if it looks like JSON containing exactly what the user asked
                        try {
                          if (textToRender.trim().startsWith('{') && textToRender.trim().endsWith('}')) {
                            const parsed = JSON.parse(textToRender);
                            if (parsed && typeof parsed.passage === 'string') {
                              textToRender = parsed.passage;
                            }
                          }
                        } catch (e) {
                          // ignore parser error, just use as string
                        }

                        // Inject newlines before Pattern "A. ", "B. ", "C. " to break up long blocks in Multiple Matching
                        if (activePartData?.title?.toLowerCase().includes('matching')) {
                          textToRender = textToRender.replace(/([^\n])\s+([A-Z]\.\s+[A-Z])/g, '$1\n\n$2');
                        }

                        return textToRender
                          .replace(/\((\d+)\)\s*[_]{3,}\s*\(\1\)/g, "($1) _________")
                          .split('\n')
                          .filter(line => line.trim())
                          .map((line, index) => (
                            <p key={index} className="mb-4 last:mb-0 leading-relaxed">{line}</p>
                          ));
                      })()
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`${isSpeakingWideLayout ? 'lg:flex-[3]' : 'flex-1'} bg-white dark:bg-slate-900 rounded-md shadow-sm border border-gray-200 dark:border-slate-800 overflow-y-auto p-4 sm:p-6 custom-scrollbar transition-colors duration-300`}>
          <div className={`${isSpeakingWideLayout ? 'max-w-none' : 'max-w-2xl'} mx-auto`}>
            {(examType === 'Writing' || examType === 'Speaking') && (
              <div className="mb-8 space-y-6">
                {activePartData?.howToApproach && (
                  <WritingHelpSection
                    key={`approach-${activePartData.part}`}
                    title="How to Approach"
                    icon="🚀"
                    content={activePartData.howToApproach}
                    colorClass="bg-purple-50"
                    borderColorClass="border-purple-400"
                    textColorClass="text-purple-800"
                    isVisible={!!helpVisibility[`${activePartData.part}-approach`]}
                    onToggle={() => setHelpVisibility(prev => ({ ...prev, [`${activePartData.part}-approach`]: !prev[`${activePartData.part}-approach`] }))}
                  />
                )}

                {activePartData?.tips && (
                  <WritingHelpSection
                    key={`tips-${activePartData.part}`}
                    title="Tips & Strategies"
                    icon="💡"
                    content={activePartData.tips}
                    colorClass="bg-yellow-50"
                    borderColorClass="border-yellow-400"
                    textColorClass="text-yellow-800"
                    isVisible={!!helpVisibility[`${activePartData.part}-tips`]}
                    onToggle={() => setHelpVisibility(prev => ({ ...prev, [`${activePartData.part}-tips`]: !prev[`${activePartData.part}-tips`] }))}
                  />
                )}

                {activePartData?.modelAnswer && (isAdmin || retryCount[activeQuestionData?.id.toString() || ''] >= 2) && (
                  <WritingHelpSection
                    key={`model-${activePartData.part}`}
                    title="Model Answer"
                    icon="📝"
                    content={(activePartData.modelAnswer || '').replace(/\n{3,}/g, '\n\n')}
                    colorClass="bg-blue-50"
                    borderColorClass="border-blue-400"
                    textColorClass="text-blue-800"
                    isVisible={!!helpVisibility[`${activePartData.part}-model`]}
                    onToggle={() => setHelpVisibility(prev => ({ ...prev, [`${activePartData.part}-model`]: !prev[`${activePartData.part}-model`] }))}
                  />
                )}
                {activePartData?.modelAnswer && !isAdmin && (retryCount[activeQuestionData?.id.toString() || ''] || 0) < 2 && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center text-sm text-slate-500 italic flex items-center justify-center gap-2">
                    <span>🔒</span> Attempt this question {2 - (retryCount[activeQuestionData?.id.toString() || ''] || 0)} more time{(2 - (retryCount[activeQuestionData?.id.toString() || ''] || 0)) === 1 ? '' : 's'} to unlock the Model Answer.
                  </div>
                )}
              </div>
            )}

            {examType !== 'Speaking' && examType !== 'Writing' && (
              <h3 className="text-lg font-bold mb-4 text-gray-800 bg-gray-100 p-3 rounded border-l-4 border-blue-500">
                Question {currentQuestion}
              </h3>
            )}

            {activeQuestionData && (
              <div className="space-y-6">
                <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${isSpeakingPart3 ? 'flex flex-col gap-6' : ''}`}>
                  <div className="w-full">
                    {activeQuestionData.part1Questions && activeQuestionData.part1Questions.length > 0 ? (
                      <div className="space-y-6">
                        <div className="font-semibold text-gray-800 mb-4">{activeQuestionData.question}</div>
                        {activeQuestionData.part1Questions.map((item, idx) => {
                          const questionId = `${activeQuestionData.id}-p1-${idx}`;
                          const isRecordingThis = isRecording && recordingQuestionId === questionId;
                          return (
                            <div key={idx} className="p-4 bg-white rounded border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <p className="font-semibold text-gray-900">{idx + 1}. {item.question}</p>
                                  {examType === 'Speaking' && (
                                    <button
                                      onClick={() => handleMicClick(questionId, item.question)}
                                      className={`p-2 rounded-full shadow-sm transition-all transform hover:scale-105 shrink-0
                                        ${isRecordingThis ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/60'}`}
                                      title={isRecordingThis ? 'Recording...' : 'Record Answer'}
                                    >
                                      {isRecordingThis ? <div className="w-4 h-4 bg-white rounded-sm"></div> : <Mic className="w-5 h-5" />}
                                    </button>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 flex gap-2 items-start">
                                  <span className="font-bold text-yellow-600 shrink-0">Tips:</span>
                                  <span>{item.tip}</span>
                                </div>
                              </div>
                              <div className="flex-1 md:border-l md:border-gray-100 md:pl-4">
                                {isAdmin || (retryCount[questionId] >= 2) ? (
                                  <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded border border-blue-100 h-full">
                                    <span className="font-bold text-blue-800 block mb-1">Possible Answer:</span>
                                    {item.answer}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded border border-gray-100 h-full flex items-center justify-center italic text-center">
                                    <span>🔒 Attempt this question {2 - (retryCount[questionId] || 0)} more time{(2 - (retryCount[questionId] || 0)) === 1 ? '' : 's'} to unlock the possible answer.</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`mb-4 ${examType === 'Listening' ? 'text-xl font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            {(() => {
                              const rawQ = activeQuestionData.question || '';
                              // Normalize: replace <br/>, <br>, <br /> with \n
                              let normalized = rawQ.replace(/<br\s*\/?>/gi, '\n');
                              const lines = normalized.split('\n').filter(l => l.trim());
                              const introLines: string[] = [];
                              const bulletItems: string[] = [];
                              let foundBullet = false;
                              for (const line of lines) {
                                const trimmed = line.trim();
                                // Detect bullet: starts with *, -, •, or numbered like "1."
                                if (/^[\*\-\•]\s+/.test(trimmed) || /^\d+[\.\)]\s+/.test(trimmed)) {
                                  foundBullet = true;
                                  bulletItems.push(trimmed.replace(/^[\*\-\•]\s+/, '').replace(/^\d+[\.\)]\s+/, ''));
                                } else if (foundBullet) {
                                  // If we already found bullets, treat remaining non-bullet as bullet too
                                  bulletItems.push(trimmed);
                                } else {
                                  introLines.push(trimmed);
                                }
                              }
                              return (
                                <>
                                  {introLines.map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                                  {bulletItems.length > 0 && (
                                    <ul className="list-disc list-inside space-y-1 mt-2 ml-2 text-gray-700 font-normal">
                                      {bulletItems.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          {examType === 'Speaking' && (!activeQuestionData.imagePrompts || activeQuestionData.imagePrompts.length === 0) && (
                            <div className="shrink-0 mt-1">
                              <button
                                onClick={() => handleMicClick(`main-${activeQuestionData.id}`, activeQuestionData.question)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-sm transition-all transform hover:scale-105 shrink-0
                                  ${isRecording && recordingQuestionId === `main-${activeQuestionData.id}` ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600'}`}
                                title="Record Answer"
                              >
                                {isRecording && recordingQuestionId === `main-${activeQuestionData.id}` ? (
                                  <><div className="w-3 h-3 bg-white rounded-sm"></div> Recording...</>
                                ) : (
                                  <><Mic className="w-4 h-4" /> Answer</>
                                )}
                              </button>
                            </div>
                          )}
                          {/* Inline Action Button */}
                          <div className="shrink-0 mt-1 ml-2 flex flex-col items-end gap-2">
                            <button
                              onClick={() => {
                                const isSubmitted = submittedQuestions.has(currentQuestion.toString());
                                if (isSubmitted) {
                                  if (currentQuestion < totalQuestions) {
                                    setCurrentQuestion(q => q + 1);
                                  }
                                } else {
                                  handleSubmitAnswer();
                                }
                              }}
                              disabled={(!submittedQuestions.has(currentQuestion.toString()) && !answers[currentQuestion.toString()] && examType !== 'Speaking' && examType !== 'Writing') || (submittedQuestions.has(currentQuestion.toString()) && currentQuestion === totalQuestions)}
                              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                              {submittedQuestions.has(currentQuestion.toString()) ? (
                                <>Next <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></>
                              ) : (
                                examType === 'Speaking' || examType === 'Writing' ? 'Done' : 'Submit'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}


                    {activeQuestionData.imagePrompts && activeQuestionData.imagePrompts.length > 0 && (
                      <div className="mb-6 space-y-6">
                        {[1, 2].map((setId) => {
                          const setKey = `${activeQuestionData.id}-set-${setId}`;
                          const isRevealed = !!revealedImageSets[setKey];
                          const primaryPrompt = activeQuestionData.topic || "Speaking Subject";
                          const indices = setId === 1 ? [0, 1] : [2, 3];
                          const levelForAnalysis = cefrLevel || 'B2';

                          return (
                            <div key={setId} className="bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                  <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center text-xs">{setId}</span>
                                  Visual Material {setId}
                                </h4>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setRevealedImageSets(prev => ({ ...prev, [setKey]: !prev[setKey] }))}
                                    className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    title={isRevealed ? "Hide Images" : "Show Images"}
                                  >
                                    {isRevealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </button>
                                </div>
                              </div>

                              {isRevealed && (
                                <div className="animate-fade-in mb-4">
                                  <AIImage prompt={primaryPrompt} indices={indices} onImagesLoaded={(urls) => {
                                    setLoadedSetImages(prev => ({ ...prev, [setKey]: urls }));
                                    // Trigger AI photo analysis to generate a relevant question
                                    if (!generatedSetQuestions[setKey] && urls.length >= 2) {
                                      setAnalyzingSet(prev => ({ ...prev, [setKey]: true }));
                                      analyzePhotosAction(urls, levelForAnalysis).then(result => {
                                        if (result.success && result.question) {
                                          setGeneratedSetQuestions(prev => ({ ...prev, [setKey]: result.question! }));
                                          if (result.possibleAnswers && result.possibleAnswers.length > 0) {
                                            setGeneratedSetAnswers(prev => ({ ...prev, [setKey]: result.possibleAnswers! }));
                                          }
                                        }
                                        setAnalyzingSet(prev => ({ ...prev, [setKey]: false }));
                                      }).catch(() => {
                                        setAnalyzingSet(prev => ({ ...prev, [setKey]: false }));
                                      });
                                    }
                                  }} />
                                </div>
                              )}

                              {/* AI-Generated Question for this set */}
                              {generatedSetQuestions[setKey] && (
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl">
                                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Task</p>
                                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{generatedSetQuestions[setKey]}</p>
                                </div>
                              )}
                              {analyzingSet[setKey] && (
                                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                  <p className="text-xs text-slate-500 dark:text-slate-400">Analyzing photos to generate a relevant question...</p>
                                </div>
                              )}

                              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic max-w-[200px]">
                                  {setId === 1 ? 'Comparing Photos from Provider 1 & 2' : 'Comparing Photos from Provider 3 & 4'}
                                </p>
                                <button
                                  onClick={() => {
                                    const question = generatedSetQuestions[setKey] || `Here are your photographs. I'd like you to compare the photographs, and say ${setId === 1 ? 'which shows a more positive experience.' : 'how the people might be feeling in each situation.'}`;
                                    handleMicClick(setKey, question, [], loadedSetImages[setKey] || []);
                                  }}
                                  disabled={analyzingSet[setKey]}
                                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold font-mono shadow-md transition-all transform hover:scale-[1.03] w-full md:w-auto justify-center
                                     ${isRecording && recordingQuestionId === setKey ? 'bg-red-500 text-white animate-pulse' : analyzingSet[setKey] ? 'bg-slate-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                >
                                  {isRecording && recordingQuestionId === setKey ? (
                                    <><div className="w-3 h-3 bg-white rounded-sm"></div> Recording...</>
                                  ) : analyzingSet[setKey] ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                                  ) : (
                                    <><Mic className="w-4 h-4" /> Record Set {setId}</>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {activeQuestionData.options && activeQuestionData.options.length > 0 ? (
                      <>
                        <div className={`
                          ${activePartData?.title?.toLowerCase().includes('matching')
                            ? 'grid grid-cols-2 sm:grid-cols-3 gap-3'
                            : 'space-y-3'
                          }
                        `}>
                          {activeQuestionData.options.map((opt, index) => {
                            const letter = String.fromCharCode('A'.charCodeAt(0) + index);
                            const isSubmitted = submittedQuestions.has(currentQuestion.toString());
                            const rawCorrectOption = activeQuestionData.correctOption || '';
                            let normalizedCorrectLetter = rawCorrectOption.trim();
                            const match = rawCorrectOption.match(/^([A-Z])[\.\)]?\s/i);
                            if (match) {
                              normalizedCorrectLetter = match[1].toUpperCase();
                            } else if (rawCorrectOption.trim().length === 1) {
                              normalizedCorrectLetter = rawCorrectOption.trim().toUpperCase();
                            }

                            const cleanOpt = opt.trim().toLowerCase();
                            const cleanCorrectOption = rawCorrectOption.trim().toLowerCase().replace(/^(answer:\s*|correct answer:\s*|correct option:\s*)/i, "");

                            const isCorrectAnswer = letter === normalizedCorrectLetter
                              || cleanOpt === cleanCorrectOption
                              || cleanCorrectOption === `option ${letter.toLowerCase()}`
                              || cleanCorrectOption === `letter ${letter.toLowerCase()}`
                              || (cleanOpt.length > 3 && cleanCorrectOption.includes(cleanOpt))
                              || (cleanCorrectOption.length > 3 && cleanOpt.includes(cleanCorrectOption));

                            const isSelected = answers[currentQuestion.toString()] === letter;

                            let optionClass = "border-gray-200 hover:bg-blue-50 hover:border-blue-400";
                            if (isSubmitted) {
                              if (isCorrectAnswer) {
                                optionClass = "border-green-500 bg-green-50 ring-2 ring-green-500";
                              } else if (isSelected && !isCorrectAnswer) {
                                optionClass = "border-red-500 bg-red-50 ring-2 ring-red-500";
                              } else {
                                optionClass = "border-gray-200 opacity-60";
                              }
                            }

                            const isMatching = activePartData?.title?.toLowerCase().includes('matching');

                            if (isSubmitted && !isSelected && !isCorrectAnswer) {
                              return null; // Hide distractors
                            }

                            const displayOpt = opt.replace(/^[A-Z][\.\)]\s*/i, "").trim();

                            return isMatching ? (
                              <label key={opt} className={`relative flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 transition-all cursor-pointer group ${isSubmitted
                                ? isCorrectAnswer
                                  ? 'border-green-500 bg-green-50'
                                  : (isSelected && !isCorrectAnswer) ? 'border-red-500 bg-red-50' : 'border-gray-200 opacity-60'
                                : isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:bg-slate-50'
                                }`}>
                                <input
                                  type="radio"
                                  name={`q${currentQuestion}`}
                                  className="sr-only"
                                  checked={isSelected}
                                  onChange={() => handleAnswer(currentQuestion, letter)}
                                  disabled={isSubmitted}
                                />
                                <div className={`text-lg font-bold ${displayOpt.toUpperCase() !== letter ? 'mb-1' : ''} ${isSelected ? 'text-blue-700' : 'text-gray-500 group-hover:text-blue-500'}`}>{letter}</div>
                                {displayOpt.toUpperCase() !== letter && (
                                  <div className="text-xs text-center text-gray-700 font-medium line-clamp-3">{displayOpt}</div>
                                )}
                                {isSubmitted && isCorrectAnswer && <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-sm"><Check className="w-3 h-3" strokeWidth={3} /></div>}
                                {isSubmitted && isSelected && !isCorrectAnswer && <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm"><X className="w-3 h-3" strokeWidth={3} /></div>}
                              </label>
                            ) : (
                              <label key={opt} className={`flex items-center gap-3 p-3 bg-white rounded-md border transition-all group ${isSubmitted ? '' : 'cursor-pointer'} ${optionClass}`}>
                                <input
                                  type="radio"
                                  name={`q${currentQuestion}`}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                  checked={isSelected}
                                  onChange={() => handleAnswer(currentQuestion, letter)}
                                  disabled={isSubmitted}
                                />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                  <span className="font-bold mr-2 text-gray-900">{letter}</span>
                                  {displayOpt}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    ) : examType === 'Speaking' ? (
                      <div className="text-sm text-slate-500 italic mt-6">
                        Click the microphone icon next to a question to record your answer.
                      </div>
                    ) : examType === 'Writing' ? (
                      <div className="mt-6 flex flex-col gap-4">
                        <div className="text-sm text-slate-500 italic">
                          Click below to open the writing assessment editor.
                        </div>
                        <button
                          onClick={() => handleWritingClick(activeQuestionData.id.toString(), activeQuestionData.question)}
                          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold shadow-md transition-all transform hover:scale-[1.02]
                            ${answers[activeQuestionData.id.toString()] ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200' : 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600'}`}
                          title="Open Writing Editor"
                        >
                          <Pencil className="w-5 h-5" />
                          {answers[activeQuestionData.id.toString()] ? 'Edit Written Answer' : 'Write Answer'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={answers[currentQuestion.toString()] || ''}
                            onChange={(e) => handleAnswer(currentQuestion, e.target.value)}
                            disabled={submittedQuestions.has(currentQuestion.toString())}
                            placeholder={activePartData?.title?.toLowerCase().includes('gap') || activePartData?.title?.toLowerCase().includes('cloze') ? "Type the missing word(s)..." : "Type your answer here..."}
                            className={`flex-1 p-3 rounded-md border outline-none transition-all ${submittedQuestions.has(currentQuestion.toString())
                              ? checkTextAnswer(answers[currentQuestion.toString()] || '', activeQuestionData.correctOption || '')
                                ? 'border-green-500 bg-green-50 text-green-900'
                                : 'border-red-500 bg-red-50 text-red-900'
                              : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                              }`}
                          />
                          <button
                            onClick={() => setRevealedAnswers(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(currentQuestion.toString())) newSet.delete(currentQuestion.toString());
                              else newSet.add(currentQuestion.toString());
                              return newSet;
                            })}
                            disabled={!submittedQuestions.has(currentQuestion.toString())}
                            className={`px-3 flex items-center justify-center rounded-md border transition-all ${submittedQuestions.has(currentQuestion.toString())
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300 cursor-pointer'
                              : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-60'
                              }`}
                            title={!submittedQuestions.has(currentQuestion.toString()) ? "Submit an answer first to unlock" : revealedAnswers.has(currentQuestion.toString()) ? "Hide Answer" : "Show Answer"}
                          >
                            {revealedAnswers.has(currentQuestion.toString()) ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        {revealedAnswers.has(currentQuestion.toString()) && (
                          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-100">
                            <span className="font-bold">Answer:</span> {activeQuestionData.correctOption}
                          </div>
                        )}
                        {submittedQuestions.has(currentQuestion.toString()) && !checkTextAnswer(answers[currentQuestion.toString()] || '', activeQuestionData.correctOption || '') && (
                          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                            <span className="font-bold">Correct Answer:</span> {activeQuestionData.correctOption}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isSpeakingPart3 && (activeQuestionData.tips || (displayPossibleAnswers && displayPossibleAnswers.length > 0)) && (
                    <div className="w-full space-y-4 pt-4 border-t border-gray-200 mt-2">

                      {activeQuestionData.tips && (
                        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg shadow-sm">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-yellow-800 flex items-center gap-2">
                              <span>💡</span> Tips
                            </h4>
                            <button
                              onClick={() => setRevealedTips(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(currentQuestion)) newSet.delete(currentQuestion);
                                else newSet.add(currentQuestion);
                                return newSet;
                              })}
                              className="text-yellow-600 hover:text-yellow-800 p-1 rounded hover:bg-yellow-100 transition-colors"
                              title={revealedTips.has(currentQuestion) ? "Hide Tips" : "Show Tips"}
                            >
                              {revealedTips.has(currentQuestion) ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              )}
                            </button>
                          </div>
                          {revealedTips.has(currentQuestion) && (
                            <p className="text-sm text-yellow-800 leading-relaxed mt-2 animate-fade-in">{activeQuestionData.tips}</p>
                          )}
                        </div>
                      )}

                      {displayPossibleAnswers && displayPossibleAnswers.length > 0 && (
                        <div className="p-4 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-indigo-800 flex items-center gap-2">
                              <span>🗣️</span> Possible Answers / Useful Language
                            </h4>
                            {isAdmin || (retryCount[activeQuestionData.id.toString()] >= 2) ? (
                              <button
                                onClick={() => setRevealedPossibleAnswers(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(activeQuestionData.id.toString())) newSet.delete(activeQuestionData.id.toString());
                                  else newSet.add(activeQuestionData.id.toString());
                                  return newSet;
                                })}
                                className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-100 transition-colors"
                                title={revealedPossibleAnswers.has(activeQuestionData.id.toString()) ? "Hide" : "Show"}
                              >
                                {revealedPossibleAnswers.has(activeQuestionData.id.toString()) ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                )}
                              </button>
                            ) : null}
                          </div>
                          {isAdmin || (retryCount[activeQuestionData.id.toString()] >= 2) ? (
                            revealedPossibleAnswers.has(activeQuestionData.id.toString()) && (
                              <ul className="list-disc list-inside text-sm text-indigo-800 space-y-1 animate-fade-in">
                                {displayPossibleAnswers.map((ans, idx) => (
                                  <li key={idx} className="leading-relaxed">{ans}</li>
                                ))}
                              </ul>
                            )
                          ) : (
                            <p className="text-sm text-gray-500 italic flex items-center gap-2 mt-2">
                              <span>🔒</span> Attempt this question {2 - (retryCount[activeQuestionData.id.toString()] || 0)} more time{(2 - (retryCount[activeQuestionData.id.toString()] || 0)) === 1 ? '' : 's'} to unlock possible answers.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {submittedQuestions.has(currentQuestion.toString()) && (
                  <div className="mt-6 mb-4 overflow-hidden animate-[expand-down_0.5s_ease-out_forwards]">
                    <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg shadow-sm">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div>
                          <h4 className="font-bold text-blue-800">Rationale</h4>
                          <p className="text-sm text-gray-700 mt-1">{activeQuestionData.explanation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isSpeakingPart3 && (activeQuestionData.tips || (displayPossibleAnswers && displayPossibleAnswers.length > 0)) && (
                  <div className="space-y-4 transition-all duration-700 ease-in-out transform origin-top">
                    {activeQuestionData.tips && (
                      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg shadow-sm mt-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-yellow-800 flex items-center gap-2">
                            <span>💡</span> Tips
                          </h4>
                          <button
                            onClick={() => setRevealedTips(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(currentQuestion)) newSet.delete(currentQuestion);
                              else newSet.add(currentQuestion);
                              return newSet;
                            })}
                            className="text-yellow-600 hover:text-yellow-800 p-1 rounded hover:bg-yellow-100 transition-colors"
                            title={revealedTips.has(currentQuestion) ? "Hide Tips" : "Show Tips"}
                          >
                            {revealedTips.has(currentQuestion) ? (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            )}
                          </button>
                        </div>
                        {revealedTips.has(currentQuestion) && (
                          <p className="text-sm text-yellow-800 leading-relaxed mt-2 animate-fade-in">{activeQuestionData.tips}</p>
                        )}
                      </div>
                    )}



                    {examType === 'Writing' && activeQuestionData.modelAnswer && (
                      <div className="p-4 bg-emerald-50 border-l-4 border-emerald-400 rounded-r-lg shadow-sm">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                            <span>📝</span> Model Answer
                          </h4>
                          {isAdmin || (retryCount[currentQuestion.toString()] >= 2) ? (
                            <button
                              onClick={() => setRevealedPossibleAnswers(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has('model' + currentQuestion.toString())) newSet.delete('model' + currentQuestion.toString());
                                else newSet.add('model' + currentQuestion.toString());
                                return newSet;
                              })}
                              className="px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md border border-emerald-300 transition-colors"
                              title={revealedPossibleAnswers.has('model' + currentQuestion.toString()) ? "Hide Model Answer" : "Show Model Answer"}
                            >
                              {revealedPossibleAnswers.has('model' + currentQuestion.toString()) ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          ) : (
                            <div className="flex items-center justify-center px-3 bg-slate-50 border border-slate-200 text-slate-400 rounded-md cursor-help" title={`Try answering ${2 - (retryCount[currentQuestion.toString()] || 0)} more time(s) to unlock`}>
                              <span className="text-xs font-medium">🔒</span>
                            </div>
                          )}
                        </div>
                        {isAdmin || (retryCount[currentQuestion.toString()] >= 2) ? (
                          revealedPossibleAnswers.has('model' + currentQuestion.toString()) && (
                            <div className="mt-2 text-sm text-emerald-800 bg-emerald-100/50 p-3 rounded-md border border-emerald-200 animate-fade-in font-medium whitespace-pre-line leading-relaxed">
                              {activeQuestionData.modelAnswer}
                            </div>
                          )
                        ) : null}
                      </div>
                    )}

                    {displayPossibleAnswers && displayPossibleAnswers.length > 0 && (
                      <div className="p-4 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-indigo-800 flex items-center gap-2">
                            <span>🗣️</span> Possible Answers / Useful Language
                          </h4>
                          {isAdmin || (retryCount[activeQuestionData.id.toString()] >= 2) ? (
                            <button
                              onClick={() => setRevealedPossibleAnswers(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(activeQuestionData.id.toString())) newSet.delete(activeQuestionData.id.toString());
                                else newSet.add(activeQuestionData.id.toString());
                                return newSet;
                              })}
                              className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-100 transition-colors"
                              title={revealedPossibleAnswers.has(activeQuestionData.id.toString()) ? "Hide" : "Show"}
                            >
                              {revealedPossibleAnswers.has(activeQuestionData.id.toString()) ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              )}
                            </button>
                          ) : null}
                        </div>
                        {isAdmin || (retryCount[activeQuestionData.id.toString()] >= 2) ? (
                          revealedPossibleAnswers.has(activeQuestionData.id.toString()) && (
                            <ul className="list-disc list-inside text-sm text-indigo-800 space-y-1 animate-fade-in">
                              {displayPossibleAnswers.map((ans, idx) => (
                                <li key={idx} className="leading-relaxed">{ans}</li>
                              ))}
                            </ul>
                          )
                        ) : (
                          <p className="text-sm text-gray-500 italic flex items-center gap-2 mt-2">
                            <span>🔒</span> Attempt this question {2 - (retryCount[activeQuestionData.id.toString()] || 0)} more time{(2 - (retryCount[activeQuestionData.id.toString()] || 0)) === 1 ? '' : 's'} to unlock possible answers.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {submittedQuestions.has(currentQuestion.toString()) && activePartData?.examinerNotes && (
                  <div className="mt-4 overflow-hidden animate-slide-down" style={{ animationDelay: '150ms' }}>
                    <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg shadow-sm">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m12.728 0l.707-.707M6.343 17.657l-.707-.707m12.728 0l.707-.707M12 21v-1m-4-4H7v4h1v-4zm8 0h1v4h-1v-4z" /></svg>
                        <div>
                          <h4 className="font-bold text-green-800">Part Examiner Notes</h4>
                          <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{activePartData.examinerNotes}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Global Assessment Modal overlay */}
        {isAssessmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 transform transition-all h-[95vh]">

              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-3">
                  {isRecording ? <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse ring-4 ring-red-500/30"></span> : '🎤'} Speaking Assessment
                </h3>
                {!isRecording && !isAssessing && (
                  <button onClick={() => setIsAssessmentModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>

              <div className="p-0 flex flex-col lg:flex-row h-full overflow-hidden w-full">

                {/* LEFT PANE: Task Prompt & Images */}
                <div className={`p-6 flex-none flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 w-full transition-all duration-700 ease-in-out ${isRecording ? 'lg:w-[75%]' : 'lg:w-[50%]'}`}>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-3 uppercase tracking-wider flex items-center gap-2 shrink-0">
                      Task Prompt
                    </p>
                    <div className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-relaxed whitespace-pre-wrap shrink-0">
                      {(() => {
                        const rawQ = recordingQuestionText || '';
                        let normalized = rawQ.replace(/<br\s*\/?>/gi, '\n');
                        const lines = normalized.split('\n').filter(l => l.trim());
                        const introLines: string[] = [];
                        const bulletItems: string[] = [];
                        let foundBullet = false;
                        for (const line of lines) {
                          const trimmed = line.trim();
                          if (/^[\*\-\•]\s+/.test(trimmed) || /^\d+[\.\)]\s+/.test(trimmed)) {
                            foundBullet = true;
                            bulletItems.push(trimmed.replace(/^[\*\-\•]\s+/, '').replace(/^\d+[\.\)]\s+/, ''));
                          } else if (foundBullet) {
                            bulletItems.push(trimmed);
                          } else {
                            introLines.push(trimmed);
                          }
                        }
                        return (
                          <>
                            {introLines.map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                            {bulletItems.length > 0 && (
                              <ul className="list-disc list-inside space-y-1 mt-2 ml-2 text-slate-800 dark:text-slate-200 font-bold">
                                {bulletItems.map((item, i) => <li key={i}>{item}</li>)}
                              </ul>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    {recordingImageUrls && recordingImageUrls.length > 0 && (
                      <div className="mt-6 grid grid-cols-2 gap-3 shrink-0 pb-4">
                        {recordingImageUrls.map((url, idx) => (
                          <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                            <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT PANE: Recording & Assessment */}
                <div className={`flex flex-col flex-none shrink-0 bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar relative transition-all duration-700 ease-in-out w-full ${isRecording ? 'lg:w-[25%]' : 'lg:w-[50%]'}`}>

                  {isRecording && (
                    <div className="p-6 flex flex-col items-center justify-center gap-6 py-12 md:py-24 h-full">
                      {/* Countdown Timer Ring */}
                      <div className="relative flex items-center justify-center transition-all duration-700">
                        <svg className={`transform -rotate-90 transition-all duration-700 ${isRecording ? 'w-24 h-24 lg:w-28 lg:h-28' : 'w-36 h-36'}`}>
                          <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="8%" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                          <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="8%" fill="transparent"
                            strokeDasharray="264"
                            strokeDashoffset={264 - (264 * (recordingTimeLeft / recordingMaxTime))}
                            strokeLinecap="round"
                            className={`transition-all duration-1000 ease-linear ${recordingTimeLeft > 30 ? 'text-green-500' : recordingTimeLeft > 10 ? 'text-amber-500' : 'text-red-500 animate-pulse'}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`font-black font-mono transition-all duration-700 ${isRecording ? 'text-2xl lg:text-3xl' : 'text-4xl'} ${recordingTimeLeft > 30 ? 'text-green-600 dark:text-green-400' : recordingTimeLeft > 10 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                            {Math.floor(recordingTimeLeft / 60)}:{String(recordingTimeLeft % 60).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                            of {recordingMaxTime >= 60 ? `${Math.floor(recordingMaxTime / 60)} min` : `${recordingMaxTime}s`}
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-200">Recording Answer...</p>
                        <p className="text-md text-slate-500 dark:text-slate-400 mt-2">
                          {recordingTimeLeft <= 10 ? '⏰ Time is almost up!' : 'Speak clearly into your microphone.'}
                        </p>
                      </div>
                      <button onClick={stopRecording} className="mt-4 px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-md transition-colors flex items-center justify-center gap-2">
                        <div className="w-4 h-4 bg-white rounded-sm"></div> Stop Recording
                      </button>
                    </div>
                  )}

                  {isAssessing && (
                    <div className="p-6 flex flex-col items-center justify-center gap-6 py-12 md:py-24 h-full">
                      <div className="loader-graphic-container mb-4 scale-125">
                        <div className="pulse-orbs">
                          <div className="orb orb-1"></div>
                          <div className="orb orb-2"></div>
                          <div className="orb orb-3"></div>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Analyzing Speech...</p>
                        <p className="text-md text-slate-500 dark:text-slate-400">Examiner is evaluating your answer using CEFR grading rubric.</p>
                      </div>
                    </div>
                  )}

                  {assessmentResult && !isRecording && !isAssessing && (
                    <div className="flex flex-col w-full animate-fade-in p-6 md:p-8 gap-8">
                      {/* Score Circle */}
                      <div className="flex flex-col items-center">
                        <div className="relative w-32 h-32 shrink-0 flex items-center justify-center mb-4">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent"
                              strokeDasharray={351.8}
                              strokeDashoffset={351.8 - (351.8 * (assessmentResult.score / 10))}
                              strokeLinecap="round"
                              className={`transition-all duration-1000 ease-out ${assessmentResult.score >= 8 ? 'text-green-500' : assessmentResult.score >= 5 ? 'text-yellow-500' : 'text-red-500'}`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-4xl font-black ${assessmentResult.score >= 8 ? 'text-green-600 dark:text-green-400' : assessmentResult.score >= 5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>{assessmentResult.score}</span>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider relative -top-1">/ 10 points</span>
                          </div>
                        </div>
                        <h3 className={`font-black text-2xl text-center ${assessmentResult.score >= 8 ? 'text-green-700 dark:text-green-400' : assessmentResult.score >= 5 ? 'text-yellow-700 dark:text-yellow-400' : 'text-red-700 dark:text-red-400'}`}>
                          {assessmentResult.score >= 8 ? 'Excellent!' : assessmentResult.score >= 5 ? 'Good Effort' : 'Needs Work'}
                        </h3>
                      </div>

                      {/* Feedback & Transcript */}
                      <div className="flex flex-col gap-6">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg> What you said
                          </p>
                          <p className="text-slate-800 dark:text-slate-200 italic text-base leading-relaxed">"{assessmentResult.transcript}"</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Examiner Feedback</p>
                          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{assessmentResult.feedback}</p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800/50">
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-bold mb-2 flex items-center gap-2">
                            <Zap className="w-5 h-5" /> Actionable Tip
                          </p>
                          <p className="text-base text-blue-900 dark:text-blue-200 leading-relaxed font-medium">{assessmentResult.suggestion}</p>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button onClick={() => setIsAssessmentModalOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors">
                          Close
                        </button>
                        {recordingQuestionId && (!retryCount[recordingQuestionId] || retryCount[recordingQuestionId] < 2) && (
                          <button onClick={() => startRecording(recordingQuestionId, activeQuestionData?.question || "")} className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2 shadow-sm">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Retry (1 Left)
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Writing Assessment Modal overlay */}
        {isWritingModalOpen && writingQuestionId && (() => {
          const qText = examQuestions.find(q => q.id.toString() === writingQuestionId)?.question || '';
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 transform transition-all h-[95vh]">

                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-3">
                    ✍️ Writing Assessment
                  </h3>
                  {!isAssessingWriting && (
                    <button onClick={() => setIsWritingModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>

                {/* Content Area */}
                <div className="p-0 flex flex-col lg:flex-row h-full overflow-hidden w-full">

                  {/* LEFT PANE: Prompt & Editor */}
                  <div className={`p-6 flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 ${writingAssessmentResult ? 'lg:flex-[1]' : 'w-full'}`}>

                    {/* The Prompt */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 shrink-0 max-h-[30%] overflow-y-auto custom-scrollbar">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                        Task Prompt
                      </p>
                      <p className="text-slate-800 dark:text-slate-200 text-base leading-relaxed whitespace-pre-wrap">{qText}</p>
                    </div>

                    {/* The Editor */}
                    <div className="flex-1 flex flex-col min-h-[250px] relative">
                      <textarea
                        className="w-full h-full p-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all custom-scrollbar flex-1"
                        placeholder="Write your answer here..."
                        value={writingContent}
                        onChange={(e) => setWritingContent(e.target.value)}
                        disabled={isAssessingWriting}
                      />
                      <div className="absolute bottom-3 right-4 text-xs font-bold text-slate-400 bg-white/80 dark:bg-slate-900/80 px-2 py-1 rounded backdrop-blur">
                        {writingContent.trim().split(/\s+/).filter(Boolean).length} words
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex justify-between items-center gap-4">
                      {isAssessingWriting ? (
                        <div className="flex items-center justify-center gap-3 w-full p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl animate-pulse">
                          <Loader2 className="animate-spin h-5 w-5" />
                          Examiner is evaluating...
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setIsWritingModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                            Save Draft & Close
                          </button>
                          <button
                            onClick={() => submitWritingForAssessment(writingQuestionId, qText)}
                            disabled={!writingContent.trim()}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            Submit Answer
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* RIGHT PANE: Results (Only visible if assessed) */}
                  {writingAssessmentResult && !isAssessingWriting && (
                    <div className="flex-[0.8] shrink-0 p-6 flex flex-col bg-slate-50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar animate-fade-in border-t lg:border-t-0 border-slate-200 dark:border-slate-800">

                      <div className="flex flex-col items-center mb-6">
                        <div className="relative w-32 h-32 shrink-0 flex items-center justify-center mb-4">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-200 dark:text-slate-800" />
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent"
                              strokeDasharray={351.8}
                              strokeDashoffset={351.8 - (351.8 * (writingAssessmentResult.score / 10))}
                              strokeLinecap="round"
                              className={`transition-all duration-1000 ease-out ${writingAssessmentResult.score >= 8 ? 'text-green-500' : writingAssessmentResult.score >= 5 ? 'text-yellow-500' : 'text-red-500'}`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-4xl font-black ${writingAssessmentResult.score >= 8 ? 'text-green-600 dark:text-green-400' : writingAssessmentResult.score >= 5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>{writingAssessmentResult.score}</span>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider relative -top-1">/ 10 points</span>
                          </div>
                        </div>

                        <h3 className={`font-black text-2xl text-center ${writingAssessmentResult.score >= 8 ? 'text-green-700 dark:text-green-400' : writingAssessmentResult.score >= 5 ? 'text-yellow-700 dark:text-yellow-400' : 'text-red-700 dark:text-red-400'}`}>
                          {writingAssessmentResult.score >= 8 ? 'Excellent Writing!' : writingAssessmentResult.score >= 5 ? 'Good Effort' : 'Needs Work'}
                        </h3>
                      </div>

                      <div className="mb-6 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Examiner Feedback</p>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{writingAssessmentResult.feedback}</p>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800/50 shadow-sm flex-1">
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-bold mb-2 flex items-center gap-2">
                          <Zap className="w-5 h-5" /> Actionable Tips
                        </p>
                        <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed font-medium">{writingAssessmentResult.suggestion}</p>
                      </div>

                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      </main>

      {/* PDF Presentation Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsPdfModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col ring-1 ring-slate-200 dark:ring-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 shrink-0">
              <h3 className="text-slate-800 dark:text-white font-bold flex items-center gap-2 text-sm sm:text-base">
                <FileText className="w-5 h-5 text-orange-500" />
                CEFR Platform Presentation
              </h3>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="p-1.5 flex items-center gap-1 rounded-lg text-slate-500 font-medium hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
              >
                <span className="hidden sm:inline">Close</span> <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full flex-1 bg-slate-200 dark:bg-slate-800 min-h-0">
              <iframe
                src="/presentation/AI_Powered_CEFR_Mastery.pdf"
                className="w-full h-full border-none"
                style={{ minHeight: '60vh' }}
                title="AI CEFR Mastery Presentation"
              />
            </div>
          </div>
        </div>
      )}

      {/* --- READING ASSESSMENT MODAL --- */}
      {isReadingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in custom-scrollbar">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] border border-slate-200 dark:border-slate-800">
            {/* Header for Mobile */}
            <div className="md:hidden flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" /> Reading Assessment
              </h2>
              <button onClick={() => setIsReadingModalOpen(false)} className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors shadow-sm border border-slate-200 dark:border-slate-700">
                <X className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* LEFT PANE: Information */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 relative z-10 custom-scrollbar overflow-y-auto">
              {/* Desktop Header */}
              <div className="hidden md:flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                    <Check className="w-8 h-8 text-green-500" /> Assessment Result
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Automatic CEFR grading for Reading & Use of English.</p>
                </div>
              </div>

              {/* Assessment Loader */}
              {isAssessingReading && (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12 md:py-24 animate-fade-in w-full">
                  <div className="loader-graphic-container mb-4 scale-125">
                    <div className="pulse-orbs">
                      <div className="orb orb-1"></div>
                      <div className="orb orb-2"></div>
                      <div className="orb orb-3"></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Analyzing Answers...</p>
                    <p className="text-md text-slate-500 dark:text-slate-400">Examiner is evaluating your responses using CEFR grading rubric.</p>
                  </div>
                </div>
              )}

              {/* Results Container */}
              {readingAssessmentResult && !isAssessingReading && (
                <div className="flex flex-col gap-6 w-full animate-fade-in h-full overflow-y-auto custom-scrollbar pr-2 pb-4">
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                      Examiner Feedback
                    </p>
                    <p className="text-slate-700 dark:text-slate-300 text-sm md:text-base leading-relaxed">{readingAssessmentResult.feedback}</p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800/50 shrink-0 flex flex-col justify-center min-h-[120px]">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-bold mb-2 flex items-center gap-2">
                      <Zap className="w-5 h-5" /> Actionable Tips
                    </p>
                    <p className="text-sm md:text-base text-blue-900 dark:text-blue-200 leading-relaxed font-medium">{readingAssessmentResult.suggestion}</p>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT PANE: Score Ring & Actions (Only visible if assessed) */}
            {readingAssessmentResult && !isAssessingReading && (
              <div className="flex-[0.8] shrink-0 p-6 flex flex-col bg-slate-50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar animate-fade-in border-t lg:border-t-0 border-slate-200 dark:border-slate-800">

                <div className="flex flex-col items-center mb-6 mt-10">
                  <div className="relative w-32 h-32 shrink-0 flex items-center justify-center mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-200 dark:text-slate-800" />
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent"
                        strokeDasharray={351.8}
                        strokeDashoffset={totalQuestions > 0 ? 351.8 - (351.8 * (readingAssessmentResult.score / totalQuestions)) : 351.8}
                        strokeLinecap="round"
                        className={`transition-all duration-1000 ease-out ${totalQuestions > 0 && (readingAssessmentResult.score / totalQuestions) >= 0.8 ? 'text-green-500' : totalQuestions > 0 && (readingAssessmentResult.score / totalQuestions) >= 0.5 ? 'text-yellow-500' : 'text-red-500'}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-black ${totalQuestions > 0 && (readingAssessmentResult.score / totalQuestions) >= 0.8 ? 'text-green-600 dark:text-green-400' : totalQuestions > 0 && (readingAssessmentResult.score / totalQuestions) >= 0.5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>{readingAssessmentResult.score}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider relative -top-1">/ {totalQuestions} points</span>
                    </div>
                  </div>

                  <h3 className={`font-black text-2xl text-center ${totalQuestions > 0 && (readingAssessmentResult.score / totalQuestions) >= 0.8 ? 'text-green-700 dark:text-green-400' : totalQuestions > 0 && (readingAssessmentResult.score / totalQuestions) >= 0.5 ? 'text-yellow-700 dark:text-yellow-400' : 'text-red-700 dark:text-red-400'}`}>
                    {totalQuestions > 0 && (readingAssessmentResult.score / totalQuestions) >= 0.8 ? 'Excellent Comprehension!' : totalQuestions > 0 && (readingAssessmentResult.score / totalQuestions) >= 0.5 ? 'Good Effort' : 'Needs Work'}
                  </h3>
                </div>

                <div className="mt-auto pt-6 flex flex-col gap-3 w-full">
                  <button onClick={() => setIsReadingModalOpen(false)} className="w-full px-6 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl font-bold shadow-md transition-all flex justify-center items-center gap-2">
                    Close and Review Answers
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="bg-[#2d2d2d] text-white flex flex-col sm:flex-row items-center justify-between px-4 py-2 sm:py-0 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] gap-2 sm:gap-0 h-auto sm:h-20">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={() => setCurrentQuestion(q => Math.max(1, q - 1))}
            disabled={currentQuestion === 1}
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded bg-[#3d3d3d] hover:bg-[#4d4d4d] text-xs sm:text-sm font-medium transition-colors text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            onClick={() => toggleFlag(currentQuestion)}
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded bg-[#3d3d3d] hover:bg-[#4d4d4d] text-xs sm:text-sm font-medium transition-colors text-gray-300 hover:text-white flex items-center gap-2"
          >
            <Flag className={`w-3 h-3 sm:w-4 sm:h-4 ${flagged.has(currentQuestion) ? 'text-yellow-400 fill-current' : ''}`} strokeWidth={2.5} />
            <span className="hidden sm:inline">Review</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto py-2 no-scrollbar mx-2 sm:mx-4 w-full sm:w-auto">
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((q) => (
            <button
              key={q}
              onClick={() => setCurrentQuestion(q)}
              className={`w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 flex items-center justify-center rounded-sm text-[10px] sm:text-xs font-bold transition-all relative ${getQuestionNavClass(q)}`}
            >
              {flagged.has(q) && <div className="absolute top-0.5 right-0.5 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-yellow-400 rounded-full"></div>}
              {q}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleSaveAndExit}
            disabled={isSaving || isCurrentExamSaved}
            className={`w-full sm:w-auto px-4 py-1.5 sm:px-6 sm:py-2 rounded text-white text-xs sm:text-sm font-bold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isCurrentExamSaved ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isSaving ? 'Saving...' : (isCurrentExamSaved ? 'Exiting...' : 'Save & Exit')}
          </button>
          <button
            onClick={handleFinishTest}
            className="w-full sm:w-auto px-4 py-1.5 sm:px-6 sm:py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md transition-colors"
          >
            Finish Test
          </button>
        </div>
      </footer>

      {isTeacherModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-spring-up overflow-hidden">
            <button
              onClick={() => setIsTeacherModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mb-4">
                <GraduationCap className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Activate Teacher Tools</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                Enter your Teacher Access Code to unlock PDF printables and educator features.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Enter Access Code..."
                  value={teacherCode}
                  onChange={(e) => setTeacherCode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center tracking-widest uppercase"
                />
              </div>

              {teacherStatusMsg && (
                <div className={`p-3 rounded-lg text-sm text-center font-semibold ${teacherStatusMsg.includes('Success') || teacherStatusMsg.includes('Already') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : teacherStatusMsg.includes('Checking') || teacherStatusMsg.includes('Verifying') ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                  {teacherStatusMsg}
                </div>
              )}

              <button
                onClick={handleActivateTeacher}
                disabled={!teacherCode || teacherStatusMsg.includes('Verifying')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {teacherStatusMsg.includes('Verifying') ? 'Verifying...' : 'Activate Account'}
              </button>
            </div>

            <p className="text-xs text-center text-slate-500 dark:text-slate-500 mt-6">
              If you believe you should have access, please contact the administrator for your code.
            </p>
          </div>
        </div>
      )}

      {/* ── Pre-loaded Exams Library Modal ── */}
      {libraryModalSkill && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => { setLibraryModalSkill(null); setLibrarySelectedLevel(null); }}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-spring-up overflow-hidden max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setLibraryModalSkill(null); setLibrarySelectedLevel(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                {libraryModalSkill === 'Reading' && <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                {libraryModalSkill === 'Writing' && <Edit3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                {libraryModalSkill === 'Listening' && <Headphones className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                {libraryModalSkill === 'Speaking' && <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white">{libraryModalSkill} Exams</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Select a CEFR level, then pick a topic.</p>
              </div>
            </div>

            {/* Level Selection */}
            <div className="flex flex-wrap gap-2 mb-4">
              {CEFR_LEVELS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLibrarySelectedLevel(value === librarySelectedLevel ? null : value)}
                  className={`text-xs px-3 py-1.5 rounded-lg border-2 font-bold transition-all ${librarySelectedLevel === value ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-slate-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Topic Cards Grid */}
            {librarySelectedLevel ? (
              <div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">
                  {libraryModalSkill} · {librarySelectedLevel} — Choose a Topic
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CEFR_TOPICS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={!!loadingLibraryTopic}
                      onClick={() => handleLoadPreloadedExam(libraryModalSkill!, librarySelectedLevel, t)}
                      className={`text-left p-3 rounded-xl border-2 transition-all group ${loadingLibraryTopic === t ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 animate-pulse' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/60 dark:hover:bg-slate-700/60 hover:shadow-md active:scale-[0.97]'}`}
                    >
                      <span className={`text-sm font-semibold leading-tight block ${loadingLibraryTopic === t ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-400'}`}>
                        {loadingLibraryTopic === t ? '⏳ Loading...' : t}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                <p className="text-sm">👆 Select a level above to see available topics</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}