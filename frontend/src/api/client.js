const API_BASE = '/api/v1';

export const apiClient = {
  // Student Endpoints
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

  async getRoadmap(studentId, jobId = 'job-ai-sys') {
    const res = await fetch(`${API_BASE}/students/roadmap/${studentId}?job_id=${jobId}`);
    return res.json();
  },

  async getInterviewQuestion(skill = 'RAG Pipelines', difficulty = 6) {
    const res = await fetch(`${API_BASE}/students/interview/question?skill=${encodeURIComponent(skill)}&difficulty=${difficulty}`);
    return res.json();
  },

  async submitInterviewAnswer(skill, answerText, currentDifficulty) {
    const res = await fetch(`${API_BASE}/students/interview/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: 'dynamic',
        skill,
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

  // Placement Cell (TPO) Endpoints
  async getAdminOverview(adminPin = 'tpo_secure_2026') {
    const res = await fetch(`${API_BASE}/admin/analytics/overview`, {
      headers: { 'x-admin-pin': adminPin },
    });
    if (!res.ok) throw new Error('Unauthorized');
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