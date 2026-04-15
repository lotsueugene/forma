'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Stack,
  Users,
  Spinner,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  SignIn,
  UserPlus,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface Invitation {
  email: string;
  role: string;
  expiresAt: string;
  workspace: {
    id: string;
    name: string;
  };
  invitedBy: {
    name: string;
  };
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invitation not found');
        return;
      }

      setInvitation(data.invitation);
    } catch (err) {
      setError('Failed to load invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    setError('');

    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        setIsAccepting(false);
        return;
      }

      setAccepted(true);

      // Auto-switch to the new workspace and redirect immediately
      if (data.workspaceId) {
        localStorage.setItem('forma_current_workspace', data.workspaceId);
      }
      router.push('/dashboard');
    } catch (err) {
      setError('Failed to accept invitation');
      setIsAccepting(false);
    }
  };

  const roleDisplay = invitation?.role
    ? invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)
    : '';

  const emailMatches =
    session?.user?.email?.toLowerCase() === invitation?.email?.toLowerCase();

  const callbackUrl = `/invite/${token}`;

  // Loading state
  if (isLoading || sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size={32} className="text-safety-orange animate-spin" />
      </div>
    );
  }

  // Error state (invitation not found or expired)
  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              {error.includes('expired') ? (
                <Clock size={32} className="text-red-600" />
              ) : (
                <XCircle size={32} className="text-red-600" />
              )}
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {error.includes('expired') ? 'Invitation Expired' : 'Invitation Not Found'}
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/" className="btn btn-primary inline-flex items-center gap-2">
              Go to Homepage
              <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to {invitation?.workspace.name}!
            </h1>
            <p className="text-gray-600 mb-2">
              You've successfully joined the workspace as {roleDisplay}.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main invitation view
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <Stack size={28} weight="fill" className="text-safety-orange" />
          <span className="font-sans text-xl font-medium tracking-tight text-gray-900">
            Forma
          </span>
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
              <Users size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-1">
              You're Invited
            </h1>
            <p className="text-gray-300 text-sm">
              Join <span className="font-medium text-white">{invitation?.workspace.name}</span>
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Invited by</span>
                <span className="font-medium text-gray-900">{invitation?.invitedBy.name}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Your role</span>
                <span className="font-medium text-gray-900">{roleDisplay}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Invitation for</span>
                <span className="font-medium text-gray-900">{invitation?.email}</span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Action buttons based on auth state */}
            {session ? (
              emailMatches ? (
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className={cn(
                    'btn btn-primary w-full justify-center',
                    isAccepting && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  {isAccepting ? (
                    <Spinner size={20} className="animate-spin" />
                  ) : (
                    <>
                      Accept Invitation
                      <ArrowRight size={18} weight="bold" />
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm">
                    <p className="text-amber-800 font-medium mb-1">Wrong account</p>
                    <p className="text-amber-700">You're signed in as <strong>{session.user?.email}</strong>. This invitation is for <strong>{invitation?.email}</strong>.</p>
                  </div>
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      import('next-auth/react').then(({ signOut }) => {
                        signOut({ callbackUrl: `/login?callbackUrl=${encodeURIComponent(callbackUrl)}&email=${encodeURIComponent(invitation?.email || '')}` });
                      });
                    }}
                    className="btn btn-primary w-full justify-center"
                  >
                    <SignIn size={18} />
                    Switch Account
                  </Link>
                </div>
              )
            ) : (
              <div className="space-y-3">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="btn btn-primary w-full justify-center"
                >
                  <SignIn size={18} />
                  Sign in to Accept
                </Link>
                <Link
                  href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}&email=${encodeURIComponent(invitation?.email || '')}`}
                  className="btn btn-secondary w-full justify-center"
                >
                  <UserPlus size={18} />
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Powered by{' '}
          <Link href="/" className="text-safety-orange hover:text-gray-900 transition-colors">
            Forma
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
