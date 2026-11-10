const API_BASE = '/api/v1';

export const apiClient = {
  // Session Token Storage
  setAdminToken(token) {
    if (token) {
      sessionStorage.setItem('careersync_admin_token', token);
    } else {
      sessionStorage.removeItem('careersync_admin_token');
    }
  },

  getAdminToken() {
    return sessionStorage.getItem('careersync_admin_token');
  },

  // Helper for admin headers
  getAdminHeaders() {
    const token = this.getAdminToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-admin-token'] = token;
    }
    return headers;
  },

  // Student API
  async processResume(rawText, targetJobId = 'job-ai-sys') {
    const res = await fetch(`${API_BASE}/students/resume/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: rawText, target_job_id: targetJobId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Resume analysis failed.');
    }
    return res.json();
  },

  async getATSPreview(studentId) {
    const res = await fetch(`${API_BASE}/students/ats-preview/${encodeURIComponent(studentId)}`);
    if (!res.ok) throw new Error('Failed to fetch ATS layout preview.');
    return res.json();
  },

  async getStudentProgress(studentId) {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}/progress`);
    if (!res.ok) throw new Error('Failed to fetch student progress timeline.');
    return res.json();
  },

  async toggleMilestone(studentId, weekNumber, currentReadiness) {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}/milestones/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_number: weekNumber,
        current_readiness: currentReadiness
      })
    });
    if (!res.ok) throw new Error('Failed to toggle milestone state.');
    return res.json();
  },

  async getInterviewQuestion(skill = 'RAG Pipelines', difficulty = 6) {
    const res = await fetch(`${API_BASE}/students/interview/question?skill=${encodeURIComponent(skill)}&difficulty=${difficulty}`);
    if (!res.ok) throw new Error('Failed to fetch interview question.');
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
    if (!res.ok) throw new Error('Failed to evaluate technical answer.');
    return res.json();
  },

  async ingestExternalUrl(url) {
    const res = await fetch(`${API_BASE}/students/ingest-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to ingest external URL.');
    }
    return res.json();
  },

  // Admin API (Token Authenticated)
  async verifyAdminPin(pin) {
    const res = await fetch(`${API_BASE}/admin/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid admin credentials.');
    }
    const data = await res.json();
    if (data.token) {
      this.setAdminToken(data.token);
    }
    return data;
  },

  async getVerificationMatrix() {
    const res = await fetch(`${API_BASE}/admin/matrix`, {
      headers: this.getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Unauthorized access to admin matrix.');
    return res.json();
  },

  async updateStudentStatus(studentId, newStatus) {
    const res = await fetch(`${API_BASE}/admin/matrix/status`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify({ student_id: studentId, new_status: newStatus }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update student verification status.');
    }
    return res.json();
  },

  getExportCSVUrl() {
    return `${API_BASE}/admin/export/csv`;
  },
};