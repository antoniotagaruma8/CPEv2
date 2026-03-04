"use client";

import React, { useEffect, useState } from 'react';
import { getExamById } from '../../actions/examActions';

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
    howToApproach?: string;
    modelAnswer?: string;
    part1Questions?: { question: string; answer: string; tip: string }[];
}

interface ExamPart {
    part: number;
    title: string;
    instructions: string;
    content: string;
    tips?: string;
    modelAnswer?: string;
    howToApproach?: string;
}

export default function PrintExamPage({ params }: { params: Promise<{ id: string }> }) {
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
                const cleanedTitle = (partData?.title || partData?.partTitle || partData?.name || `Part ${partNumber}`).replace(/^Part\s*\d+\s*[:.:]?\s*/i, '').replace(/^Extract\s*\d+\s*[:.:]?\s*/i, '').trim();

                if (partData && (cleanedTitle || partContent) && (partContent || questionsArray.length > 0)) {
                    allParts.push({
                        part: partNumber,
                        title: cleanedTitle,
                        instructions: partData.instructions || '',
                        content: partContent,
                        tips: partData.tips || '',
                        modelAnswer: partData.modelAnswer || '',
                        howToApproach: partData.howToApproach || '',
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
                            tips: q.tips ? (typeof q.tips === 'object' ? JSON.stringify(q.tips) : String(q.tips)) : '',
                            howToApproach: q.howToApproach || '',
                            modelAnswer: q.modelAnswer || '',
                            imagePrompts: Array.isArray(q.imagePrompts) ? q.imagePrompts : [],
                            possibleAnswers: Array.isArray(q.possibleAnswers) ? q.possibleAnswers : [],
                            part1Questions: q.part1Questions,
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
                    setError('Exam not found.');
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

                // Once loaded, trigger print automatically on next tick
                setTimeout(() => {
                    window.print();
                }, 1000);

            } catch (err) {
                setError('An error occurred while loading this exam.');
            } finally {
                setLoading(false);
            }
        };

        fetchExam();
    }, [resolvedParams.id]);

    if (loading) return <div className="p-10 font-sans text-center">Preparing Document for Print...</div>;
    if (error) return <div className="p-10 font-sans text-center text-red-600">{error}</div>;

    const isWritingExam = dbRecord?.type === 'Writing';

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

    // Lined writing space component
    const LinedWritingSpace = ({ lineCount = 22 }: { lineCount?: number }) => (
        <div className="my-4 border border-slate-300">
            {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i} className="border-b border-slate-300 h-[28px]" />
            ))}
        </div>
    );

    return (
        <div className="bg-white text-black min-h-screen font-arial print:bg-white print:m-0" style={{ fontFamily: 'Arial, sans-serif' }}>

            {/* Non-print controls (Hidden when actually printing) */}
            <div className="print:hidden p-4 bg-slate-100 border-b border-slate-300 flex justify-between items-center mb-8">
                <p className="text-sm font-bold text-slate-800">Print Preview Generation: Please use the print dialog layout set to A4.</p>
                <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded font-bold shadow hover:bg-blue-700">
                    Print Now / Save as PDF
                </button>
            </div>

            <div className="max-w-[210mm] mx-auto p-[15mm] print:p-0 bg-white shadow-xl print:shadow-none min-h-[297mm]">

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
                        {isWritingExam ? (
                            <>
                                <p className="font-normal">Answer <strong>all</strong> the questions in Part 1 and <strong>one</strong> question from Part 2.</p>
                                <p className="font-normal">Write your answers on the lined pages provided.</p>
                            </>
                        ) : (
                            <>
                                <p className="font-normal">Answer all the questions.</p>
                                <p className="font-normal">Read the instructions on the answer sheet. Write on the answer sheet. Use a pencil.</p>
                            </>
                        )}
                        <p className="font-normal">You must complete the answer sheet within the time limit.</p>
                        <p className="font-normal">At the end of the test, hand in both this question paper and your answer sheet.</p>
                    </div>
                </div>

                {/* EXAM CONTENTS */}
                <div className="space-y-12 pb-20">
                    {examParts.map((part, index) => {
                        const partQuestions = examQuestions.filter(q => q.part === part.part);
                        const isFirst = index === 0;

                        if (isWritingExam) {
                            // --- WRITING EXAM RENDERING ---
                            const isPart2 = part.part === 2;
                            return (
                                <div key={part.part} className={`${!isFirst ? 'print:break-before-page print:mt-0 mt-12' : ''}`}>
                                    <h3 className="font-bold text-lg mb-2 uppercase">Part {part.part}</h3>

                                    {part.instructions && (
                                        <p className="mb-6 font-bold italic text-justify leading-relaxed">
                                            {part.instructions}
                                        </p>
                                    )}

                                    {!isPart2 ? (
                                        // --- PART 1: Single compulsory task ---
                                        <>
                                            {part.content && (
                                                <div className="mb-6 border-y-2 border-black py-4">
                                                    <p className="font-sans whitespace-pre-wrap text-justify leading-relaxed">
                                                        {part.content}
                                                    </p>
                                                </div>
                                            )}

                                            {partQuestions.length > 0 && (
                                                <div className="space-y-4">
                                                    {partQuestions.map((q, qIdx) => (
                                                        <div key={q.id}>
                                                            <p className="font-bold mb-4">
                                                                {examQuestions.findIndex(eq => eq.id === q.id) + 1}.{' '}
                                                                <span className="font-normal">{q.question}</span>
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Lined writing space for Part 1 */}
                                            <LinedWritingSpace lineCount={28} />
                                        </>
                                    ) : (
                                        // --- PART 2: Multiple task choices ---
                                        <>
                                            {part.content && (
                                                <div className="mb-6 border-y-2 border-black py-4">
                                                    <p className="font-sans whitespace-pre-wrap text-justify leading-relaxed">
                                                        {part.content}
                                                    </p>
                                                </div>
                                            )}

                                            {partQuestions.length > 0 && (
                                                <div className="space-y-8">
                                                    {partQuestions.map((q, qIdx) => (
                                                        <div key={q.id} className="border border-slate-300 p-4 rounded break-inside-avoid">
                                                            <p className="font-bold mb-2">
                                                                {examQuestions.findIndex(eq => eq.id === q.id) + 1}.{' '}
                                                            </p>
                                                            <p className="whitespace-pre-wrap text-justify leading-relaxed">
                                                                {q.question}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Lined writing space for Part 2 */}
                                            <LinedWritingSpace lineCount={28} />
                                        </>
                                    )}
                                </div>
                            );
                        }

                        // --- NON-WRITING EXAM RENDERING (unchanged) ---
                        return (
                            <div key={part.part} className={`print:break-before-auto ${!isFirst ? 'print:mt-12 mt-12' : ''}`}>
                                <h3 className="font-bold text-lg mb-2 uppercase">Part {part.part}</h3>

                                {part.instructions && (
                                    <p className="mb-6 font-bold italic text-justify leading-relaxed">
                                        {part.instructions}
                                    </p>
                                )}

                                {part.content && dbRecord?.type !== 'Listening' && (
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
                    — end of test —
                </div>

                {/* CANDIDATE ANSWER SHEET — Only for non-Writing exams */}
                {!isWritingExam && (
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
                )}

                {/* ANSWER KEY PAGE — for non-Writing exams */}
                {!isWritingExam && (
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
                                                    // Fallback: if correctOption is just a letter like "A", "B", "C", "D"
                                                    if (correctOptIndex === -1 && q.correctOption.trim().length === 1) {
                                                        const letterIndex = q.correctOption.trim().toUpperCase().charCodeAt(0) - 65;
                                                        if (letterIndex >= 0 && letterIndex < q.options.length) {
                                                            correctOptIndex = letterIndex;
                                                        }
                                                    }
                                                    // Fallback: case-insensitive / trimmed match
                                                    if (correctOptIndex === -1) {
                                                        correctOptIndex = q.options.findIndex(opt => opt.trim().toLowerCase() === q.correctOption.trim().toLowerCase());
                                                    }
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
                                                                            <div key={i} className={`flex-1 flex flex-col items-center gap-1 p-1.5 rounded ${isCorrect ? 'bg-blue-100 ring-2 ring-blue-500' : ''}`}>
                                                                                <span className={`text-xs font-black ${isCorrect ? 'text-white bg-blue-700 w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-400'}`}>
                                                                                    {String.fromCharCode(65 + i)}
                                                                                </span>
                                                                                <div className={`w-full h-4 border ${isCorrect ? 'border-blue-700 bg-blue-700' : 'border-slate-300 bg-white'}`}></div>
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
                )}

                {/* MODEL ANSWERS & TIPS PAGE — Only for Writing exams */}
                {isWritingExam && (
                    <div className="print:break-before-page pt-12 print:pt-4 pb-20">
                        <h2 className="text-2xl font-black uppercase text-center mb-8 border-b-2 border-black pb-4 tracking-widest text-slate-800">
                            Model Answers &amp; Tips
                        </h2>

                        <div className="space-y-10">
                            {examParts.map((part) => {
                                const partQuestions = examQuestions.filter(q => q.part === part.part);
                                const isPart2 = part.part === 2;

                                // Collect model answers / tips from both part-level and question-level
                                const hasPartLevelHelp = part.modelAnswer || part.howToApproach || part.tips;
                                const hasQuestionLevelHelp = partQuestions.some(q => q.modelAnswer || q.howToApproach || q.tips);
                                if (!hasPartLevelHelp && !hasQuestionLevelHelp) return null;

                                return (
                                    <div key={`model-part-${part.part}`} className="break-inside-avoid">
                                        <h3 className="font-bold text-base uppercase bg-emerald-50 text-emerald-900 p-3 border border-emerald-200 rounded-t mb-0">
                                            Part {part.part}: {part.title}
                                        </h3>

                                        <div className="border border-t-0 border-emerald-200 rounded-b p-4 space-y-6">
                                            {/* Part-level help (for Part 1 which has a single task) */}
                                            {!isPart2 && hasPartLevelHelp && (
                                                <div className="space-y-4">
                                                    {part.howToApproach && (
                                                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r">
                                                            <h4 className="font-bold text-blue-900 text-sm mb-2 uppercase tracking-wide">📋 How to Approach</h4>
                                                            <p className="text-sm text-blue-800 whitespace-pre-line leading-relaxed">{part.howToApproach}</p>
                                                        </div>
                                                    )}
                                                    {part.modelAnswer && (
                                                        <div className="bg-emerald-50 border-l-4 border-emerald-400 p-3 rounded-r">
                                                            <h4 className="font-bold text-emerald-900 text-sm mb-2 uppercase tracking-wide">✍️ Model Answer</h4>
                                                            <p className="text-sm text-emerald-800 whitespace-pre-line leading-relaxed">{part.modelAnswer}</p>
                                                        </div>
                                                    )}
                                                    {part.tips && (
                                                        <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r">
                                                            <h4 className="font-bold text-amber-900 text-sm mb-2 uppercase tracking-wide">💡 Tips</h4>
                                                            <p className="text-sm text-amber-800 whitespace-pre-line leading-relaxed">{part.tips}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Also render from Part 1 question-level if present (fallback) */}
                                            {!isPart2 && !hasPartLevelHelp && partQuestions.map((q, i) => (
                                                (q.howToApproach || q.modelAnswer || q.tips) && (
                                                    <div key={`q-help-${q.id}`} className="space-y-4">
                                                        {q.howToApproach && (
                                                            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r">
                                                                <h4 className="font-bold text-blue-900 text-sm mb-2 uppercase tracking-wide">📋 How to Approach</h4>
                                                                <p className="text-sm text-blue-800 whitespace-pre-line leading-relaxed">{q.howToApproach}</p>
                                                            </div>
                                                        )}
                                                        {q.modelAnswer && (
                                                            <div className="bg-emerald-50 border-l-4 border-emerald-400 p-3 rounded-r">
                                                                <h4 className="font-bold text-emerald-900 text-sm mb-2 uppercase tracking-wide">✍️ Model Answer</h4>
                                                                <p className="text-sm text-emerald-800 whitespace-pre-line leading-relaxed">{q.modelAnswer}</p>
                                                            </div>
                                                        )}
                                                        {q.tips && (
                                                            <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r">
                                                                <h4 className="font-bold text-amber-900 text-sm mb-2 uppercase tracking-wide">💡 Tips</h4>
                                                                <p className="text-sm text-amber-800 whitespace-pre-line leading-relaxed">{q.tips}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            ))}

                                            {/* Part 2 question-level help — each task choice gets its own section */}
                                            {isPart2 && partQuestions.map((q, qIdx) => (
                                                (q.howToApproach || q.modelAnswer || q.tips) && (
                                                    <div key={`q-help-${q.id}`} className="space-y-4 print:break-before-page">
                                                        <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3">
                                                            Task {String.fromCharCode(65 + qIdx)}: {q.question.split('\n')[0].replace(/^Task [A-C]:\s*/i, '')}
                                                        </h4>
                                                        {q.howToApproach && (
                                                            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r">
                                                                <h4 className="font-bold text-blue-900 text-sm mb-2 uppercase tracking-wide">📋 How to Approach</h4>
                                                                <p className="text-sm text-blue-800 whitespace-pre-line leading-relaxed">{q.howToApproach}</p>
                                                            </div>
                                                        )}
                                                        {q.modelAnswer && (
                                                            <div className="bg-emerald-50 border-l-4 border-emerald-400 p-3 rounded-r">
                                                                <h4 className="font-bold text-emerald-900 text-sm mb-2 uppercase tracking-wide">✍️ Model Answer</h4>
                                                                <p className="text-sm text-emerald-800 whitespace-pre-line leading-relaxed">{q.modelAnswer}</p>
                                                            </div>
                                                        )}
                                                        {q.tips && (
                                                            <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r">
                                                                <h4 className="font-bold text-amber-900 text-sm mb-2 uppercase tracking-wide">💡 Tips</h4>
                                                                <p className="text-sm text-amber-800 whitespace-pre-line leading-relaxed">{q.tips}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
