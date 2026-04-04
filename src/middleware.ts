import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Main domains that should not be treated as custom domains
const MAIN_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'withforma.io',
  'www.withforma.io',
  'forma.withforma.io',
  // VPS IP
  'SERVER_IP_REDACTED',
];

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0]; // Remove port if present

  // Skip if it's a main domain
  if (MAIN_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
    return NextResponse.next();
  }

  // Skip API routes, static files, and internal Next.js paths
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }

  // This is a custom domain request - rewrite to the custom domain handler
  const url = request.nextUrl.clone();

  // Rewrite to /cd/[domain]/[...path] route
  // The path will be the form ID or empty for listing
  const formPath = pathname === '/' ? '' : pathname;
  url.pathname = `/cd/${hostname}${formPath}`;

  const response = NextResponse.rewrite(url);
  response.headers.set('Cache-Control', 'no-store, must-revalidate');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Remove internal rewrite header that can confuse some browsers
  response.headers.delete('x-middleware-rewrite');
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
