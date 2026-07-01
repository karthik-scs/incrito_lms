/**
 * Frontend-only mock data for the Course Roadmap and Learn pages (context/design/roadmap page.png
 * and context/design/learn page.png). Backed by the real schema shapes (Module/Lesson/LiveClass/
 * Resource/Assignment) so wiring real API calls later is a drop-in swap, not a rewrite.
 */

export type LessonResource = {
  id: string;
  title: string;
  fileType: "PDF" | "LINK" | "SLIDES" | "DOC";
  fileUrl: string;
};

export type Lesson = {
  id: string;
  title: string;
  type: "VIDEO" | "LIVE";
  durationMinutes: number;
  order: number;
  completed: boolean;
  level: "Beginner" | "Intermediate" | "Advanced";
  about: string;
  whatYouLearn: string[];
  resources: LessonResource[];
  /** Recorded lessons (or a live session that has already happened) play this. */
  recordingUrl: string | null;
  posterUrl: string;
  /** Only set for type "LIVE". */
  liveClass?: {
    status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
    startTime: string;
    endTime: string;
    joinUrl: string;
    mentorName: string;
  };
};

export type ModuleAssignment = {
  id: string;
  title: string;
  dueDate: string;
};

export type Module = {
  id: string;
  title: string;
  order: number;
  status: "completed" | "in-progress" | "locked";
  lessons: Lesson[];
  assignment?: ModuleAssignment;
};

export type CourseRoadmap = {
  slug: string;
  title: string;
  description: string;
  totalLessons: number;
  completedLessons: number;
};

export const MOCK_COURSE: CourseRoadmap = {
  slug: "ux-design-fundamentals",
  title: "UX Design Fundamentals",
  description: "Master the fundamentals of UX/UI design and build a professional portfolio.",
  totalLessons: 45,
  completedLessons: 14,
};

export const MOCK_MODULES: Module[] = [
  {
    id: "module-1",
    title: "Module 1: UX Foundations",
    order: 1,
    status: "completed",
    lessons: [
      {
        id: "lesson-1-1",
        title: "Introduction to UX",
        type: "VIDEO",
        durationMinutes: 75,
        order: 1,
        completed: true,
        level: "Beginner",
        about:
          "An introduction to what user experience design actually covers, and why it matters for every product decision.",
        whatYouLearn: [
          "What UX design is and isn't",
          "The role of a UX designer on a product team",
          "How UX connects to business outcomes",
        ],
        resources: [
          { id: "r1", title: "UX Glossary (PDF)", fileType: "PDF", fileUrl: "#" },
          { id: "r2", title: "Lecture Slides", fileType: "SLIDES", fileUrl: "#" },
        ],
        recordingUrl: "/mock/recording-1-1.mp4",
        posterUrl: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=1200&q=80",
      },
      {
        id: "lesson-1-2",
        title: "Design Thinking Process",
        type: "VIDEO",
        durationMinutes: 102,
        order: 2,
        completed: true,
        level: "Beginner",
        about: "A walkthrough of the 5-stage design thinking process: empathize, define, ideate, prototype, test.",
        whatYouLearn: [
          "The 5 stages of design thinking",
          "How to run an empathize session",
          "Turning research into a clear problem statement",
        ],
        resources: [{ id: "r3", title: "Design Thinking Workbook", fileType: "PDF", fileUrl: "#" }],
        recordingUrl: "/mock/recording-1-2.mp4",
        posterUrl: "https://images.unsplash.com/photo-1531403009284-440f915981c2?w=1200&q=80",
      },
      {
        id: "lesson-1-3",
        title: "UX vs UI",
        type: "VIDEO",
        durationMinutes: 88,
        order: 3,
        completed: true,
        level: "Beginner",
        about: "Clearing up the most common confusion in the industry: where UX ends and UI begins.",
        whatYouLearn: ["The boundary between UX and UI", "How the two disciplines collaborate", "Common job-title myths"],
        resources: [],
        recordingUrl: "/mock/recording-1-3.mp4",
        posterUrl: "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=1200&q=80",
      },
    ],
  },
  {
    id: "module-2",
    title: "Module 2: User Research",
    order: 2,
    status: "in-progress",
    lessons: [
      {
        id: "lesson-2-1",
        title: "Research Methods",
        type: "VIDEO",
        durationMinutes: 75,
        order: 1,
        completed: true,
        level: "Intermediate",
        about: "An overview of qualitative and quantitative research methods, and when to reach for each.",
        whatYouLearn: [
          "Qualitative vs quantitative research",
          "Choosing the right method for your question",
          "Avoiding common research bias",
        ],
        resources: [{ id: "r4", title: "Research Method Cheat Sheet", fileType: "PDF", fileUrl: "#" }],
        recordingUrl: "/mock/recording-2-1.mp4",
        posterUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80",
      },
      {
        id: "lesson-2-2",
        title: "Personas & JTBD",
        type: "LIVE",
        durationMinutes: 90,
        order: 2,
        completed: false,
        level: "Intermediate",
        about: "Live session: building personas and Jobs-to-be-Done statements from real interview data.",
        whatYouLearn: ["Building a persona from real data", "Writing a JTBD statement", "Avoiding persona stereotypes"],
        resources: [{ id: "r5", title: "Persona Template", fileType: "DOC", fileUrl: "#" }],
        recordingUrl: null,
        posterUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80",
        liveClass: {
          status: "SCHEDULED",
          startTime: tomorrowAt(11, 0),
          endTime: tomorrowAt(12, 30),
          joinUrl: "https://meet.example.com/personas-jtbd",
          mentorName: "Asha Kumar",
        },
      },
      {
        id: "lesson-2-3",
        title: "Interview Basics",
        type: "LIVE",
        durationMinutes: 90,
        order: 3,
        completed: false,
        level: "Intermediate",
        about: "Live session: how to conduct effective user interviews, ask the right questions, and gather insights.",
        whatYouLearn: [
          "How to prepare for user interviews",
          "Best practices for asking questions",
          "Active listening techniques",
          "Synthesizing insights effectively",
        ],
        resources: [{ id: "r6", title: "Interview Question Bank", fileType: "DOC", fileUrl: "#" }],
        recordingUrl: null,
        posterUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200&q=80",
        liveClass: {
          status: "SCHEDULED",
          startTime: daysFromNowAt(4, 11, 0),
          endTime: daysFromNowAt(4, 12, 30),
          joinUrl: "https://meet.example.com/interview-basics",
          mentorName: "Asha Kumar",
        },
      },
      {
        id: "lesson-2-4",
        title: "Affinity Mapping",
        type: "LIVE",
        durationMinutes: 90,
        order: 4,
        completed: false,
        level: "Intermediate",
        about: "Live session: clustering research notes into themes using affinity mapping.",
        whatYouLearn: ["Running an affinity mapping session", "Spotting themes in raw notes", "Turning themes into insights"],
        resources: [],
        recordingUrl: null,
        posterUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80",
        liveClass: {
          status: "SCHEDULED",
          startTime: daysFromNowAt(6, 11, 0),
          endTime: daysFromNowAt(6, 12, 30),
          joinUrl: "https://meet.example.com/affinity-mapping",
          mentorName: "Asha Kumar",
        },
      },
    ],
    assignment: {
      id: "assignment-2-1",
      title: "Conduct a User Interview & Create an Affinity Map",
      dueDate: daysFromNowAt(8, 23, 59),
    },
  },
  {
    id: "module-3",
    title: "Module 3: Wireframing",
    order: 3,
    status: "locked",
    lessons: [
      { ...placeholderLesson("lesson-3-1", "Wireframing Basics", 1) },
      { ...placeholderLesson("lesson-3-2", "Low-Fidelity Wireframes", 2) },
      { ...placeholderLesson("lesson-3-3", "High-Fidelity Wireframes", 3) },
      { ...placeholderLesson("lesson-3-4", "Wireframe Critique", 4) },
    ],
  },
];

