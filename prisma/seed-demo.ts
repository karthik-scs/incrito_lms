/**
 * Adds a richer demo dataset on top of whatever already exists (additive, not a reset):
 * more categories/tags, two more courses with modules/lessons (mixed VIDEO/TEXT/LIVE),
 * mentors/cohort managers/students, two more cohorts with varied enrollment progress,
 * quizzes with graded attempts, discussion posts, and two issued certificates.
 *
 * Run with: npx tsx prisma/seed-demo.ts
 */
import "dotenv/config";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Demo@1234";

async function upsertUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  roleName: string;
}) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: data.roleName } });
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  return prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash,
      roleId: role.id,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });
}

async function recomputeProgress(userId: string, cohortId: string) {
  const modules = await prisma.module.findMany({ where: { cohortId }, include: { lessons: true } });
  const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));

  const completedCount = lessonIds.length
    ? await prisma.lessonProgress.count({ where: { userId, lessonId: { in: lessonIds }, completed: true } })
    : 0;
  const completionPercentage = lessonIds.length ? Math.round((completedCount / lessonIds.length) * 100) : 0;

  await prisma.progress.upsert({
    where: { userId_cohortId: { userId, cohortId } },
    update: { completionPercentage, lastActivityAt: new Date() },
    create: { userId, cohortId, completionPercentage, lastActivityAt: new Date() },
  });

  await prisma.leaderboardEntry.upsert({
    where: { cohortId_userId: { cohortId, userId } },
    update: { points: completedCount * 10, computedAt: new Date() },
    create: { cohortId, userId, points: completedCount * 10 },
  });

  return completionPercentage;
}

async function markLessonsComplete(userId: string, lessonIds: string[]) {
  for (const lessonId of lessonIds) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { completed: true, completedAt: new Date() },
      create: { userId, lessonId, completed: true, completedAt: new Date() },
    });
  }
}

