import { Sora, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import CommandPalette from '@/components/CommandPalette';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', weight: ['500', '600', '700', '800'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body">
        {/* Runs before React hydrates, so returning visitors with dark mode
            saved don't see a flash of the light theme first. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('nest-theme');
                  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />

        <div className="aurora-mesh">
          <div className="aurora-blob aurora-blob--1" />
          <div className="aurora-blob aurora-blob--2" />
          <div className="aurora-blob aurora-blob--3" />
        </div>
        <div className="relative z-10">{children}</div>

        <CommandPalette />
      </body>
    </html>
  );
}