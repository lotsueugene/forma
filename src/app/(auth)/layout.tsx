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
        {/* Background decoration - removed grid overlay to prevent see-through */}
        {/* Subtle glow effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-safety-orange/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-safety-orange/10 rounded-full blur-3xl pointer-events-none" />

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