async function issueCertificate(userId: string, cohortId: string, templateId: string) {
  const cohort = await prisma.cohort.findUniqueOrThrow({ where: { id: cohortId }, include: { course: true } });

  const courseCertificate = await prisma.courseCertificate.upsert({
    where: { id: `democert_${cohort.course.id}` },
    update: {},
    create: {
      id: `democert_${cohort.course.id}`,
      courseId: cohort.course.id,
      templateId,
      title: "Course Completion Certificate",
      scope: "COURSE",
    },
  });

  const existing = await prisma.certificate.findUnique({
    where: { userId_cohortId_courseCertificateId: { userId, cohortId, courseCertificateId: courseCertificate.id } },
  });
  if (existing) return existing;

  return prisma.certificate.create({
    data: {
      userId,
      cohortId,
      courseCertificateId: courseCertificate.id,
      templateId,
      certificateNumber: `CERT-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      verificationToken: crypto.randomBytes(16).toString("hex"),
    },
  });
}

async function main() {
  console.log("Seeding demo data...");

  // ---- Taxonomy ----
  const categoryDataScience = await prisma.category.upsert({
    where: { slug: "data-science" },
    update: {},
    create: { name: "Data Science", slug: "data-science" },
  });
  const categoryDesign = await prisma.category.upsert({
    where: { slug: "design" },
    update: {},
    create: { name: "Design", slug: "design" },
  });

  const tagPython = await prisma.tag.upsert({ where: { slug: "python" }, update: {}, create: { name: "Python", slug: "python" } });
  const tagUiUx = await prisma.tag.upsert({ where: { slug: "ui-ux" }, update: {}, create: { name: "UI/UX", slug: "ui-ux" } });
  const tagBeginner = await prisma.tag.upsert({
    where: { slug: "beginner" },
    update: {},
    create: { name: "Beginner", slug: "beginner" },
  });

  const certTemplate = await prisma.certificateTemplate.upsert({
    where: { id: "demo-professional-certificate" },
    update: {},
    create: {
      id: "demo-professional-certificate",
      title: "Professional Certificate",
      description: "Awarded for completing a professional-track course.",
    },
  });

  // ---- Users ----
  const mentorCarlos = await upsertUser({ email: "carlos.mentor@incrito.dev", firstName: "Carlos", lastName: "Diaz", roleName: "Mentor" });
  const mentorPriya = await upsertUser({ email: "priya.mentor@incrito.dev", firstName: "Priya", lastName: "Sharma", roleName: "Mentor" });

  const managerMaria = await upsertUser({ email: "maria.manager@incrito.dev", firstName: "Maria", lastName: "Lopez", roleName: "Cohort Manager" });
  const managerLiam = await upsertUser({ email: "liam.manager@incrito.dev", firstName: "Liam", lastName: "O'Connor", roleName: "Cohort Manager" });

  const students = await Promise.all(
    [
      ["alex.johnson@incrito.dev", "Alex", "Johnson"],
      ["sara.lee@incrito.dev", "Sara", "Lee"],
      ["david.kim@incrito.dev", "David", "Kim"],
      ["emma.watson@incrito.dev", "Emma", "Watson"],
      ["ravi.patel@incrito.dev", "Ravi", "Patel"],
      ["lisa.chen@incrito.dev", "Lisa", "Chen"],
      ["noah.brown@incrito.dev", "Noah", "Brown"],
      ["mia.garcia@incrito.dev", "Mia", "Garcia"],
    ].map(([email, firstName, lastName]) => upsertUser({ email, firstName, lastName, roleName: "Student" }))
  );
  const [alex, sara, david, emma, ravi, lisa, noah, mia] = students;

  // ---- Course: Python for Beginners ----
  const pythonCourse = await prisma.course.upsert({
    where: { slug: "python-for-beginners" },
    update: {},
    create: {
      title: "Python for Beginners",
      slug: "python-for-beginners",
      description: "Learn Python from scratch — syntax, control flow, and your first real programs.",
      status: "PUBLISHED",
      categoryId: categoryDataScience.id,
      isFree: true,
      mentorId: mentorCarlos.id,
      createdById: mentorCarlos.id,
      tags: { create: [{ tagId: tagPython.id }, { tagId: tagBeginner.id }] },
    },
  });

  const pythonCohort = await prisma.cohort.upsert({
    where: { id: "demo-python-batch-a" },
    update: {},
    create: {
      id: "demo-python-batch-a",
      courseId: pythonCourse.id,
      name: "Python Batch A",
      status: "ACTIVE",
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      capacity: 20,
      mentors: { create: [{ userId: mentorCarlos.id }] },
      managers: { create: [{ userId: managerMaria.id }] },
    },
  });

  const pyModule1 =
    (await prisma.module.findFirst({ where: { cohortId: pythonCohort.id, order: 1 } })) ??
    (await prisma.module.create({ data: { cohortId: pythonCohort.id, title: "Getting Started", order: 1 } }));
  const pyModule2 =
    (await prisma.module.findFirst({ where: { cohortId: pythonCohort.id, order: 2 } })) ??
    (await prisma.module.create({ data: { cohortId: pythonCohort.id, title: "Control Flow", order: 2 } }));

  type LessonSeedInput = {
    title: string;
    type: "VIDEO" | "TEXT" | "PDF";
    contentUrl?: string;
    content?: string;
    durationMinutes?: number;
  };

  async function ensureLesson(moduleId: string, order: number, data: LessonSeedInput) {
    const existing = await prisma.lesson.findFirst({ where: { moduleId, order } });
    if (existing) return existing;
    return prisma.lesson.create({ data: { ...data, moduleId, order } });
  }

  const pyLesson1 = await ensureLesson(pyModule1.id, 1, {
    title: "Installing Python",
    type: "VIDEO",
    contentUrl: "https://example.com/videos/installing-python.mp4",
    durationMinutes: 20,
  });
  const pyLesson2 = await ensureLesson(pyModule1.id, 2, {
    title: "Variables & Data Types",
    type: "TEXT",
    content: "Python is dynamically typed. Variables are created the moment you assign a value: x = 5, name = \"Ada\".",
  });
  const pyLesson3 = await ensureLesson(pyModule1.id, 3, {
    title: "Your First Program",
    type: "VIDEO",
    contentUrl: "https://example.com/videos/first-program.mp4",
    durationMinutes: 25,
  });

  const pyLesson4 = await ensureLesson(pyModule2.id, 1, {
    title: "If Statements",
    type: "VIDEO",
    contentUrl: "https://example.com/videos/if-statements.mp4",
    durationMinutes: 30,
  });

  let pyLiveLesson = await prisma.lesson.findFirst({ where: { moduleId: pyModule2.id, order: 2 } });
  if (!pyLiveLesson) {
    const start = new Date();
    start.setDate(start.getDate() + 3);
    start.setHours(15, 0, 0, 0);
    const end = new Date(start);
    end.setHours(16, 0, 0, 0);

    const liveClass = await prisma.liveClass.create({
      data: {
        title: "Live Q&A: Control Flow",
        mentorId: mentorCarlos.id,
        startTime: start,
        endTime: end,
        joinUrl: "https://meeting.zoho.com/meeting/join/demo-python",
        hostStartUrl: "https://meeting.zoho.com/meeting/start/demo-python",
      },
    });
    pyLiveLesson = await prisma.lesson.create({
      data: { moduleId: pyModule2.id, title: "Live Q&A: Control Flow", type: "LIVE", order: 2, liveClassId: liveClass.id },
    });
  }

  // ---- Course: UI/UX Design Fundamentals ----
  const uxCourse = await prisma.course.upsert({
    where: { slug: "ui-ux-design-fundamentals" },
    update: {},
    create: {
      title: "UI/UX Design Fundamentals",
      slug: "ui-ux-design-fundamentals",
      description: "Core principles of user interface and user experience design, from theory to prototyping.",
      status: "PUBLISHED",
      categoryId: categoryDesign.id,
      isFree: true,
      mentorId: mentorPriya.id,
      createdById: mentorPriya.id,
      tags: { create: [{ tagId: tagUiUx.id }, { tagId: tagBeginner.id }] },
    },
  });

  const uxCohort = await prisma.cohort.upsert({
    where: { id: "demo-ux-batch-a" },
    update: {},
    create: {
      id: "demo-ux-batch-a",
      courseId: uxCourse.id,
      name: "UX Batch A",
      status: "ACTIVE",
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      capacity: 15,
      mentors: { create: [{ userId: mentorPriya.id }] },
      managers: { create: [{ userId: managerLiam.id }] },
    },
  });

  const uxModule1 =
    (await prisma.module.findFirst({ where: { cohortId: uxCohort.id, order: 1 } })) ??
    (await prisma.module.create({ data: { cohortId: uxCohort.id, title: "Design Principles", order: 1 } }));
  const uxModule2 =
    (await prisma.module.findFirst({ where: { cohortId: uxCohort.id, order: 2 } })) ??
    (await prisma.module.create({ data: { cohortId: uxCohort.id, title: "Prototyping", order: 2 } }));

  const uxLesson1 = await ensureLesson(uxModule1.id, 1, {
    title: "Intro to UI vs UX",
    type: "VIDEO",
    contentUrl: "https://example.com/videos/ui-vs-ux.mp4",
    durationMinutes: 18,
  });
  const uxLesson2 = await ensureLesson(uxModule1.id, 2, {
    title: "Color Theory",
    type: "VIDEO",
    contentUrl: "https://example.com/videos/color-theory.mp4",
    durationMinutes: 22,
  });
  const uxLesson3 = await ensureLesson(uxModule2.id, 1, {
    title: "Wireframing Basics",
    type: "VIDEO",
    contentUrl: "https://example.com/videos/wireframing.mp4",
    durationMinutes: 28,
  });

  let uxLiveLesson = await prisma.lesson.findFirst({ where: { moduleId: uxModule2.id, order: 2 } });
  if (!uxLiveLesson) {
    const start = new Date();
    start.setDate(start.getDate() + 5);
    start.setHours(11, 0, 0, 0);
    const end = new Date(start);
    end.setHours(12, 30, 0, 0);

    const liveClass = await prisma.liveClass.create({
      data: {
        title: "Live Workshop: Figma Basics",
        mentorId: mentorPriya.id,
        startTime: start,
        endTime: end,
        joinUrl: "https://meeting.zoho.com/meeting/join/demo-ux",
        hostStartUrl: "https://meeting.zoho.com/meeting/start/demo-ux",
      },
    });
    uxLiveLesson = await prisma.lesson.create({
      data: { moduleId: uxModule2.id, title: "Live Workshop: Figma Basics", type: "LIVE", order: 2, liveClassId: liveClass.id },
    });
  }

  // ---- Enrollments ----
  async function ensureEnrollment(userId: string, cohortId: string) {
    return prisma.enrollment.upsert({
      where: { userId_cohortId: { userId, cohortId } },
      update: {},
      create: { userId, cohortId, status: "ACTIVE" },
    });
  }

  for (const student of [alex, sara, david, emma]) {
    await ensureEnrollment(student.id, pythonCohort.id);
  }
  for (const student of [ravi, lisa, noah, mia]) {
    await ensureEnrollment(student.id, uxCohort.id);
  }

  // ---- Varied progress ----
  await markLessonsComplete(alex.id, [pyLesson1.id, pyLesson2.id, pyLesson3.id, pyLesson4.id, pyLiveLesson.id]); // 100%
  await markLessonsComplete(sara.id, [pyLesson1.id, pyLesson2.id, pyLesson3.id]); // ~60%
  await markLessonsComplete(emma.id, [pyLesson1.id]); // ~20%
  // david: 0%

  await markLessonsComplete(ravi.id, [uxLesson1.id, uxLesson2.id, uxLesson3.id, uxLiveLesson.id]); // 100%
  await markLessonsComplete(lisa.id, [uxLesson1.id, uxLesson2.id]); // ~50%
  await markLessonsComplete(mia.id, [uxLesson1.id]); // ~25%
  // noah: 0%

  for (const student of [alex, sara, david, emma]) {
    await recomputeProgress(student.id, pythonCohort.id);
  }
  for (const student of [ravi, lisa, noah, mia]) {
    await recomputeProgress(student.id, uxCohort.id);
  }

  await issueCertificate(alex.id, pythonCohort.id, certTemplate.id);
  await issueCertificate(ravi.id, uxCohort.id, certTemplate.id);

  // ---- Quizzes ----
  async function ensureQuiz(
    courseId: string,
    moduleId: string,
    createdById: string,
    title: string,
    questions: { text: string; options: { text: string; isCorrect: boolean }[] }[]
  ) {
    const existing = await prisma.assessment.findFirst({ where: { courseId, moduleId, title } });
    if (existing) return existing;

    return prisma.assessment.create({
      data: {
        courseId,
        moduleId,
        kind: "QUIZ",
        title,
        passingScore: 70,
        timeLimitMinutes: 10,
        maxAttempts: 3,
        status: "PUBLISHED",
        createdById,
        questions: {
          create: questions.map((q, index) => ({
            text: q.text,
            type: "SINGLE_CHOICE",
            marks: 1,
            order: index + 1,
            options: { create: q.options },
          })),
        },
      },
      include: { questions: { include: { options: true } } },
    });
  }

  const pythonQuiz = await ensureQuiz(pythonCourse.id, pyModule1.id, mentorCarlos.id, "Python Basics Quiz", [
    {
      text: "What keyword defines a function in Python?",
      options: [
        { text: "func", isCorrect: false },
        { text: "def", isCorrect: true },
        { text: "function", isCorrect: false },
      ],
    },
    {
      text: "Which of these is a valid variable assignment?",
      options: [
        { text: "5 = x", isCorrect: false },
        { text: "x = 5", isCorrect: true },
        { text: "x == 5", isCorrect: false },
      ],
    },
  ]);

  const uxQuiz = await ensureQuiz(uxCourse.id, uxModule1.id, mentorPriya.id, "UX Principles Quiz", [
    {
      text: "UX primarily focuses on:",
      options: [
        { text: "Visual styling only", isCorrect: false },
        { text: "The overall feel and usability of a product", isCorrect: true },
        { text: "Database schema design", isCorrect: false },
      ],
    },
  ]);

  // ---- Graded attempts ----
  async function ensureGradedAttempt(assessmentId: string, userId: string, score: number) {
    const existing = await prisma.assessmentAttempt.findFirst({ where: { assessmentId, userId } });
    if (existing) return existing;
    return prisma.assessmentAttempt.create({
      data: { assessmentId, userId, attemptNumber: 1, status: "GRADED", score, submittedAt: new Date() },
    });
  }

  await ensureGradedAttempt(pythonQuiz.id, alex.id, 100);
  await ensureGradedAttempt(pythonQuiz.id, sara.id, 50);
  await ensureGradedAttempt(uxQuiz.id, ravi.id, 100);

  // ---- Discussion ----
  async function ensurePost(cohortId: string, authorId: string, title: string, content: string) {
    const existing = await prisma.post.findFirst({ where: { cohortId, title } });
    if (existing) return existing;
    return prisma.post.create({ data: { cohortId, authorId, title, content } });
  }

  const pyWelcomePost = await ensurePost(
    pythonCohort.id,
    managerMaria.id,
    "Welcome to Python Batch A!",
    "Hi everyone — excited to have you in this cohort. Introduce yourself below and let us know what you're hoping to build with Python."
  );
  if (!(await prisma.comment.findFirst({ where: { postId: pyWelcomePost.id, authorId: alex.id } }))) {
    await prisma.comment.create({
      data: { postId: pyWelcomePost.id, authorId: alex.id, content: "Excited to be here! Hoping to automate some spreadsheet work." },
    });
  }

  await ensurePost(
    uxCohort.id,
    managerLiam.id,
    "Welcome to UX Batch A!",
    "Welcome aboard! Drop an intro below — what kind of products are you hoping to design after this course?"
  );

  console.log("\nDemo data seeded successfully.\n");
  console.log("New courses: python-for-beginners, ui-ux-design-fundamentals");
  console.log("New cohorts: Python Batch A (100% done: Alex Johnson), UX Batch A (100% done: Ravi Patel)");
  console.log(`\nAll new demo users share the password: ${DEMO_PASSWORD}\n`);
  console.log("Mentors:        carlos.mentor@incrito.dev, priya.mentor@incrito.dev");
  console.log("Cohort Managers: maria.manager@incrito.dev, liam.manager@incrito.dev");
  console.log(
    "Students:        alex.johnson@incrito.dev (100% Python, cert issued), sara.lee@incrito.dev (~60%), david.kim@incrito.dev (0%), emma.watson@incrito.dev (~20%),"
  );
  console.log(
    "                 ravi.patel@incrito.dev (100% UX, cert issued), lisa.chen@incrito.dev (~50%), noah.brown@incrito.dev (0%), mia.garcia@incrito.dev (~25%)"
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
