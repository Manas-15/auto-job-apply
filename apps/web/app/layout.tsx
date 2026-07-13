import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { StatusBar } from '@/components/StatusBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Auto Job Apply — AI Career Assistant',
  description: 'Find jobs, analyze JDs, score your resume (ATS), and apply.',
};

// Applies the saved/system theme before first paint to avoid a flash.
const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <div className="flex min-h-screen">
          <Nav />
          <div className="flex min-w-0 flex-1 flex-col">
            <StatusBar />
            <main className="min-w-0 flex-1 p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
