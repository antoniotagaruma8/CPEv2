# ☁️ CAMBRIDGE EXAM GENERATOR: ZERO-BUDGET MASTER BLUEPRINT

**Project:** Cambridge Exam Simulator (Free Tier Edition)
**Stack:** Next.js 14+ (App Router), Vercel (Hobby), Supabase (Free), Gemini 1.5 Flash (Free), Pollinations.ai
**Deployment:** 100% Free / Serverless
**Version:** FREE_FINAL_1.5 (With Timer, Grading & Printing)

---

## 🏗️ 1. TECH STACK (The "Walang Bayad" List)

* **Frontend:** **Next.js 14** (Vercel Free Tier).
* **Database:** **Supabase** (Free Tier).
* **AI Logic:** **Gemini 1.5 Flash** (Free API Key via Google AI Studio).
* **Images:** **Pollinations.ai** (Free, No Key needed).
* **Audio:** **Web Speech API** (Browser Native - $0).
* **Styling:** **Tailwind CSS** (Built-in).

---

## 📂 2. PROJECT STRUCTURE

```text
/CPE
  ├── /app
  │    ├── /admin
  │    │    ├── /create          <-- Exam Generator
  │    │    └── /grader          <-- Essay/Speech Checker (NEW!)
  │    ├── /lesson/[id]          <-- TV/Student View
  │    ├── /api
  │    │    ├── /generate        <-- Batch Generator
  │    │    └── /grade           <-- Grading Logic (NEW!)
  │
  ├── /components
  │    ├── /public
  │    │    ├── AudioPlayer.tsx       <-- Browser TTS
  │    │    ├── ExamTimer.tsx         <-- Countdown Clock (NEW!)
  │    │    └── SpeakingPart2View.tsx <-- Pollinations Images
  │    ├── /admin
  │    │    └── PrintLayout.tsx       <-- CSS for clean PDF export (NEW!)
  │
  ├── /lib
  │    ├── gemini.ts             <-- With Rate Limiting
  │    ├── image-gen.ts          <-- Pollinations URL Generator
  │    └── supabase.ts
  │
  └── .env.local                 <-- Secrets (SUPABASE, GEMINI_KEY)