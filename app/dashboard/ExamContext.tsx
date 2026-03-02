/* c:\Users\Anton\Desktop\OLD FILES\GOALS\AI\GitHub 2025\CPE\app\dashboard\ExamContext.tsx */
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getExamPrompt } from '../../lib/exam-prompts';
import { generateExamAction } from '../actions/generateExam';
import { generateAudioAction } from '../actions/generateAudio';
import { getGenerationInfo, incrementGenerationCount } from '../actions/generationLimit';

interface GenerationInfo {
  allowed: boolean;
  count: number;
  limit: number;
  isAdmin: boolean;
}

interface ExamContextType {
  examType: string;
  setExamType: (type: string) => void;
  cefrLevel: string;
  setCefrLevel: (level: string) => void;
  topic: string;
  setTopic: (topic: string) => void;
  examFor: string;
  setExamFor: (examFor: string) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  generatedExam: string;
  loading: boolean;
  error: string;
  generateExam: () => Promise<void>;
  generationInfo: GenerationInfo | null;
  setUserEmail: (email: string) => void;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export function ExamProvider({ children }: { children: React.ReactNode }) {
  const [examType, setExamType] = useState('Reading');
  const [cefrLevel, setCefrLevel] = useState('C1');
  const [topic, setTopic] = useState('');
  const [examFor, setExamFor] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [generatedExam, setGeneratedExam] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [generationInfo, setGenerationInfo] = useState<GenerationInfo | null>(null);

  // Fetch generation info when userEmail is set
  useEffect(() => {
    if (userEmail) {
      getGenerationInfo(userEmail).then(info => setGenerationInfo(info)).catch(console.error);
    }
  }, [userEmail]);

  const generateExam = async () => {
    if (!topic && !file) {
      setError('Please enter a topic or upload a file to generate an exam.');
      return;
    }

    // Check generation limits for free tier
    if (userEmail) {
      try {
        const info = await getGenerationInfo(userEmail);
        setGenerationInfo(info);
        if (!info.allowed) {
          setError(`You have reached the free tier limit of ${info.limit} exam generations. Please subscribe to continue generating exams.`);
          return;
        }
        if (examType === 'Listening' && !info.isAdmin) {
          setError('Listening exam generation is a Premium feature. Please subscribe to access it.');
          return;
        }
      } catch (err) {
        console.error('Error checking generation limits:', err);
      }
    }

    setLoading(true);
    setError('');
    setGeneratedExam('');

    try {
      let fileData: string | undefined;
      if (file) {
        try {
          fileData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
        } catch (err) {
          setError('Failed to read the file.');
          setLoading(false);
          return;
        }
      }

      const topicPrompt = topic
        ? (file ? `topic "${topic}" and the uploaded file content` : `topic "${topic}"`)
        : `uploaded file content`;

      const { enhancedTopic, partCount } = getExamPrompt(examType, cefrLevel, topicPrompt);

      console.log("Generating exam with enhanced topic:", enhancedTopic);
      const result = await generateExamAction(examType, enhancedTopic, cefrLevel, 300, partCount, fileData);
      if (result.success && result.content) {
        let finalExamContent = result.content;

        // Attempt to extract title if topic is empty
        try {
          const parsed = JSON.parse(result.content);
          if (!topic && parsed.examTitle) {
            setTopic(parsed.examTitle);
          }
        } catch (e) {
          console.error("Failed to parse initial content for title extraction", e);
        }

        // If it's a Listening exam, generate audio for the transcripts
        if (examType === 'Listening') {
          try {
            const examData = JSON.parse(result.content);
            // Handle different structures (array vs object with parts)
            const parts = Array.isArray(examData) ? examData : (examData.parts || []);

            // Generate audio sequentially with delays and retries between parts
            const partsWithAudio = [];
            for (let index = 0; index < parts.length; index++) {
              const part = parts[index];
              // Normalize content to string — AI may return arrays of {speaker, transcript}
              let textContent = part.content;
              if (textContent && typeof textContent !== 'string') {
                if (Array.isArray(textContent)) {
                  textContent = textContent.map((item: any) => {
                    if (typeof item === 'string') return item;
                    if (item?.speaker && item?.transcript) return `${item.speaker}: ${item.transcript}`;
                    if (item?.speaker && item?.text) return `${item.speaker}: ${item.text}`;
                    if (item?.text) return item.text;
                    return JSON.stringify(item);
                  }).join('\n');
                } else if (typeof textContent === 'object') {
                  textContent = JSON.stringify(textContent);
                }
              }

              if (textContent && typeof textContent === 'string' && textContent.trim()) {
                let audioGenerated = false;
                // Retry up to 3 times with increasing delays for rate limiting
                for (let attempt = 0; attempt < 3 && !audioGenerated; attempt++) {
                  try {
                    if (attempt > 0) {
                      console.log(`Retry ${attempt}/2 for part ${index + 1} after ${attempt * 5}s delay...`);
                      await new Promise(r => setTimeout(r, attempt * 5000));
                    }
                    const audioResult = await generateAudioAction(textContent, index);
                    if (audioResult.success) {
                      partsWithAudio.push({ ...part, audioUrl: audioResult.audioUrl });
                      audioGenerated = true;
                    } else if (audioResult.error?.includes('429') || audioResult.error?.includes('quota') || audioResult.error?.includes('rate')) {
                      // Rate limited — retry after delay
                      console.warn(`Part ${index + 1} rate limited, will retry...`);
                      continue;
                    } else {
                      partsWithAudio.push({ ...part, audioError: audioResult.error });
                      audioGenerated = true; // Don't retry non-rate-limit errors
                    }
                  } catch (audioErr: any) {
                    const errMsg = audioErr?.message || String(audioErr);
                    if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('rate')) {
                      console.warn(`Part ${index + 1} rate limited on attempt ${attempt + 1}`);
                      continue;
                    }
                    console.error(`Audio generation failed for part ${index + 1}:`, audioErr);
                    partsWithAudio.push({ ...part, audioError: 'Audio generation failed' });
                    audioGenerated = true;
                  }
                }
                if (!audioGenerated) {
                  partsWithAudio.push({ ...part, audioError: 'Audio generation failed after retries (rate limited)' });
                }

                // Delay between parts to avoid rate limiting
                if (index < parts.length - 1) {
                  console.log(`Waiting 5s before generating audio for part ${index + 2}...`);
                  await new Promise(r => setTimeout(r, 5000));
                }
              } else {
                partsWithAudio.push(part);
              }
            }

            if (Array.isArray(examData)) {
              finalExamContent = JSON.stringify(partsWithAudio);
            } else {
              finalExamContent = JSON.stringify({ ...examData, parts: partsWithAudio });
            }
          } catch (e) {
            console.error("Error processing listening audio", e);
          }
        }

        setGeneratedExam(finalExamContent);

        // Increment generation count after successful generation
        if (userEmail) {
          try {
            await incrementGenerationCount(userEmail);
            const updatedInfo = await getGenerationInfo(userEmail);
            setGenerationInfo(updatedInfo);
          } catch (err) {
            console.error('Error incrementing generation count:', err);
          }
        }
      } else {
        setError(result.error || 'An unknown error occurred.');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`Request failed: ${err.message}`);
      } else {
        setError('Failed to connect to the server. An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExamContext.Provider value={{ examType, setExamType, cefrLevel, setCefrLevel, topic, setTopic, examFor, setExamFor, file, setFile, generatedExam, loading, error, generateExam, generationInfo, setUserEmail }}>
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  const context = useContext(ExamContext);
  if (context === undefined) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return context;
}
