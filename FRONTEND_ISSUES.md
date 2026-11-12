# CareerSync Frontend Issues

These issues were found during browser testing of the student portal at desktop and mobile widths.

## Visual and product presentation issues

### 1. Readiness values contradict each other

The page can show different readiness values at the same time:

- Header placement readiness: `64%`
- Next-best-step message: readiness from `76%` to `81%`
- Saved progress: `84%`

These values use separate calculations and are confusing to users.

Affected files:

- `frontend/src/components/StudentPortal.jsx`
- `frontend/src/components/ProgressTimelineWidget.jsx`

### 2. Roadmap and recommendation disagree

The recommendation can say `Week 2 milestone for System Design` while the visible roadmap shows `Week 1 • System Design`.

Affected file:

- `frontend/src/components/StudentPortal.jsx`

### 3. Mobile layout overflows horizontally

At approximately 390px width:

- The header is clipped.
- Navigation controls run off-screen.
- A horizontal scrollbar appears.
- Some controls are only partially visible.

Affected file:

- `frontend/src/components/Navbar.jsx`

### 4. Reset Workspace is exposed in the student interface

Students see a destructive `Reset Workspace` action in the main navigation. The action now requires administrator authentication, so it is confusing and appears broken for normal users.

Affected file:

- `frontend/src/components/Navbar.jsx`

### 5. Activity streak visualization is inaccurate

The UI can show `2 days of prep logged` while highlighting five activity dots because the component adds three extra active dots.

Affected file:

- `frontend/src/components/ProgressTimelineWidget.jsx`

### 6. System Activity Log obscures content

The fixed activity-log panel overlaps the page content. On mobile, it can cover the resume upload area and other controls.

Affected file:

- `frontend/src/components/ReasoningTrace.jsx`

### 7. Errors use disruptive browser alerts

Resume upload, application, preference, and save failures use native `alert()` dialogs instead of inline, accessible error messages.

Affected file:

- `frontend/src/components/StudentPortal.jsx`

### 8. Irrelevant jobs appear in the student job list

The job dropdown can contain roles such as account executive, legal counsel, and other non-technical positions in a technical placement portal.

Affected area:

- Personalized job list displayed by `frontend/src/components/StudentPortal.jsx`

## Feature-functionality issues

### 9. Next Adaptive Question repeats the same question

Clicking `Next Adaptive Question` increments the question number from `#1` to `#2`, but the question text remains unchanged.

The `handleNext()` function increments the counter but does not request or load a new question.

Affected file:

- `frontend/src/components/MockInterview.jsx`

### 10. Hiding a job does not actually hide it

Clicking `Not Interested / Hide` only marks the selected job as hidden and changes its score. The job remains selected and still appears in the dropdown.

Affected file:

- `frontend/src/components/StudentPortal.jsx`

### 11. Previously applied jobs are not restored after refresh

The `appliedJobs` state starts empty and is only updated after a new application. After refreshing the page, an already-submitted job can show the `Enroll` button again.

Affected file:

- `frontend/src/components/StudentPortal.jsx`

### 12. Application state leaks between profiles

Switching from one student to another does not reset `appliedJobs`, interview score, or selected-job state. One student can inherit visible application or interview state from another student.

Affected file:

- `frontend/src/components/StudentPortal.jsx`

### 13. Uploaded candidates cannot be selected again

Resume upload creates a new student object, but the profile dropdown only renders the three static demo profiles. After navigating away from an uploaded candidate, the user cannot return to that profile through the UI.

Affected file:

- `frontend/src/components/StudentPortal.jsx`

### 14. Interview score does not reset when switching profiles

The interview score is stored at the portal level and is not reset when `currentStudent` changes. A new student can inherit the previous student’s interview score.

Affected file:

- `frontend/src/components/StudentPortal.jsx`

### 15. Milestone completion changes readiness inconsistently

Completing a roadmap task immediately changes the overall readiness score, while readiness is also calculated from server progress and interview state. This contributes to the inconsistent readiness values shown across the page.

Affected file:

- `frontend/src/components/StudentPortal.jsx`

## Testing context

The issues were observed while testing:

- Student portal at desktop width.
- Student portal at approximately 390px mobile width.
- Profile switching.
- Bookmarking and hiding jobs.
- Roadmap milestone completion.
- Adaptive interview answer submission and next-question flow.
- Preference modal opening.
- Resume upload profile behavior.

