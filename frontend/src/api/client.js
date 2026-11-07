const API_BASE = '/api/v1';

export const apiClient = {
  // Student API
  async processResume(rawText, targetJobId = 'job-ai-sys') {
    const res = await fetch(`${API_BASE}/students/resume/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: rawText, target_job_id: targetJobId }),
    });
    return res.json();
  },

  async getATSPreview(studentId) {
    const res = await fetch(`${API_BASE}/students/ats-preview/${studentId}`);
    return res.json();
  },

  async getStudentProgress(studentId) {
    const res = await fetch(`${API_BASE}/students/${studentId}/progress`);
    if (!res.ok) throw new Error('Failed to fetch progress');
    return res.json();
  },

  async toggleMilestone(studentId, weekNumber, currentReadiness) {
    const res = await fetch(`${API_BASE}/students/${studentId}/milestones/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_number: weekNumber,
        current_readiness: currentReadiness
      })
    });
    return res.json();
  },

  async getInterviewQuestion(skill = 'RAG Pipelines', difficulty = 6) {
    const res = await fetch(`${API_BASE}/students/interview/question?skill=${encodeURIComponent(skill)}&difficulty=${difficulty}`);
    return res.json();
  },

  async submitInterviewAnswer(studentId, skill, answerText, currentDifficulty, questionText = "") {
    const res = await fetch(`${API_BASE}/students/interview/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId || "stud-01",
        skill,
        question_text: questionText,
        answer_text: answerText,
        current_difficulty: currentDifficulty,
      }),
    });
    return res.json();
  },

  async ingestExternalUrl(url) {
    const res = await fetch(`${API_BASE}/students/ingest-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return res.json();
  },

  // Admin API
  async verifyAdminPin(pin) {
    const res = await fetch(`${API_BASE}/admin/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    if (!res.ok) throw new Error('Invalid PIN');
    return res.json();
  },

  async getVerificationMatrix(adminPin = 'tpo_secure_2026') {
    const res = await fetch(`${API_BASE}/admin/matrix`, {
      headers: { 'x-admin-pin': adminPin },
    });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },

  async updateStudentStatus(studentId, newStatus, adminPin = 'tpo_secure_2026') {
    const res = await fetch(`${API_BASE}/admin/matrix/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': adminPin,
      },
      body: JSON.stringify({ student_id: studentId, new_status: newStatus }),
    });
    return res.json();
  },

  getExportCSVUrl(adminPin = 'tpo_secure_2026') {
    return `${API_BASE}/admin/export/csv`;
  },
};