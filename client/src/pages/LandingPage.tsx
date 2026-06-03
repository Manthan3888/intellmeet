import { Link } from 'react-router-dom';
import { Video, Sparkles, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <Video className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">IntellMeet</span>
        </div>
        <div className="flex gap-3">
          <Link to="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/signup">
            <Button>Get started</Button>
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
          <Sparkles className="h-4 w-4" />
          AI-Powered Enterprise Meetings
        </div>
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-6xl">
          Turn every meeting into
          <span className="block bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            actionable outcomes
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400">
          Real-time video meetings with AI summaries, smart action items, team collaboration, and analytics —
          built for modern remote teams.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/signup">
            <Button size="lg">
              Start free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="secondary">
              Join a meeting
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-3">
        {[
          { icon: Video, title: 'Real-Time Video', desc: 'HD video, screen sharing, and in-meeting chat with WebRTC.' },
          { icon: Sparkles, title: 'AI Intelligence', desc: 'Automatic summaries and action item extraction after every meeting.' },
          { icon: Users, title: 'Team Collaboration', desc: 'Kanban boards, task tracking, and workspace management.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <Icon className="mb-4 h-8 w-8 text-indigo-400" />
            <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-slate-400">{desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        <p>IntellMeet · Zidio Development · MERN Stack · {new Date().getFullYear()}</p>
        <p className="mt-2 text-xs text-slate-600">Demo: demo@intellmeet.com / demo1234 · Room code DEMO1234 (after seed)</p>
      </footer>
    </div>
  );
}
