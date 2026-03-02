"use client";

import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Top Bar */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <svg className="h-7 w-7 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.59L7.41 14l1.41-1.41L11 14.17l4.59-4.59L17 11l-6 6z" fill="currentColor"/>
          </svg>
          <span className="font-bold text-lg tracking-tight">CPE Practice</span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</Link>
            <Link href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Pricing</Link>
          </nav>
          <button 
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="text-sm font-semibold text-white bg-slate-900 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Log in
          </button>
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
                  Create Your <br className="hidden lg:block"/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Custom Exam</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Experience realistic exam simulations for B2 First, C1 Advanced, and C2 Proficiency. Get instant, detailed AI feedback on your writing and speaking.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <button 
                    onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                    className="px-8 py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all hover:scale-105 shadow-lg shadow-blue-600/20"
                  >
                    Start Practicing Free
                  </button>
                  <Link href="#features" className="px-8 py-4 rounded-xl bg-white text-slate-700 font-bold text-lg border border-slate-200 hover:bg-slate-50 transition-all hover:border-slate-300">
                    Learn More
                  </Link>
                </div>
                <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map((i) => (
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
                      <div className="ml-4 bg-white px-3 py-1 rounded-md text-xs text-slate-400 border border-slate-200 flex-1 text-center font-mono">cpe-practice.com/practice/review</div>
                    </div>
                    <div className="p-6 md:p-8 bg-white">
                      <div className="flex gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">Question Analysis</h3>
                          <p className="text-sm text-slate-500">Detailed breakdown of your answer.</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-50 rounded-lg text-sm">
                          <span className="font-bold text-slate-700 block mb-1">Rationale</span>
                          <span className="text-slate-600">The correct answer is "despite" because it introduces a contrast with a noun phrase.</span>
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                          <span className="font-bold text-blue-800 block mb-1">How to approach</span>
                          <span className="text-blue-700">Identify the contrast between the two clauses and check the grammatical structure following the gap.</span>
                        </div>
                        <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm">
                          <span className="font-bold text-green-800 block mb-1">Tip</span>
                          <span className="text-green-700">"Although" would require a full clause (subject + verb).</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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

        {/* Features Section */}
        <div id="features" className="bg-white py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need to pass</h2>
              <p className="text-lg text-slate-600">
                We've analyzed the official marking criteria to build tools that actually help you improve your score.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-600/20">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Realistic Interface</h3>
                <p className="text-slate-600 leading-relaxed">Practice with a UI that mirrors the official computer-based Cambridge exams. Get comfortable with the format before exam day.</p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-600/20">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">AI-Powered Feedback</h3>
                <p className="text-slate-600 leading-relaxed">Get instant, detailed analysis. Every question comes with a rationale, approach strategy, and helpful tips.</p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-teal-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-teal-600/20">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Public Sharing</h3>
                <p className="text-slate-600 leading-relaxed">Share your exam results and generated content with a public link. Great for showing your progress to teachers or peers.</p>
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
              Join thousands of students who are already using our platform to prepare for their Cambridge English exams.
            </p>
            <button 
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="px-10 py-5 rounded-xl bg-white text-slate-900 font-bold text-xl hover:bg-blue-50 transition-all hover:scale-105 shadow-xl"
            >
              Get Started for Free
            </button>
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
                <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.59L7.41 14l1.41-1.41L11 14.17l4.59-4.59L17 11l-6 6z" fill="currentColor"/>
                </svg>
                <span className="font-bold text-xl text-slate-900">CPE Practice</span>
              </div>
              <p className="text-slate-500 max-w-sm">
                The smartest way to prepare for Cambridge English exams. AI-powered feedback, realistic simulations, and progress tracking.
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
            <p className="text-sm text-slate-500">&copy; 2024 CPE Practice. All rights reserved.</p>
            <div className="flex gap-6">
              {/* Social icons could go here */}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}