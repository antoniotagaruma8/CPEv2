"use client";

import Link from 'next/link';
import { signIn, SessionProvider, useSession } from 'next-auth/react';
import { BookOpen, Monitor, CheckCircle2, FileText, Mic, LayoutDashboard, Video } from 'lucide-react';

export default function HowToUsePage() {
    return (
        <SessionProvider>
            <HowToUseContent />
        </SessionProvider>
    );
}

function HowToUseContent() {
    const { data: session, status } = useSession();

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
            {/* Top Bar - Reused from Landing page */}
            <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-50">
                <Link href="/" className="flex items-center gap-3">
                    <BookOpen className="h-7 w-7 text-blue-600" strokeWidth={2.5} />
                    <span className="font-bold text-lg tracking-tight">CEFR Mock Exams</span>
                </Link>
                <div className="flex items-center gap-6">
                    <nav className="hidden md:flex items-center gap-6">
                        <Link href="/#how-it-works" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">How it Works</Link>
                        <Link href="/#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</Link>
                    </nav>
                    {status === "loading" ? (
                        <div className="w-16 h-9 bg-slate-200 animate-pulse rounded-lg"></div>
                    ) : session ? (
                        <Link href="/dashboard" className="text-sm font-semibold text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">Dashboard</Link>
                    ) : (
                        <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })} className="text-sm font-semibold text-white bg-slate-900 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">Log in</button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
                <div className="mb-12 text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">How to Use CEFR Mock Exams</h1>
                    <p className="text-lg text-slate-600 max-w-2xl">
                        Welcome to the ultimate platform for CEFR English exam preparation. This guide will walk you through everything you need to know to get the most out of our tools.
                    </p>
                </div>

                <div className="space-y-12">
                    {/* Quick Overview */}
                    <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                                <Video className="w-6 h-6" strokeWidth={2} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Quick Overview</h2>
                        </div>
                        <p className="text-slate-600 mb-6">
                            Watch our quick tutorial video or review our presentation to see what the platform can do for you.
                        </p>

                        <div className="w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-slate-900 aspect-video mb-6">
                            <video
                                src="/videos/AI_English_Exam_Prep.mp4"
                                controls
                                className="w-full h-full object-cover"
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <a
                                href="/presentation/AI_Powered_CEFR_Mastery.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 rounded-xl font-medium transition-colors border border-blue-200 shadow-sm inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                            >
                                <FileText className="w-5 h-5" />
                                View Platform Presentation (PDF)
                            </a>
                        </div>
                    </section>

                    {/* Section 1 */}
                    <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <LayoutDashboard className="w-6 h-6" strokeWidth={2} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Navigating the Dashboard</h2>
                        </div>
                        <p className="text-slate-600 mb-4">
                            When you log in, you will be directed to your dashboard. This is your central hub for exam preparation.
                        </p>
                        <ul className="space-y-3 mt-4">
                            <li className="flex gap-3 text-slate-600">
                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                <span><strong>The Generator Box:</strong> Located prominently on the dashboard. Use this to select the skill (Reading, Writing, Listening, Speaking), CEFR level, and theme for a new exam.</span>
                            </li>
                            <li className="flex gap-3 text-slate-600">
                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                <span><strong>Saved Exams Column:</strong> Quickly access all the past exams you've generated or attempted.</span>
                            </li>
                            <li className="flex gap-3 text-slate-600">
                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                <span><strong>User Settings & Themes:</strong> Use the top-right menu to switch between Dark and Light mode, view profile details, or access quick tips.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 2 */}
                    <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                <FileText className="w-6 h-6" strokeWidth={2} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Generating an Exam</h2>
                        </div>
                        <p className="text-slate-600 mb-4">
                            Creating a custom mock exam is straightforward. Choose between the test formats:
                        </p>
                        <div className="pl-4 border-l-2 border-slate-200 space-y-4">
                            <div>
                                <h4 className="font-bold text-slate-900 mb-1">1. Choose a Skill</h4>
                                <p className="text-slate-600 text-sm">Select Reading & Use of English, Writing, Listening, or Speaking.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 mb-1">2. Pick a CEFR Level</h4>
                                <p className="text-slate-600 text-sm">Currently supporting B2 (First), C1 (Advanced), and C2 (Proficiency).</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 mb-1">3. Custom Preferences (Optional)</h4>
                                <p className="text-slate-600 text-sm">Input a specific topic you want the AI to generate the exam around. Hit "Generate" and you're ready to go!</p>
                            </div>
                        </div>
                    </section>

                    {/* Section 3 */}
                    <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                                <Monitor className="w-6 h-6" strokeWidth={2} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Taking Reading & Listening Tests</h2>
                        </div>
                        <p className="text-slate-600 mb-4">
                            Our interface mirrors the official computer-based testing format for standardized CEFR exams.
                        </p>
                        <ul className="space-y-3 mt-4">
                            <li className="flex gap-3 text-slate-600">
                                <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                                <span><strong>Split Screen:</strong> Read the exam material on the left while answering questions on the right.</span>
                            </li>
                            <li className="flex gap-3 text-slate-600">
                                <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                                <span><strong>Audio Controls:</strong> For listening formats, you'll have native audio playback functionality right inside the exam window.</span>
                            </li>
                            <li className="flex gap-3 text-slate-600">
                                <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                                <span><strong>Instant Feedback:</strong> Upon submitting, we immediately score your test and provide a comprehensive rationale for every single question.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                                <Mic className="w-6 h-6" strokeWidth={2} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Using the Speaking Tool</h2>
                        </div>
                        <p className="text-slate-600 mb-4">
                            The Speaking Assessment tool uses advanced AI to analyze your speaking test attempts.
                        </p>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <ol className="list-decimal pl-5 space-y-2 text-slate-600 text-sm">
                                <li>Click <strong>Start Recording</strong> to speak your answer to the prompt.</li>
                                <li>Wait shortly while the native Audio processing works.</li>
                                <li>Review the in-depth AI grading for Grammar & Vocabulary, Discourse Management, Pronunciation, and Interactive Communication.</li>
                                <li>Check the "Possible Answers" after attempting questions for model inspiration.</li>
                            </ol>
                        </div>
                    </section>
                </div>

                <div className="mt-16 text-center">
                    <Link href="/dashboard" className="inline-flex items-center px-8 py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                        Ready? Go to Dashboard
                    </Link>
                </div>
            </main>

            <footer className="bg-white border-t border-slate-200 py-8">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
                    <p className="text-sm text-slate-500">&copy; 2026 CEFR Mock Exams. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
