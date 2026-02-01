/**
 * Suggestion Service
 * Generates optimization suggestions for timetable
 */

const generateSuggestions = (batch) => {
  const suggestions = [];

  const electiveSubjects = batch.subjects.filter((s) => s.isElective);
  if (electiveSubjects.length > 0) {
    suggestions.push(
      `Consider scheduling ${electiveSubjects.length} elective(s) in non-overlapping slots for student flexibility.`
    );
  }

  const facultyLoads = {};
  batch.subjects.forEach((s) => {
    if (!facultyLoads[s.faculty]) {
      facultyLoads[s.faculty] = 0;
    }
    facultyLoads[s.faculty] += s.subject.hoursPerWeek;
  });

  Object.entries(facultyLoads).forEach(([faculty, load]) => {
    if (load > 20) {
      suggestions.push(`Faculty ${faculty} has high workload (${load} hrs/week). Consider load balancing.`);
    }
  });

  const labSubjects = batch.subjects.filter((s) => s.subject.type === 'lab');
  if (labSubjects.length > 0) {
    suggestions.push(
      `Schedule ${labSubjects.length} lab session(s) in consecutive slots with adequate lab infrastructure.`
    );
  }

  const practicalSubjects = batch.subjects.filter((s) => s.subject.type === 'practical');
  if (practicalSubjects.length > 0) {
    suggestions.push(
      `Reserve dedicated time slots for ${practicalSubjects.length} practical session(s).`
    );
  }

 
  suggestions.push(
    'Enable NEP 2020 flexibility by providing adequate free slots for interdisciplinary learning and skill development.'
  );

 
  suggestions.push(
    'Maintain a lunch break window between 12:00 PM - 1:30 PM for all batches for better classroom utilization.'
  );

  return suggestions;
};

module.exports = { generateSuggestions };