export const MOCK_ASSIGNMENTS = [
  { id: "a1", title: "User Persona Creation", status: "completed" as const, score: 90, dueDate: null },
  { id: "a2", title: "Interview Questions Analysis", status: "pending" as const, score: null, dueDate: "May 28, 2024" },
  { id: "a3", title: "Wireframe Design Task", status: "locked" as const, score: null, dueDate: "Jun 04, 2024" },
];

export const MOCK_QUIZZES = [
  { id: "q1", title: "UX Foundations Quiz", questionCount: 10, status: "completed" as const, score: 80 },
  { id: "q2", title: "User Research Quiz", questionCount: 8, status: "available" as const, score: null },
  { id: "q3", title: "Wireframing Quiz", questionCount: 12, status: "locked" as const, score: null },
];

export function findLesson(lessonId: string): { lesson: Lesson; module: Module } | null {
  for (const module of MOCK_MODULES) {
    const lesson = module.lessons.find((l) => l.id === lessonId);
    if (lesson) return { lesson, module };
  }
  return null;
}

export function flatLessons(): Lesson[] {
  return MOCK_MODULES.flatMap((m) => m.lessons);
}

export function nextLiveLessonId(): string | null {
  const upcoming = flatLessons()
    .filter((l) => l.type === "LIVE" && l.liveClass?.status === "SCHEDULED")
    .sort((a, b) => new Date(a.liveClass!.startTime).getTime() - new Date(b.liveClass!.startTime).getTime());
  return upcoming[0]?.id ?? null;
}

function placeholderLesson(id: string, title: string, order: number): Lesson {
  return {
    id,
    title,
    type: "VIDEO",
    durationMinutes: 60,
    order,
    completed: false,
    level: "Intermediate",
    about: "This lesson unlocks once Module 2 is complete.",
    whatYouLearn: [],
    resources: [],
    recordingUrl: null,
    posterUrl: "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=1200&q=80",
  };
}

function tomorrowAt(hour: number, minute: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysFromNowAt(days: number, hour: number, minute: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
