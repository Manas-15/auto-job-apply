import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds a demo user, a master resume, and a sample job so you can try
 * the analyze → score flow immediately after setup.
 */
async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@auto-job-apply.local' },
    create: { email: 'demo@auto-job-apply.local', name: 'Demo User' },
    update: {},
  });

  const resumeText = `Manas — Frontend Engineer
5+ years building web apps with React, Next.js, TypeScript, Redux Toolkit and REST APIs.
Experience with responsive UI, code splitting, performance optimization, Git, and Jest unit testing.
Built dashboards with React Query and Tailwind CSS. Comfortable with Node.js and Express on the backend.`;

  await prisma.resume.upsert({
    where: { id: 'seed-master-resume' },
    create: {
      id: 'seed-master-resume',
      userId: user.id,
      label: 'Master',
      isMaster: true,
      rawText: resumeText,
    },
    update: { rawText: resumeText },
  });

  const company = await prisma.company.upsert({
    where: { name: 'Acme Corp' },
    create: { name: 'Acme Corp' },
    update: {},
  });

  await prisma.job.upsert({
    where: { id: 'seed-sample-job' },
    create: {
      id: 'seed-sample-job',
      title: 'Senior React Developer',
      companyId: company.id,
      location: 'Remote (India)',
      salaryText: '₹18–28 LPA',
      source: 'OTHER',
      descriptionRaw: `We are hiring a Senior React Developer.
Required: React, Next.js, TypeScript, REST APIs, Git, unit testing with Jest, React Query.
Good to have: GraphQL, Redux Toolkit, Webpack, CI/CD.
Responsibilities: build scalable frontend features, optimize performance, mentor juniors.
5+ years of experience. Remote-friendly.`,
    },
    update: {},
  });

  // eslint-disable-next-line no-console
  console.log('✅ Seed complete. User, master resume (seed-master-resume), and job (seed-sample-job) created.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
