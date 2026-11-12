const API_BASE = '/api/v1';

export const apiClient = {
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

  getAdminHeaders() {
    const token = this.getAdminToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-admin-token'] = token;
    }
    return headers;
  },

  // Reset Demo Workspace (Sprint 3)
  async resetWorkspace() {
    const res = await fetch(`${API_BASE}/students/workspace/reset`, {
      method: 'POST',
      headers: this.getAdminHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to reset demo workspace.');
    }
    return res.json();
  },

  // Next Best Action
  async getNextAction(studentId, jobId = "job-ai-sys") {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}/recommendations/next-action?job_id=${encodeURIComponent(jobId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load recommendation action.');
    }
    return res.json();
  },

  // Student Preferences & Feedback
  async getPreferences(studentId) {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}/preferences`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load career preferences.');
    }
    return res.json();
  },

  async updatePreferences(studentId, prefData) {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save career preferences.');
    }
    return res.json();
  },

  async submitFeedback(studentId, entityType, entityId, action, reason = "") {
    const res = await fetch(`${API_BASE}/students/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        entity_type: entityType,
        entity_id: entityId,
        action: action,
        reason: reason
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to record feedback.');
    }
    return res.json();
  },

  async getFeedback(studentId) {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}/feedback`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load student feedback.');
    }
    return res.json();
  },

  async getRankedJobs(studentId) {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}/ranked-jobs`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load personalized job rankings.');
    }
    return res.json();
  },

  async getLiveJobs() {
    const res = await fetch(`${API_BASE}/students/jobs/live`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load live job feed.');
    }
    return res.json();
  },

  async getUniversityPolicy() {
    const res = await fetch(`${API_BASE}/students/policy`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch university policy.');
    }
    return res.json();
  },

  async submitCampusApplication(applicationData) {
    const res = await fetch(`${API_BASE}/students/applications/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicationData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Application failed to submit.');
    }
    return res.json();
  },

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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch ATS layout preview.');
    }
    return res.json();
  },

  async getStudentProgress(studentId) {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}/progress`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch student progress timeline.');
    }
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update milestone state.');
    }
    return res.json();
  },

  async getRoadmap(studentId, jobId = "job-ai-sys") {
    const res = await fetch(`${API_BASE}/students/roadmap/${encodeURIComponent(studentId)}?job_id=${encodeURIComponent(jobId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to generate preparation roadmap.');
    }
    return res.json();
  },

  async getInterviewQuestion(skill = 'RAG Pipelines', difficulty = 6) {
    const res = await fetch(`${API_BASE}/students/interview/question?skill=${encodeURIComponent(skill)}&difficulty=${difficulty}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch adaptive interview question.');
    }
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'We could not evaluate this response. No score was recorded.');
    }
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
      throw new Error(err.detail || 'Failed to ingest external job post URL.');
    }
    return res.json();
  },

  // Admin API
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Unauthorized access to admin matrix.');
    }
    return res.json();
  },

  async getIntentAnalytics() {
    const res = await fetch(`${API_BASE}/admin/analytics/intent`, {
      headers: this.getAdminHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load student intent analytics.');
    }
    return res.json();
  },

  async generateRemediationSyllabus(skills = ["Docker & Containerization", "System Design", "RAG Pipelines"]) {
    const res = await fetch(`${API_BASE}/admin/remediation/syllabus`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify({ target_skills: skills })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to generate remediation syllabus.');
    }
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