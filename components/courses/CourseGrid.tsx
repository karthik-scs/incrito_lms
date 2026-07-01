import { CourseCard, type CourseCardData } from "./CourseCard";

export function CourseGrid({ courses }: { courses: CourseCardData[] }) {
  if (courses.length === 0) {
    return <p className="text-sm text-text-muted py-8 text-center">No courses to show yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <CourseCard key={course.slug} course={course} />
      ))}
    </div>
  );
}
