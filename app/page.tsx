"use client";

import Link from 'next/link';
import { signIn, SessionProvider, useSession } from 'next-auth/react';
import { BookOpen, Lightbulb, Monitor, Sparkles, Share2, Star, Check, X, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <SessionProvider>
      <LandingPageContent />
    </SessionProvider>
  );
}

function LandingPageContent() {
  const { data: session, status } = useSession();

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
                  Create Your <br className="hidden lg:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Custom Exam</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Experience realistic exam simulations for B2 First, C1 Advanced, and C2 Proficiency. Get instant, detailed AI feedback on your writing and speaking.
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
                  <Link href="#features" className="px-8 py-4 rounded-xl bg-white text-slate-700 font-bold text-lg border border-slate-200 hover:bg-slate-50 transition-all hover:border-slate-300">
                    Learn More
                  </Link>
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
                    <div className="p-6 md:p-8 bg-white">
                      <div className="flex gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          <Lightbulb className="w-6 h-6" strokeWidth={2} />
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
                  <Monitor className="w-7 h-7" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Realistic Interface</h3>
                <p className="text-slate-600 leading-relaxed">Practice with a UI that mirrors the official computer-based CEFR Mock exams. Get comfortable with the format before exam day.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-600/20">
                  <Sparkles className="w-7 h-7" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">AI-Powered Feedback</h3>
                <p className="text-slate-600 leading-relaxed">Get instant, detailed analysis. Every question comes with a rationale, approach strategy, and helpful tips.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-teal-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-teal-600/20">
                  <Share2 className="w-7 h-7" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Public Sharing</h3>
                <p className="text-slate-600 leading-relaxed">Share your exam results and generated content with a public link. Great for showing your progress to teachers or peers.</p>
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

    </div>
  );
}