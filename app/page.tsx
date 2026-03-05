"use client";

import { useState } from 'react';
import Link from 'next/link';
import { signIn, SessionProvider, useSession } from 'next-auth/react';
import { BookOpen, Lightbulb, Monitor, Sparkles, Share2, Star, Check, X, CheckCircle2, PlayCircle, ShieldCheck, ChevronDown, Users, GraduationCap, FileText, Download, BarChart2, Mic } from 'lucide-react';

export default function LandingPage() {
  return (
    <SessionProvider>
      <LandingPageContent />
    </SessionProvider>
  );
}

function LandingPageContent() {
  const { data: session, status } = useSession();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const faqs = [
    {
      question: "How accurate is the AI grading compared to real Cambridge examiners?",
      answer: "Our AI model has been trained on official CEFR marking rubrics and thousands of graded exam papers. While it shouldn't replace a real examiner for official certification, it provides highly accurate score estimations and actionable feedback that closely mirrors Cambridge standards."
    },
    {
      question: "Are the Listening audios realistic?",
      answer: "Yes, our Premium plan includes high-fidelity text-to-speech voices with various accents (British, American, Australian) to simulate the authentic listening conditions of the real exams."
    },
    {
      question: "Can I cancel my Premium subscription anytime?",
      answer: "Absolutely. There are no lock-in contracts. You can cancel your subscription at any time from your account settings, and you'll retain Premium access until the end of your billing cycle."
    },
    {
      question: "Can I use this to prepare my own students?",
      answer: "Yes! Many teachers use our platform to generate custom Mock Exams on specific topics, assign them to students, and review their auto-graded results using the public sharing links."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Top Bar */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-blue-600" strokeWidth={2.5} />
          <span className="font-bold text-lg tracking-tight">CEFR Mock Exams</span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">How it Works</Link>
            <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</Link>
            <Link href="#testimonials" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Testimonials</Link>
            <Link href="#pricing" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Pricing</Link>
          </nav>
          {status === "loading" ? (
            <div className="w-16 h-9 bg-slate-200 animate-pulse rounded-lg"></div>
          ) : session ? (
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              Dashboard
            </Link>
          ) : (
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="text-sm font-semibold text-white bg-slate-900 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Log in
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative overflow-hidden bg-slate-50 pt-16 pb-24 lg:pt-32 lg:pb-40">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800 mb-6">
                  <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2"></span>
                  AI-Powered Exam Prep
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
                  Pass Your Cambridge Exam <br className="hidden lg:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">on the First Try.</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Stop wasting time on generic books. Take hyper-realistic mock exams for B2 First, C1 Advanced, and C2 Proficiency and get instant, examiner-level AI feedback to guarantee your success.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  {status === "loading" ? (
                    <div className="px-8 py-4 w-56 h-14 rounded-xl bg-slate-200 animate-pulse"></div>
                  ) : session ? (
                    <Link
                      href="/dashboard"
                      className="px-8 py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all hover:scale-105 shadow-lg shadow-blue-600/20 text-center flex items-center justify-center"
                    >
                      Go to Dashboard
                    </Link>
                  ) : (
                    <button
                      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                      className="px-8 py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all hover:scale-105 shadow-lg shadow-blue-600/20"
                    >
                      Start Practicing Free
                    </button>
                  )}
                  <button onClick={() => setIsVideoModalOpen(true)} className="px-8 py-4 rounded-xl bg-white text-slate-700 font-bold text-lg border border-slate-200 hover:bg-slate-50 transition-all hover:border-slate-300 flex items-center justify-center gap-2 group">
                    <PlayCircle className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    See it in action
                  </button>
                  <button onClick={() => setIsPdfModalOpen(true)} className="px-8 py-4 rounded-xl bg-white text-slate-700 font-bold text-lg border border-slate-200 hover:bg-slate-50 transition-all hover:border-slate-300 flex items-center justify-center gap-2 group">
                    <FileText className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition-colors" />
                    Presentation
                  </button>
                </div>
                <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-8 w-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden`}>
                        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300"></div>
                      </div>
                    ))}
                  </div>
                  <p>Join 1,000+ students today</p>
                </div>
              </div>

              {/* Hero Visual */}
              <div className="flex-1 w-full max-w-xl lg:max-w-none">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20"></div>
                  <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      </div>
                      <div className="ml-4 bg-white px-3 py-1 rounded-md text-xs text-slate-400 border border-slate-200 flex-1 text-center font-mono">cefr-mock-exams.com/practice/review</div>
                    </div>
                    <div className="w-full bg-slate-900">
                      <video
                        src="/videos/highlights.mp4"
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges Banner */}
        <div className="bg-white border-b border-slate-100 py-6">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Aligned with Global Standards</p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              {['B2 First', 'C1 Advanced', 'C2 Proficiency', 'CEFR Framework'].map((badge) => (
                <div key={badge} className="flex items-center gap-2 font-bold text-lg text-slate-700">
                  <ShieldCheck className="w-6 h-6 text-blue-600" />
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="border-y border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-slate-900 mb-1">C2</div>
              <div className="text-sm font-medium text-slate-500">Proficiency Level</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-slate-900 mb-1">24/7</div>
              <div className="text-sm font-medium text-slate-500">AI Availability</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-slate-900 mb-1">Instant</div>
              <div className="text-sm font-medium text-slate-500">Feedback</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-slate-900 mb-1">100%</div>
              <div className="text-sm font-medium text-slate-500">Exam Focused</div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div id="how-it-works" className="bg-slate-50 py-24 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800 mb-4">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2"></span>
                Step-by-Step Guide
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How it works</h2>
              <p className="text-lg text-slate-600">
                Master your CEFR exam in three simple steps.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connector Line (Desktop Only) */}
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-slate-200 z-0"></div>

              {/* Step 1 */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-white border-4 border-slate-50 shadow-xl flex items-center justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">1</div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Generate Custom Exam</h3>
                <p className="text-slate-600 leading-relaxed max-w-xs">
                  Select your skill (Reading, Writing, Listening, Speaking), CEFR level, and optional topics to instantly create a customized mock exam.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-white border-4 border-slate-50 shadow-xl flex items-center justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">2</div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Take the Test</h3>
                <p className="text-slate-600 leading-relaxed max-w-xs">
                  Practice with our highly realistic interface that simulates the official computer-based exam environment perfectly.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-white border-4 border-slate-50 shadow-xl flex items-center justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-2xl font-bold">3</div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Get Instant AI Feedback</h3>
                <p className="text-slate-600 leading-relaxed max-w-xs">
                  Receive detailed analysis, accurate scores, comprehensive rationales, and actionable tips for improvement instantly.
                </p>
              </div>
            </div>

            <div className="mt-16 text-center">
              <Link href="/how-to-use" className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                View detailed guide <span className="ml-2">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Speaking Feature Highlight (Our Edge) */}
        <div className="bg-slate-900 py-24 overflow-hidden relative">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-300 mb-6">
                  <Sparkles className="w-4 h-4 mr-2 text-blue-400" />
                  Our Competitive Edge
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                  Master the Speaking Test with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Instant AI Feedback</span>
                </h2>
                <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                  Unlike traditional reviewers or generic books, you can actually <strong>record your answers</strong> directly on our platform. Within seconds, our AI analyzes your pronunciation, grammar, and fluency—giving you actionable feedback to improve your speech instantly.
                </p>
                <ul className="space-y-4 text-left inline-block max-w-lg mx-auto lg:mx-0">
                  <li className="flex items-start gap-4 text-slate-200">
                    <div className="mt-1 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Mic className="w-4 h-4 text-blue-400" />
                    </div>
                    <span><strong>Record answers</strong> mirroring the real exam format and timing.</span>
                  </li>
                  <li className="flex items-start gap-4 text-slate-200">
                    <div className="mt-1 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <span><strong>Instant AI analysis</strong> of your pronunciation, vocabulary, and fluency.</span>
                  </li>
                  <li className="flex items-start gap-4 text-slate-200">
                    <div className="mt-1 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <BarChart2 className="w-4 h-4 text-green-400" />
                    </div>
                    <span><strong>Targeted feedback</strong> to fix mistakes and boost your overall score.</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1 w-full max-w-xl lg:max-w-none">
                <div className="relative rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl p-2 sm:p-4">
                  {/* Mockup of speaking test interface */}
                  <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700 relative">
                    <div className="p-4 sm:p-6 border-b border-slate-800">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-6 w-24 bg-slate-800 rounded-md"></div>
                        <div className="h-6 w-16 bg-blue-900/50 text-blue-400 rounded-md flex items-center justify-center text-xs font-bold">01:45</div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-full bg-slate-800 rounded-md"></div>
                        <div className="h-4 w-5/6 bg-slate-800 rounded-md"></div>
                        <div className="h-4 w-4/6 bg-slate-800 rounded-md"></div>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6 flex flex-col items-center justify-center py-10 gap-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)] relative z-10">
                          <Mic className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <div className="flex gap-1 text-slate-400 text-sm font-medium animate-pulse">
                        Listening to your answer...
                      </div>
                      {/* Audio wave animation */}
                      <div className="flex items-center gap-1 h-8">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(i => (
                          <div key={i} className="w-1.5 bg-blue-500 rounded-full" style={{ height: `${Math.max(20, Math.random() * 100)}%`, opacity: 0.6 + Math.random() * 0.4 }}></div>
                        ))}
                      </div>
                    </div>
                    {/* Feedback mock popup */}
                    <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-2xl p-4 sm:p-5 border border-slate-200 lg:translate-y-6 lg:translate-x-6 max-w-sm lg:ml-auto z-20">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm mb-1">Great vocabulary!</div>
                          <div className="text-sm text-slate-600">
                            You correctly used the idiom <em>"a blessing in disguise"</em>. Work on pausing less between clauses to improve fluency.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="bg-white py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need to pass</h2>
              <p className="text-lg text-slate-600">
                We've analyzed the official marking criteria to build tools that actually help you improve your score.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-600/20">
                  <Monitor className="w-7 h-7" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Realistic Interface</h3>
                <p className="text-slate-600 leading-relaxed">Practice with a UI that mirrors the official computer-based CEFR exams. Get comfortable with the format before test day.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-600/20">
                  <Sparkles className="w-7 h-7" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">AI-Powered Feedback</h3>
                <p className="text-slate-600 leading-relaxed">Get instant, detailed analysis. Every question comes with a rationale, approach strategy, and helpful tips.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-orange-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-orange-600/20">
                  <Download className="w-7 h-7" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Printable PDF Exams</h3>
                <p className="text-slate-600 leading-relaxed">Download any reading, writing, or listening exam fully formatted to mimic official Cambridge test papers, complete with answer sheets.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-purple-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-purple-600/20">
                  <FileText className="w-7 h-7" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Advanced Writing</h3>
                <p className="text-slate-600 leading-relaxed">Choose between multiple writing prompts per exam. Review detailed model answers and comprehensive writing strategies.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-emerald-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-600/20">
                  <BarChart2 className="w-7 h-7" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Progress Tracking</h3>
                <p className="text-slate-600 leading-relaxed">Monitor your accuracy and specific CEFR skill milestones over time. Share beautiful scorecards of your progress instantly.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-teal-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-teal-600/20">
                  <Share2 className="w-7 h-7" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Public Exam Sharing</h3>
                <p className="text-slate-600 leading-relaxed">Generate mock exams on specific literature topics, save them, and share them with your students or peers using a public link.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Who is this for Section */}
        <div className="bg-slate-50 py-24 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Who is this for?</h2>
              <p className="text-lg text-slate-600">Built to save time and boost scores for both learners and educators.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex gap-6 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">For Students</h3>
                  <p className="text-slate-600 mb-4">Aiming to pass B2 First, C1 Advanced, or C2 Proficiency? Stop relying on generic practice tests.</p>
                  <ul className="space-y-2 text-sm text-slate-700 font-medium">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Overcome speaking anxiety with AI practice</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Know your exact weak points in writing</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Practice with endless, fresh mock exams</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex gap-6 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">For Teachers & Tutors</h3>
                  <p className="text-slate-600 mb-4">Tired of marking endless essays or searching for relevant reading materials?</p>
                  <ul className="space-y-2 text-sm text-slate-700 font-medium">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Generate exams on grammar topics you just taught</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Let AI do the heavy lifting for writing corrections</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Print authentic Cambridge-style PDFs for class</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Section */}
        <div className="bg-white py-24 border-t border-slate-100 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-800 mb-4">
                <span className="flex h-2 w-2 rounded-full bg-orange-600 mr-2"></span>
                The Smart Choice
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why our platform wins</h2>
              <p className="text-lg text-slate-600">
                We combine the personalization of a tutor with the convenience and affordability of a book.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-start relative">
              {/* Desktop connecting lines */}
              <div className="hidden md:block absolute top-[120px] left-1/6 right-1/6 h-0.5 bg-slate-100 z-0"></div>

              {/* Books */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 opacity-90 relative z-10 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
                  <BookOpen className="w-7 h-7 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-6">Generic Books</h3>
                <ul className="space-y-4">
                  <li className="flex gap-3 text-slate-600 items-start">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Generic content that doesn't adapt to your weaknesses</span>
                  </li>
                  <li className="flex gap-3 text-slate-600 items-start">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>No interactive speaking practice or feedback</span>
                  </li>
                  <li className="flex gap-3 text-slate-600 items-start">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Static answers without detailed AI analysis</span>
                  </li>
                </ul>
              </div>

              {/* Our Platform */}
              <div className="bg-blue-50 p-8 rounded-2xl border-2 border-blue-600 shadow-xl shadow-blue-600/10 relative z-20 transform md:-translate-y-4">
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1.5 rounded-bl-xl rounded-tr-xl text-xs font-bold uppercase tracking-wider">CEFR Mock Exams</div>
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/30">
                  <Monitor className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-blue-900 mb-6">Self-Paced Platform</h3>
                <ul className="space-y-4">
                  <li className="flex gap-3 text-blue-900 font-medium items-start">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span>100% focused on exact skills needed for CEFR exams</span>
                  </li>
                  <li className="flex gap-3 text-blue-900 font-medium items-start">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span>Instant, personalized AI feedback on Speaking & Writing</span>
                  </li>
                  <li className="flex gap-3 text-blue-900 font-medium items-start">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span>Available 24/7 with endless realistic mock exams</span>
                  </li>
                </ul>
              </div>

              {/* Personal Tutor */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 opacity-90 relative z-10 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-6">Personal Tutor</h3>
                <ul className="space-y-4">
                  <li className="flex gap-3 text-slate-600 items-start">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Very expensive, often costing €30-€50+ per hour</span>
                  </li>
                  <li className="flex gap-3 text-slate-600 items-start">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Difficult to schedule around your busy lifestyle</span>
                  </li>
                  <li className="flex gap-3 text-slate-600 items-start">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Limited availability for instant, on-demand answers</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <div id="testimonials" className="bg-white py-24 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-800 mb-4">
                <span className="flex h-2 w-2 rounded-full bg-indigo-600 mr-2"></span>
                Trusted by educators
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">What our users say</h2>
              <p className="text-lg text-slate-600">
                Teachers and students from around the world use CEFR Mock Exams to prepare for success.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  name: "María García",
                  role: "English Teacher",
                  location: "Madrid, Spain",
                  quote: "I use this daily with my B2 and C1 classes. The AI-generated exams are incredibly realistic — my students can't believe they're not from Cambridge. It's saved me hours of prep time every week.",
                  stars: 5,
                  accent: "from-blue-600 to-blue-400",
                },
                {
                  name: "Lukas Müller",
                  role: "C1 Student",
                  location: "Munich, Germany",
                  quote: "I passed my CAE with a score of 192 after practising here for just 3 weeks. The detailed feedback on every question helped me understand exactly where I was going wrong.",
                  stars: 5,
                  accent: "from-indigo-600 to-indigo-400",
                },
                {
                  name: "Sophie Laurent",
                  role: "Language Academy Director",
                  location: "Lyon, France",
                  quote: "We've integrated this into our curriculum across all levels. The ability to generate unlimited custom exams on any topic is a game-changer for differentiated learning.",
                  stars: 5,
                  accent: "from-teal-600 to-teal-400",
                },
                {
                  name: "Tomáš Novák",
                  role: "B2 Student",
                  location: "Prague, Czech Republic",
                  quote: "The speaking practice with AI assessment is brilliant. I was too shy to practise with my teacher, but here I can record as many attempts as I want.",
                  stars: 5,
                  accent: "from-purple-600 to-purple-400",
                },
                {
                  name: "Anna Kowalski",
                  role: "Private Tutor",
                  location: "Warsaw, Poland",
                  quote: "My students love the instant feedback. I can assign exams on specific topics we've covered in class and track their progress. The premium plan is worth every cent.",
                  stars: 5,
                  accent: "from-rose-600 to-rose-400",
                },
                {
                  name: "Dimitris Papadopoulos",
                  role: "C2 Student",
                  location: "Athens, Greece",
                  quote: "Finding CPE practice material is nearly impossible. This platform generates fresh, high-quality C2 exams every time. I've recommended it to everyone at my language school.",
                  stars: 5,
                  accent: "from-amber-600 to-amber-400",
                },
              ].map((testimonial, i) => (
                <div
                  key={i}
                  className="relative bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
                >
                  <div className={`absolute top-0 left-8 right-8 h-1 rounded-b-full bg-gradient-to-r ${testimonial.accent}`}></div>
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.stars }).map((_, j) => (
                      <Star key={j} className="w-5 h-5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 leading-relaxed mb-6 flex-1 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                    <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${testimonial.accent} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{testimonial.name}</div>
                      <div className="text-xs text-slate-500">{testimonial.role} · {testimonial.location}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white py-24 border-t border-slate-100 max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-slate-600">Common questions about CEFR Mock Exams.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-blue-300 transition-colors">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left bg-white font-bold text-slate-900"
                >
                  <span className="pr-4">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 shrink-0 ${openFaqIndex === index ? 'rotate-180' : ''}`} />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="px-6 pb-6 text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Section */}
        <div id="pricing" className="bg-slate-50 py-24 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple, transparent pricing</h2>
              <p className="text-lg text-slate-600">Choose the plan that's right for your exam preparation journey.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Plan */}
              <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm relative flex flex-col">
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Free Plan</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">€0</span>
                    <span className="text-slate-500">/forever</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">No credit card required.</p>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  <li className="flex items-center gap-3 text-slate-600">
                    <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
                    10 Exam Generations
                  </li>
                  <li className="flex items-center gap-3 text-slate-600">
                    <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
                    Reading & Use of English
                  </li>
                  <li className="flex items-center gap-3 text-slate-600">
                    <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
                    Writing & Speaking
                  </li>
                  <li className="flex items-center gap-3 text-slate-400 decoration-slate-300">
                    <X className="w-5 h-5 text-slate-300" strokeWidth={3} />
                    No Listening Exams
                  </li>
                </ul>
                {status === "loading" ? (
                  <div className="w-full py-4 h-14 rounded-xl bg-slate-200 animate-pulse"></div>
                ) : session ? (
                  <Link
                    href="/dashboard"
                    className="w-full py-4 rounded-xl bg-slate-100 text-slate-900 font-bold hover:bg-slate-200 transition-all text-center flex items-center justify-center"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <button
                    onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                    className="w-full py-4 rounded-xl bg-slate-100 text-slate-900 font-bold hover:bg-slate-200 transition-all"
                  >
                    Get Started
                  </button>
                )}
              </div>

              {/* Premium Plan */}
              <div className="bg-white rounded-3xl p-10 border-2 border-blue-600 shadow-xl shadow-blue-600/10 relative flex flex-col scale-105">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Most Popular</div>
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Premium Plan</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">€10</span>
                    <span className="text-slate-500">/month</span>
                  </div>
                  <p className="text-sm text-blue-600 font-medium mt-2 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Cancel anytime. Secure payment.</p>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  <li className="flex items-center gap-3 text-slate-900 font-medium">
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    100 Exam Generations
                  </li>
                  <li className="flex items-center gap-3 text-slate-900 font-medium">
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    Listening Exams (High Fidelity Audio)
                  </li>
                  <li className="flex items-center gap-3 text-slate-900 font-medium">
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    Full Access to All Skills
                  </li>
                  <li className="flex items-center gap-3 text-slate-900 font-medium">
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    Unlimited Speaking Practice
                  </li>
                </ul>
                {status === "loading" ? (
                  <div className="w-full py-4 h-14 rounded-xl bg-blue-200 animate-pulse"></div>
                ) : session ? (
                  <Link
                    href="/dashboard"
                    className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 text-center flex items-center justify-center"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <button
                    onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                    className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    Upgrade to Premium
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* CTA Section */}
        <div className="bg-slate-900 py-24 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Ready to ace your exam?
            </h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Join thousands of students who are already using our platform to prepare for their CEFR English exams.
            </p>
            {status === "loading" ? (
              <div className="mx-auto w-64 h-16 rounded-xl bg-slate-700 animate-pulse"></div>
            ) : session ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-10 py-5 rounded-xl bg-white text-slate-900 font-bold text-xl hover:bg-blue-50 transition-all hover:scale-105 shadow-xl"
              >
                Go to Dashboard
              </Link>
            ) : (
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="px-10 py-5 rounded-xl bg-white text-slate-900 font-bold text-xl hover:bg-blue-50 transition-all hover:scale-105 shadow-xl"
              >
                Get Started for Free
              </button>
            )}
            <p className="mt-6 text-sm text-slate-400">No credit card required for free tier.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-6 w-6 text-blue-600" strokeWidth={2.5} />
                <span className="font-bold text-xl text-slate-900">CEFR Mock Exams</span>
              </div>
              <p className="text-slate-500 max-w-sm">
                The smartest way to prepare for CEFR English exams. AI-powered feedback, realistic simulations, and progress tracking.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">Features</Link></li>
                <li><Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">Pricing</Link></li>
                <li><Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">Testimonials</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">&copy; 2026 CEFR Mock Exams. All rights reserved.</p>
            <div className="flex gap-6">
              {/* Social icons could go here */}
            </div>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsVideoModalOpen(false)}>
          <div className="bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl ring-1 ring-white/20 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-slate-800 shrink-0">
              <h3 className="text-white font-bold flex items-center gap-2 text-sm sm:text-base">
                <PlayCircle className="w-5 h-5 text-blue-400" />
                CEFR Mock Exams Overview
              </h3>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full flex-1 bg-black overflow-hidden flex items-center justify-center">
              <video
                src="/videos/AI_English_Exam_Prep.mp4"
                controls
                autoPlay
                className="w-full h-full max-h-[calc(90vh-60px)] object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}

      {/* PDF Presentation Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsPdfModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-slate-800 font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                Platform Presentation
              </h3>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="p-1 flex items-center gap-1 rounded-lg text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-200 transition-colors"
              >
                Close <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full flex-1 bg-slate-200">
              <iframe
                src="/presentation/AI_Powered_CEFR_Mastery.pdf"
                className="w-full h-full border-none"
                title="AI CEFR Mastery Presentation"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}