/** Frontend-only mock data for the My Courses page (context/design/my course page.png). */

export type MyCourse = {
  id: string;
  slug: string;
  title: string;
  bannerUrl: string;
  rating: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  learners: string;
  duration: string;
  progressPercent: number;
  nextLessonTitle: string;
  resumeLessonId: string;
  status: "active" | "completed";
};

export const MOCK_MY_COURSES: MyCourse[] = [
  {
    id: "course-1",
    slug: "ux-design-fundamentals",
    title: "UX/UI Design Bootcamp",
    bannerUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=900&q=80",
    rating: 4.9,
    level: "Beginner",
    learners: "75K Learners",
    duration: "40h",
    progressPercent: 35,
    nextLessonTitle: "Lesson 2.3: Interview Basics",
    resumeLessonId: "lesson-2-3",
    status: "active",
  },
  {
    id: "course-2",
    slug: "layout-grid-systems",
    title: "Layout & Grid Systems",
    bannerUrl: "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=900&q=80",
    rating: 4.6,
    level: "Beginner",
    learners: "12.7K Learners",
    duration: "5h 25m",
    progressPercent: 78,
    nextLessonTitle: "Lesson 3.2: Using an 8pt Grid System",
    resumeLessonId: "lesson-3-2",
    status: "active",
  },
  {
    id: "course-3",
    slug: "interaction-design-fundamentals",
    title: "Interaction Design Fundamentals",
    bannerUrl: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=900&q=80",
    rating: 4.8,
    level: "Beginner",
    learners: "9.3K Learners",
    duration: "6h 30m",
    progressPercent: 86,
    nextLessonTitle: "Lesson 4.1: Designing Intuitive Interactions",
    resumeLessonId: "lesson-4-1",
    status: "active",
  },
  {
    id: "course-4",
    slug: "typography-essentials",
    title: "Typography Essentials",
    bannerUrl: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=900&q=80",
    rating: 4.7,
    level: "Beginner",
    learners: "34K Learners",
    duration: "4h 50m",
    progressPercent: 10,
    nextLessonTitle: "Lesson 2.2: Font Pairing Rules",
    resumeLessonId: "lesson-2-2",
    status: "active",
  },
  {
    id: "course-5",
    slug: "design-systems-101",
    title: "Design Systems 101",
    bannerUrl: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=900&q=80",
    rating: 4.8,
    level: "Intermediate",
    learners: "18K Learners",
    duration: "8h 10m",
    progressPercent: 100,
    nextLessonTitle: "Completed",
    resumeLessonId: "lesson-1-1",
    status: "completed",
  },
  {
    id: "course-6",
    slug: "accessibility-for-designers",
    title: "Accessibility for Designers",
    bannerUrl: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=900&q=80",
    rating: 4.9,
    level: "Intermediate",
    learners: "21K Learners",
    duration: "5h 40m",
    progressPercent: 100,
    nextLessonTitle: "Completed",
    resumeLessonId: "lesson-1-1",
    status: "completed",
  },
];

export const MOCK_PROGRESS_SUMMARY = {
  overallPercent: 62,
  activeCourses: 4,
  completed: 8,
  inProgress: 12,
  certificates: 3,
};

export const MOCK_RECOMMENDED = [
  { id: "rec-1", title: "AI for Designers", level: "Beginner", duration: "6h 10m", rating: 4.8 },
  { id: "rec-2", title: "Web Development Basics", level: "Beginner", duration: "8h 20m", rating: 4.7 },
];
