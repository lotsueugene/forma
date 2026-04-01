import { Metadata } from 'next';
import Link from 'next/link';
import { Stack, Briefcase, MapPin, Clock, ArrowRight, Star } from '@phosphor-icons/react/dist/ssr';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Careers | Forma',
  description: 'Join the Forma team. Build the future of form infrastructure.',
};

export const dynamic = 'force-dynamic';

async function getJobs() {
  const jobs = await prisma.jobPosting.findMany({
    where: { published: true },
    orderBy: [
      { featured: 'desc' },
      { publishedAt: 'desc' },
    ],
    select: {
      id: true,
      slug: true,
      title: true,
      department: true,
      location: true,
      type: true,
      salary: true,
      featured: true,
      publishedAt: true,
    },
  });
  return jobs;
}

export default async function CareersPage() {
  const jobs = await getJobs();

  // Group jobs by department
  const jobsByDepartment = jobs.reduce((acc, job) => {
    if (!acc[job.department]) {
      acc[job.department] = [];
    }
    acc[job.department].push(job);
    return acc;
  }, {} as Record<string, typeof jobs>);

  const departments = Object.keys(jobsByDepartment);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Stack size={24} weight="fill" className="text-safety-orange" />
            <span className="font-sans text-xl font-medium tracking-tight text-gray-900">
              Forma
            </span>
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 lg:py-24 border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl lg:text-5xl font-semibold text-gray-900 mb-4">
            Join Our Team
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Help us build the form infrastructure developers deserve. We're looking for
            passionate people to join our mission.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          {jobs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <Briefcase size={32} className="text-gray-400" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                No Open Positions
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                We don't have any open positions right now. Check back later for new opportunities.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {departments.map((department) => (
                <div key={department}>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    {department}
                  </h2>
                  <div className="space-y-4">
                    {jobsByDepartment[department].map((job) => (
                      <Link
                        key={job.id}
                        href={`/careers/${job.slug}`}
                        className="block border border-gray-200 rounded-xl p-6 hover:border-safety-orange/50 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-safety-orange transition-colors">
                                {job.title}
                              </h3>
                              {job.featured && (
                                <Star size={16} weight="fill" className="text-yellow-500" />
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <MapPin size={14} />
                                {job.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {job.type}
                              </span>
                              {job.salary && (
                                <span className="text-safety-orange font-medium">
                                  {job.salary}
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight size={20} className="text-gray-400 group-hover:text-safety-orange transition-colors mt-1" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              {/* Contact section */}
              <div className="mt-16 p-8 bg-gray-50 rounded-xl text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Don't see the right role?
                </h2>
                <p className="text-gray-600 mb-4">
                  We're always looking for talented people. Send us your resume and we'll keep you in mind.
                </p>
                <Link href="mailto:careers@withforma.io" className="btn btn-secondary">
                  Get in Touch
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Forma. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
