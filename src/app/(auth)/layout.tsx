import Link from 'next/link';
import { Stack } from '@phosphor-icons/react/dist/ssr';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 flex-col justify-between p-12 relative overflow-hidden">
        {/* Animated brand gradient blobs */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-safety-orange/15 rounded-full blur-3xl pointer-events-none animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-safety-orange/10 rounded-full blur-3xl pointer-events-none animate-[float_10s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-safety-orange/8 rounded-full blur-3xl pointer-events-none animate-[float_12s_ease-in-out_infinite_2s]" />
        <style>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -20px) scale(1.05); }
            66% { transform: translate(-20px, 15px) scale(0.95); }
          }
        `}</style>

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2">
          <Stack size={32} weight="fill" className="text-gray-900" />
          <span className="font-sans text-2xl font-medium tracking-[-0.04em] text-gray-900">
            Forma
          </span>
        </Link>

        {/* Tagline */}
        <div className="relative z-10">
          <p className="text-xl lg:text-2xl text-gray-900 font-medium leading-relaxed">
            Build forms, collect data, automate workflows.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
