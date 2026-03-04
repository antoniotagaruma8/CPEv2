"use client";

import React, { useEffect, useState } from 'react';
import { getExamById } from '../../actions/examActions';
import { BookOpen, CheckCircle2, XCircle, BarChart2, Calendar, LayoutDashboard, Share2, Lightbulb, Download } from 'lucide-react';
import Link from 'next/link';

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
}

interface ExamPart {
    part: number;
    title: string;
    instructions: string;
    content: string;
}

export default function SharedExamPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = React.use(params);
    const [dbRecord, setDbRecord] = useState<any>(null);
    const [examData, setExamData] = useState<any>(null);
    const [examParts, setExamParts] = useState<ExamPart[]>([]);
    const [examQuestions, setExamQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Reused parsing logic for robustness
    const parseExamData = (activeExamData: string) => {
        try {
            const rawData = typeof activeExamData === 'string' ? JSON.parse(activeExamData) : activeExamData;
            let data: any;
            let processedData = rawData;

            if (processedData && typeof processedData === 'object' && processedData.content) {
                processedData = typeof processedData.content === 'string' ? JSON.parse(processedData.content) : processedData.content;
            }

            const knownArrayKeys = ['parts', 'exam', 'tasks', 'writingTasks', 'questions', 'sections'];
            if (processedData && typeof processedData === 'object' && !Array.isArray(processedData)) {
                const keys = Object.keys(processedData);
                if (keys.length === 1 && !knownArrayKeys.includes(keys[0])) {
                    const key = keys[0];
                    if (typeof processedData[key] === 'object') {
                        processedData = processedData[key];
                    }
                } else if (keys.length === 2 && keys.includes('examTitle')) {
                    const otherKey = keys.find(k => k !== 'examTitle');
                    if (otherKey && typeof processedData[otherKey] === 'object') {
                        processedData = processedData[otherKey];
                    }
                }
            }

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
                const values = processedData && typeof processedData === 'object' ? Object.values(processedData) : [];
                const flattenedValues = values.flat();
                const looksLikeParts = flattenedValues.length > 0 && flattenedValues.every((v: any) => v && typeof v === 'object' && (v.title || v.questions || v.content || v.text));
                if (looksLikeParts) {
                    data = flattenedValues;
                } else {
                    for (const key of Object.keys(processedData || {})) {
                        if (Array.isArray(processedData[key]) && processedData[key].length > 0 && typeof processedData[key][0] === 'object') {
                            data = processedData[key];
                            break;
                        }
                    }
                    if (!data) data = processedData;
                }
            }

            const partsArray = Array.isArray(data) ? data : [data];
            const allParts: ExamPart[] = [];
            const allQuestions: Question[] = [];
            let questionIdCounter = 1;

            partsArray.forEach((item: any, index: number) => {
                let partData = item;
                if (partData && !partData.title && !partData.questions && typeof partData === 'object' && Object.keys(partData).length === 1) {
                    const key = Object.keys(partData)[0];
                    if (partData[key] && typeof partData[key] === 'object') partData = partData[key];
                }

                let rawContent = partData?.content || partData?.text || partData?.instructions || partData?.prompt || partData?.description || partData?.scenario || '';
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

                let questionsArray: any[] = [];
                if (Array.isArray(partData?.questions)) {
                    questionsArray = partData.questions;
                } else if (partData?.questions && typeof partData.questions === 'object') {
                    questionsArray = [partData.questions];
                } else if (Array.isArray(partData?.task)) {
                    questionsArray = partData.task;
                } else if (partData?.task && typeof partData.task === 'object') {
                    questionsArray = [partData.task];
                } else if (partData?.question && typeof partData.question === 'string') {
                    questionsArray = [{ question: partData.question, options: partData.options || [], correctOption: partData.correctOption, explanation: partData.explanation }];
                }

                if (questionsArray.length === 0 && partData?.title && partContent) {
                    questionsArray = [{ question: partData.title, options: [] }];
                }

                const partNumber = index + 1;
                const cleanedTitle = (partData?.title || partData?.partTitle || partData?.name || `Part ${partNumber}`).replace(/^Part\s*\d+\s*[:.]?\s*/i, '').replace(/^Extract\s*\d+\s*[:.]?\s*/i, '').trim();

                if (partData && (cleanedTitle || partContent) && (partContent || questionsArray.length > 0)) {
                    allParts.push({
                        part: partNumber,
                        title: cleanedTitle,
                        instructions: partData.instructions || '',
                        content: partContent,
                    });

                    questionsArray.forEach((q: any) => {
                        allQuestions.push({
                            id: questionIdCounter++,
                            part: partNumber,
                            topic: cleanedTitle,
                            question: q.text || q.question || q.prompt || '',
                            options: Array.isArray(q.options) ? q.options.filter((o: any) => typeof o === 'string') : [],
                            correctOption: q.correctOption,
                            explanation: q.explanation,
                        });
                    });
                }
            });

            return { parts: allParts, questions: allQuestions };
        } catch (e) {
            console.error(e);
            return { parts: [], questions: [] };
        }
    };

    useEffect(() => {
        const fetchExam = async () => {
            try {
                const record = await getExamById(resolvedParams.id);
                if (!record) {
                    setError('Exam not found or the link is invalid.');
                    return;
                }

                setDbRecord(record);

                let parsedData = null;
                try {
                    parsedData = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
                } catch (e) {
                    setError('Failed to parse exam data.');
                    return;
                }

                setExamData(parsedData);

                const extracted = parseExamData(parsedData.content || parsedData);
                setExamParts(extracted.parts);
                setExamQuestions(extracted.questions);

            } catch (err) {
                setError('An error occurred while loading this exam.');
            } finally {
                setLoading(false);
            }
        };

        fetchExam();
    }, [resolvedParams.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <BookOpen className="w-12 h-12 text-blue-600 animate-pulse" />
                    <p className="text-slate-500 font-medium">Loading Shared Exam...</p>
                </div>
            </div>
        );
    }

    if (error || !examData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Exam Not Found</h2>
                    <p className="text-slate-600 mb-8">{error}</p>
                    <Link href="/" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">
                        Go to Homepage
                    </Link>
                </div>
            </div>
        );
    }

    const isFinished = examData.isFinished || false;
    const userAnswers = examData.answers || {};
    const userScores = examData.scores || {};

    // Calculate score logic
    let scoreText = '';
    let accuracyPercentage = 0;

    if (dbRecord.type === 'Writing' || dbRecord.type === 'Speaking') {
        const scoreValues = Object.values(userScores) as number[];
        if (scoreValues.length > 0) {
            const avg = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
            scoreText = `${avg.toFixed(1)} / 10`;
            accuracyPercentage = (avg / 10) * 100;
        } else {
            scoreText = 'Not graded';
        }
    } else {
        // Reading / Listening
        const totalAnswered = Object.keys(userAnswers).length;
        const correctScore = typeof examData.score === 'number' ? examData.score : 0;

        if (totalAnswered > 0) {
            scoreText = `${correctScore} / ${totalAnswered} Correct`;
            accuracyPercentage = Math.round((correctScore / totalAnswered) * 100);
        } else {
            scoreText = '0 Attempted';
        }
    }

    const cambridgeLevelName = () => {
        switch (dbRecord.level) {
            case 'A2': return 'A2 Key (KET)';
            case 'B1': return 'B1 Preliminary (PET)';
            case 'B2': return 'B2 First (FCE)';
            case 'C1': return 'C1 Advanced (CAE)';
            case 'C2': return 'C2 Proficiency (CPE)';
            default: return `CEFR ${dbRecord.level}`;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-blue-600 font-bold hover:opacity-80 transition">
                        <BookOpen className="w-6 h-6" />
                        <span className="hidden sm:inline">CEFR Mock Exams</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">
                            Read-Only View
                        </span>
                        <button
                            onClick={async () => {
                                const url = window.location.href;
                                if (navigator.share) {
                                    try {
                                        await navigator.share({
                                            title: dbRecord?.topic || 'CEFR Mock Exam',
                                            text: 'Check out this Cambridge-style English mock exam!',
                                            url: url,
                                        });
                                    } catch (err) {
                                        console.log('Share canceled or failed:', err);
                                    }
                                } else {
                                    navigator.clipboard.writeText(url);
                                    alert('Link copied to clipboard:\n' + url);
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition"
                        >
                            <Share2 className="w-4 h-4" />
                            Share
                        </button>
                        <button
                            onClick={() => window.open(`/print/${dbRecord?.id}`, '_blank')}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF
                        </button>
                        <Link href="/" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition hidden sm:flex">
                            Create Your Own
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto px-4 sm:px-6 py-10 flex justify-center">
                <div className="max-w-[210mm] w-full p-8 sm:p-[15mm] bg-white shadow-xl min-h-[297mm]">
                    {/* EXAM COVER PAGE HEADER (Cambridge Style) */}
                    <div className="border-2 border-black p-6 mb-8 text-sm">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6 font-bold uppercase mb-6 text-sm">
                            <div className="col-span-2 flex items-end gap-2">
                                <span className="shrink-0">CANDIDATE NAME:</span>
                                <span className="flex-1 border-b-2 border-dashed border-black pb-1"></span>
                            </div>
                            <div className="col-span-1 flex items-end gap-2">
                                <span className="shrink-0">CENTRE NUMBER:</span>
                                <span className="flex-1 border-b-2 border-dashed border-black pb-1"></span>
                            </div>
                            <div className="col-span-1 flex items-end gap-2">
                                <span className="shrink-0">CANDIDATE NUMBER:</span>
                                <span className="flex-1 border-b-2 border-dashed border-black pb-1"></span>
                            </div>
                        </div>

                        <div className="font-bold text-center border-t-2 border-black pt-4">
                            <h1 className="text-2xl font-black tracking-widest uppercase mb-1">
                                CEFR ENGLISH EXAM
                            </h1>
                            <h2 className="text-xl font-bold mb-4">{cambridgeLevelName()}</h2>
                            <h3 className="text-lg uppercase">
                                {dbRecord.type === 'Reading' ? 'Reading and Use of English' : dbRecord.type}
                            </h3>
                            {dbRecord.topic && <p className="mt-2 text-md font-normal italic">Topic: {dbRecord.topic}</p>}
                        </div>

                        <div className="mt-8 font-bold text-center border-b-2 border-black pb-4">
                            <p>Time <span className="font-normal italic">(approx)</span>: {
                                dbRecord.type === 'Reading' ? '1 hour 15 minutes' :
                                    dbRecord.type === 'Writing' ? '1 hour 20 minutes' :
                                        dbRecord.type === 'Listening' ? '40 minutes' : '15 minutes'
                            }</p>
                        </div>

                        <div className="mt-6 mb-2 space-y-3 font-bold">
                            <p className="uppercase text-lg">Instructions to candidates</p>
                            <p className="font-normal">Do not open this question paper until you are told to do so.</p>
                            <p className="font-normal">Write your name, centre number and candidate number on your answer sheet if they are not already there.</p>
                            <p className="font-normal">Read the instructions for each part of the paper carefully.</p>
                            <p className="font-normal">Answer all the questions.</p>
                            <p className="font-normal">Read the instructions on the answer sheet. Write on the answer sheet. Use a pencil.</p>
                            <p className="font-normal">You must complete the answer sheet within the time limit.</p>
                            <p className="font-normal">At the end of the test, hand in both this question paper and your answer sheet.</p>
                        </div>
                    </div>

                    {/* EXAM CONTENTS */}
                    <div className="space-y-12 pb-20">
                        {examParts.map((part, index) => {
                            const partQuestions = examQuestions.filter(q => q.part === part.part);
                            const isFirst = index === 0;

                            return (
                                <div key={part.part} className={`print:break-before-auto ${!isFirst ? 'print:mt-12 mt-12' : ''}`}>
                                    <h3 className="font-bold text-lg mb-2 uppercase">Part {part.part}</h3>

                                    {part.instructions && (
                                        <p className="mb-6 font-bold italic text-justify leading-relaxed">
                                            {part.instructions}
                                        </p>
                                    )}

                                    {part.content && (
                                        <div className="mb-8 border-y-2 border-black py-4 mb-6">
                                            <p className="font-sans whitespace-pre-wrap text-justify leading-relaxed">
                                                {part.content}
                                            </p>
                                        </div>
                                    )}

                                    {partQuestions.length > 0 && (
                                        <div className="space-y-6">
                                            {partQuestions.map((q, qIndex) => (
                                                <div key={q.id} className="text-base break-inside-avoid shadow-none">
                                                    <div className="flex gap-4">
                                                        <span className="font-bold min-w-[2rem]">{examQuestions.findIndex(eq => eq.id === q.id) + 1}.</span>
                                                        <div className="w-full">
                                                            <p className="mb-3 whitespace-pre-wrap">{q.question}</p>

                                                            {q.options && q.options.length > 0 && (
                                                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2 ml-4">
                                                                    {q.options.map((opt, oIdx) => (
                                                                        <div key={oIdx} className="flex gap-2 items-start">
                                                                            <span className="font-bold uppercase min-w-[1.5rem]">{String.fromCharCode(65 + oIdx)}</span>
                                                                            <span>{opt}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-center font-bold uppercase mt-12 mb-8 hidden print:block border-t border-black pt-4">
                        end of test
                    </div>

                    {/* DEDICATED ANSWER SHEET (Cambridge Style) */}
                    <div className="print:break-before-page pt-12 print:pt-4 pb-20">
                        <div className="border-2 border-black p-6 mb-8 text-sm">
                            <h2 className="text-2xl font-black uppercase text-center mb-6 tracking-widest">
                                Candidate Answer Sheet
                            </h2>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-6 font-bold uppercase text-sm mb-4">
                                <div className="col-span-2 flex items-end gap-2">
                                    <span className="shrink-0">CANDIDATE NAME:</span>
                                    <span className="flex-1 border-b-2 border-dashed border-black pb-1"></span>
                                </div>
                                <div className="col-span-1 flex items-end gap-2">
                                    <span className="shrink-0">CENTRE NUMBER:</span>
                                    <span className="flex-1 border-b-2 border-dashed border-black pb-1"></span>
                                </div>
                                <div className="col-span-1 flex items-end gap-2">
                                    <span className="shrink-0">CANDIDATE NUMBER:</span>
                                    <span className="flex-1 border-b-2 border-dashed border-black pb-1"></span>
                                </div>
                            </div>
                            <p className="text-center font-bold italic mt-6 pt-4 border-t-2 border-black">
                                Instructions: Transfer all your answers to this sheet. Use a pencil.
                            </p>
                        </div>

                        <div className="space-y-8">
                            {examParts.map((part) => {
                                const partQuestions = examQuestions.filter(q => q.part === part.part);
                                if (partQuestions.length === 0) return null;

                                return (
                                    <div key={`answersheet-part-${part.part}`} className="break-inside-avoid border border-slate-300 rounded overflow-hidden">
                                        <h3 className="font-bold text-base uppercase bg-slate-100 p-2 border-b border-slate-300">
                                            Part {part.part}
                                        </h3>
                                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
                                            {partQuestions.map((q) => {
                                                const globalIndex = examQuestions.findIndex(eq => eq.id === q.id) + 1;
                                                const isMultipleChoice = q.options && q.options.length > 0;

                                                return (
                                                    <div key={`as-${q.id}`} className="flex items-center gap-4 border-b border-slate-200 pb-2 border-dashed">
                                                        <span className="font-bold w-6 text-right">{globalIndex}.</span>
                                                        {isMultipleChoice ? (
                                                            <div className="flex gap-2 w-full max-w-[150px]">
                                                                {q.options.map((_, i) => (
                                                                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                                        <span className="text-[10px] text-slate-500 font-bold">{String.fromCharCode(65 + i)}</span>
                                                                        <div className="w-full h-4 border border-slate-400 bg-slate-50"></div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="flex-1 h-6 border-b border-slate-400"></div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ANSWER KEY PAGE (Answer Sheet Style) */}
                    <div className="print:break-before-page pt-12 print:pt-4 pb-20">
                        <h2 className="text-2xl font-black uppercase text-center mb-8 border-b-2 border-black pb-4 tracking-widest text-slate-800">
                            Answer Key (Answer Sheet)
                        </h2>

                        <div className="space-y-8">
                            {examParts.map((part) => {
                                const partQuestions = examQuestions.filter(q => q.part === part.part);
                                const hasAnswers = partQuestions.some(q => q.correctOption || q.explanation || (q.possibleAnswers && q.possibleAnswers.length > 0));
                                if (!hasAnswers) return null;

                                return (
                                    <div key={`answer-key-part-${part.part}`} className="break-inside-avoid border border-blue-200 rounded overflow-hidden">
                                        <h3 className="font-bold text-base uppercase bg-blue-50 text-blue-900 p-2 border-b border-blue-200">
                                            Part {part.part} Key
                                        </h3>
                                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                                            {partQuestions.map((q) => {
                                                const globalIndex = examQuestions.findIndex(eq => eq.id === q.id) + 1;
                                                const isMultipleChoice = q.options && q.options.length > 0;
                                                let correctOptIndex = -1;

                                                if (isMultipleChoice && q.correctOption) {
                                                    correctOptIndex = q.options.indexOf(q.correctOption);
                                                }

                                                return (
                                                    <div key={`ak-${q.id}`} className="flex flex-col gap-2 border-b border-blue-100 pb-4 border-dashed">
                                                        {/* The Simulated Answer Line/Grid  */}
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-bold w-6 text-right text-blue-700">{globalIndex}.</span>
                                                            {isMultipleChoice ? (
                                                                <div className="flex gap-2 w-full max-w-[150px]">
                                                                    {q.options.map((_, i) => {
                                                                        const isCorrect = i === correctOptIndex;
                                                                        return (
                                                                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                                                <span className={`text-[10px] font-bold ${isCorrect ? 'text-blue-700' : 'text-slate-400'}`}>
                                                                                    {String.fromCharCode(65 + i)}
                                                                                </span>
                                                                                <div className={`w-full h-4 border ${isCorrect ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-slate-50'}`}></div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <div className="flex-1 relative">
                                                                    <div className="absolute bottom-1 w-full translate-y-full border-b border-slate-400"></div>
                                                                    <div className="font-bold text-blue-800 italic px-2">
                                                                        {q.correctOption ? q.correctOption : (
                                                                            q.possibleAnswers && q.possibleAnswers.length > 0 ? q.possibleAnswers.join(' / ') : 'Answers will vary'
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Rationale appended underneath */}
                                                        {q.explanation && (
                                                            <div className="ml-10 mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-r border-l-2 border-blue-300">
                                                                <span className="font-bold text-slate-700 uppercase text-[9px] block mb-1 tracking-wider">Rationale:</span>
                                                                <span className="leading-snug">{q.explanation}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
