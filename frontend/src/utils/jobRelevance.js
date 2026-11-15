/**
 * Student-facing job relevance filtering.
 *
 * The live opportunity feed can contain non-technical business roles
 * (sales, legal, marketing, people operations, etc.). This module keeps the
 * student portal focused on technical placement roles.
 *
 * Classification prefers explicit metadata and required skills. A clear
 * non-technical title is treated as a veto so generic skills attached to a
 * business role (for example, "React, Go" on a marketing role) do not make it
 * look technical. Title terms are only one signal, not the whole rule.
 */

const TECHNICAL_TITLE_TERMS = [
  'software', 'software engineer', 'software developer', 'software development',
  'sde', 'sdet', 'engineer', 'engineering', 'developer', 'development',
  'programmer', 'programming', 'coder',
  'backend', 'back end', 'frontend', 'front end', 'full stack', 'fullstack',
  'web developer', 'web development', 'mobile', 'android', 'ios',
  'react', 'react native', 'node', 'nodejs', 'java', 'python', 'golang',
  'rust', 'dotnet', 'php', 'ruby', 'scala', 'kotlin', 'swift',
  'ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning',
  'data scientist', 'data science', 'data engineer', 'data analyst',
  'analytics engineer', 'business intelligence', 'bi developer',
  'cloud', 'devops', 'dev ops', 'infrastructure', 'platform',
  'platform engineering', 'site reliability', 'sre',
  'security', 'cybersecurity', 'cyber security', 'application security',
  'information security', 'security engineer', 'security analyst',
  'penetration tester', 'pen tester', 'soc analyst',
  'qa', 'quality assurance', 'test engineer', 'testing', 'test automation',
  'automation engineer',
  'systems', 'system', 'embedded', 'firmware', 'database', 'dba', 'network',
  'networking', 'solutions architect', 'technical architect', 'software architect',
  'cloud architect', 'integration engineer', 'release engineer', 'build engineer',
  'technical staff', 'member of technical staff', 'mlops', 'data platform',
  'computer vision', 'nlp'
];

const NON_TECHNICAL_TITLE_TERMS = [
  'account executive', 'account manager', 'sales', 'sales executive',
  'sales manager', 'business development', 'marketing', 'brand',
  'communications', 'public relations', 'legal', 'counsel', 'attorney',
  'lawyer', 'paralegal', 'compliance', 'finance', 'financial', 'accounting',
  'accountant', 'controller', 'audit', 'tax', 'treasury', 'procurement',
  'purchasing', 'supply chain', 'logistics',
  'human resources', 'hr', 'people operations', 'people partner',
  'talent acquisition', 'recruiter', 'recruiting', 'talent',
  'customer success', 'customer support', 'customer service', 'client success',
  'client services', 'executive assistant', 'administrative assistant',
  'office manager', 'operations manager', 'business operations',
  'sales operations', 'revenue operations', 'marketing operations',
  'strategy', 'strategic', 'consultant', 'consulting',
  'product manager', 'product owner', 'product management',
  'program manager', 'project manager', 'scrum master',
  'value stream', 'director of sales', 'vp sales', 'chief of staff',
  'general manager', 'store manager', 'security guard',
  'product designer', 'graphic designer', 'visual designer', 'ux designer',
  'ui designer', 'content writer', 'copywriter', 'social media',
  'partnerships', 'partnership manager', 'events manager'
];

const TECHNICAL_METADATA_TERMS = [
  'engineering', 'software', 'technology', 'information technology', 'it',
  'computer science', 'data', 'analytics', 'infrastructure', 'cloud',
  'devops', 'platform', 'security', 'quality assurance', 'qa', 'development',
  'technical', 'product engineering', 'machine learning', 'artificial intelligence',
  'research and development', 'r and d', 'systems', 'networking', 'database'
];

const NON_TECHNICAL_METADATA_TERMS = [
  'sales', 'marketing', 'legal', 'finance', 'accounting', 'human resources',
  'people operations', 'recruiting', 'talent', 'customer success',
  'customer support', 'business development', 'strategy', 'consulting',
  'administration', 'communications', 'public relations', 'procurement',
  'supply chain', 'logistics', 'compliance', 'audit', 'tax', 'treasury',
  'product management', 'design', 'data entry', 'business operations',
  'sales operations', 'revenue operations', 'marketing operations'
];

const TECHNICAL_SKILL_TERMS = [
  'python', 'java', 'javascript', 'typescript', 'cplusplus', 'csharp', 'go',
  'golang', 'rust', 'ruby', 'php', 'scala', 'kotlin', 'swift', 'objective c',
  'sql', 'nosql', 'r', 'matlab', 'bash', 'shell', 'powershell', 'perl',
  'elixir', 'erlang', 'haskell', 'dart',
  'react', 'react native', 'angular', 'vue', 'vuejs', 'nextjs', 'nodejs',
  'express', 'django', 'flask', 'fastapi', 'spring', 'spring boot', 'dotnet',
  'rails', 'laravel', 'graphql', 'grpc', 'rest', 'rest apis', 'restful apis',
  'microservices', 'api development', 'web development', 'mobile development',
  'pytorch', 'tensorflow', 'keras', 'scikit learn', 'sklearn', 'pandas',
  'numpy', 'spark', 'pyspark', 'kafka', 'airflow', 'dbt', 'langchain',
  'llamaindex', 'hugging face', 'transformers', 'opencv', 'nlp',
  'natural language processing', 'computer vision', 'machine learning',
  'deep learning', 'reinforcement learning', 'vector embeddings', 'rag',
  'retrieval augmented generation', 'llm', 'large language models', 'mlops',
  'model deployment', 'feature engineering', 'data modeling', 'data modelling',
  'data warehousing', 'etl', 'elt', 'data pipeline', 'data pipelines',
  'data engineering', 'data science', 'data analytics', 'business intelligence',
  'tableau', 'power bi',
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s',
  'terraform', 'ansible', 'jenkins', 'gitlab ci', 'github actions', 'ci cd',
  'continuous integration', 'continuous delivery', 'linux', 'unix', 'helm',
  'prometheus', 'grafana', 'datadog', 'cloudformation', 'openshift', 'vmware',
  'nginx', 'redis', 'postgresql', 'postgres', 'mysql', 'mongodb', 'dynamodb',
  'cassandra', 'elasticsearch', 'snowflake', 'bigquery', 'redshift',
  'databricks', 's3', 'ec2', 'lambda',
  'system design', 'distributed systems', 'data structures', 'algorithms',
  'operating systems', 'computer networks', 'networking', 'tcp ip', 'dns',
  'http', 'https', 'ssl', 'tls', 'load balancing', 'caching',
  'message queues', 'event driven architecture', 'observability',
  'site reliability', 'incident response', 'infrastructure as code',
  'containerization', 'virtualization', 'cloud computing', 'serverless',
  'api gateway',
  'cybersecurity', 'cyber security', 'application security',
  'information security', 'penetration testing', 'pen testing',
  'vulnerability assessment', 'owasp', 'siem', 'soc', 'threat modeling',
  'cryptography', 'identity and access management', 'iam', 'zero trust',
  'qa', 'quality assurance', 'test automation', 'automated testing',
  'selenium', 'cypress', 'playwright', 'jest', 'pytest', 'junit', 'testng',
  'load testing', 'performance testing', 'manual testing', 'sdet',
  'embedded systems', 'firmware', 'microcontrollers', 'rtos', 'fpga', 'iot',
  'robotics', 'computer architecture', 'compilers', 'kernel', 'device drivers',
  'database administration', 'dba', 'network engineering', 'systems engineering',
  'platform engineering', 'release engineering', 'build engineering',
  'integration engineering', 'solutions architecture', 'technical architecture',
  'software architecture'
];

const STRONG_TECHNICAL_SKILLS = new Set([
  'python', 'java', 'javascript', 'typescript', 'cplusplus', 'csharp', 'rust',
  'ruby', 'php', 'scala', 'kotlin', 'swift', 'react', 'angular', 'vue',
  'nodejs', 'django', 'flask', 'fastapi', 'spring', 'dotnet', 'pytorch',
  'tensorflow', 'kubernetes', 'docker', 'terraform', 'aws', 'azure', 'gcp',
  'linux', 'postgresql', 'mongodb', 'redis', 'kafka', 'spark', 'pandas',
  'numpy', 'scikit learn', 'machine learning', 'deep learning', 'nlp',
  'computer vision', 'rag', 'llm', 'cybersecurity', 'penetration testing',
  'selenium', 'cypress', 'playwright', 'embedded systems', 'firmware'
]);

const STRONG_TECHNICAL_NOUN = /\b(engineer|engineering|developer|architect|scientist|programmer|sre|devops|analyst|administrator|technician)\b/;

const METADATA_FIELDS = [
  'category', 'job_category', 'jobCategory', 'department', 'team',
  'function', 'job_function', 'jobFunction', 'job_family', 'jobFamily',
  'role_family', 'roleFamily', 'family', 'discipline', 'domain',
  'occupation', 'role_type', 'roleType'
];

const SKILL_FIELDS = [
  'requiredSkills', 'required_skills', 'skills', 'keywords', 'technologies',
  'techStack', 'tech_stack', 'tags'
];

const DESCRIPTION_FIELDS = ['description', 'summary', 'responsibilities', 'requirements'];

const SKILL_LABEL_OVERRIDES = {
  python: 'Python', java: 'Java', javascript: 'JavaScript', typescript: 'TypeScript',
  cplusplus: 'C++', csharp: 'C#', go: 'Go', golang: 'Go', sql: 'SQL',
  aws: 'AWS', gcp: 'GCP', azure: 'Azure', 'ci cd': 'CI/CD',
  'rest apis': 'REST APIs', 'restful apis': 'REST APIs', rest: 'REST',
  rag: 'RAG Pipelines', llm: 'LLM', nlp: 'NLP', mlops: 'MLOps',
  nodejs: 'Node.js', nextjs: 'Next.js', dotnet: '.NET', php: 'PHP',
  ios: 'iOS', 'scikit learn': 'Scikit-Learn', sklearn: 'Scikit-Learn',
  pytorch: 'PyTorch', tensorflow: 'TensorFlow', fastapi: 'FastAPI',
  postgresql: 'PostgreSQL', postgres: 'PostgreSQL', mongodb: 'MongoDB',
  kubernetes: 'Kubernetes', k8s: 'Kubernetes', docker: 'Docker',
  terraform: 'Terraform', graphql: 'GraphQL', grpc: 'gRPC',
  'vector embeddings': 'Vector Embeddings', 'system design': 'System Design',
  'machine learning': 'Machine Learning', 'deep learning': 'Deep Learning',
  'data science': 'Data Science', 'data engineering': 'Data Engineering',
  'data modeling': 'Data Modeling', 'data modelling': 'Data Modeling',
  'data pipelines': 'Data Pipelines', 'computer vision': 'Computer Vision',
  'site reliability': 'Site Reliability', 'penetration testing': 'Penetration Testing',
  'quality assurance': 'Quality Assurance', 'test automation': 'Test Automation',
  cybersecurity: 'Cybersecurity', 'information security': 'Information Security',
  'application security': 'Application Security', 'embedded systems': 'Embedded Systems',
  rtos: 'RTOS', fpga: 'FPGA', html: 'HTML', css: 'CSS'
};

function normalizeText(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .toLowerCase()
    .replace(/c\+\+/g, ' cplusplus ')
    .replace(/c#/g, ' csharp ')
    .replace(/\.net/g, ' dotnet ')
    .replace(/node\.js/g, ' nodejs ')
    .replace(/next\.js/g, ' nextjs ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function containsPhrase(text, phrase) {
  if (!text || !phrase) return false;
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return false;
  return (` ${text} `).includes(` ${normalizedPhrase} `);
}

function matchesAny(text, terms) {
  return terms.some(term => containsPhrase(text, term));
}

function flattenValues(value, output = []) {
  if (Array.isArray(value)) {
    value.forEach(item => flattenValues(item, output));
  } else if (value && typeof value === 'object') {
    if (value.name) output.push(String(value.name));
    if (value.label) output.push(String(value.label));
  } else if (value !== null && value !== undefined) {
    output.push(String(value));
  }
  return output;
}

function collectFields(job, fields) {
  return normalizeText(fields.map(field => flattenValues(job?.[field]).join(' ')).join(' '));
}

export function getJobSkills(job) {
  return collectFields(job, SKILL_FIELDS);
}

export function getJobMetadata(job) {
  return collectFields(job, METADATA_FIELDS);
}

export function getTechnicalSkillMatches(text) {
  if (!text) return [];
  return TECHNICAL_SKILL_TERMS.filter(term => containsPhrase(text, term));
}

function formatSkillLabel(term) {
  if (SKILL_LABEL_OVERRIDES[term]) return SKILL_LABEL_OVERRIDES[term];
  return term
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function normalizeJobSkills(job) {
  const rawValues = [];
  SKILL_FIELDS.forEach(field => flattenValues(job?.[field], rawValues));
  const raw = rawValues.join(' ').trim();
  if (!raw) return [];

  const normalized = normalizeText(raw);
  const matchedTerms = getTechnicalSkillMatches(normalized);
  // Drop shorter overlapping matches ("REST" when "REST APIs" is present) so a
  // single skill is not counted twice against the candidate.
  const distinctTerms = matchedTerms.filter(term =>
    !matchedTerms.some(other => other !== term && containsPhrase(normalizeText(other), term))
  );
  const matchedLabels = distinctTerms.map(formatSkillLabel);
  if (matchedLabels.length > 0) return [...new Set(matchedLabels)];

  // Preserve unknown skills instead of silently dropping them.
  return raw
    .split(/[,|;/]+|\s{2,}/)
    .map(skill => skill.trim())
    .filter(Boolean);
}

export function isTechnicalJob(job) {
  if (!job || typeof job !== 'object') return false;

  const explicitFlag = job.isTechnical ?? job.is_technical ?? job.technical;
  if (explicitFlag === true) return true;
  if (explicitFlag === false) return false;

  const title = normalizeText(job.title || job.role_title || job.roleTitle || job.name);
  const metadata = getJobMetadata(job);
  const skills = getJobSkills(job);
  const description = collectFields(job, DESCRIPTION_FIELDS);

  const technicalMetadata = matchesAny(metadata, TECHNICAL_METADATA_TERMS);
  const nonTechnicalMetadata = matchesAny(metadata, NON_TECHNICAL_METADATA_TERMS);

  // Explicit metadata is the strongest signal.
  if (technicalMetadata && !nonTechnicalMetadata) return true;
  if (nonTechnicalMetadata && !technicalMetadata) return false;

  const technicalTitle = matchesAny(title, TECHNICAL_TITLE_TERMS);
  const nonTechnicalTitle = matchesAny(title, NON_TECHNICAL_TITLE_TERMS);

  if (technicalTitle && nonTechnicalTitle) {
    // "Sales Engineer" and similar hybrid titles remain when the role noun is
    // clearly technical; "Technical Recruiter" does not.
    return STRONG_TECHNICAL_NOUN.test(title);
  }
  if (technicalTitle) return true;
  if (nonTechnicalTitle) return false;

  // No usable title or metadata signal: fall back to required skills, then to
  // the description. Two distinct technical skills are required so a single
  // generic token such as "Go" or "SQL" cannot classify a business role.
  const skillMatches = getTechnicalSkillMatches(skills);
  if (skillMatches.length >= 2) return true;
  if (skillMatches.length === 1 && STRONG_TECHNICAL_SKILLS.has(skillMatches[0])) return true;

  const descriptionMatches = getTechnicalSkillMatches(description);
  return descriptionMatches.length >= 2;
}

export function filterTechnicalJobs(jobs) {
  if (!Array.isArray(jobs)) return [];

  return jobs
    .filter(isTechnicalJob)
    .map(job => {
      // Preserve the provider-derived skills returned by the backend. Only
      // fall back to local normalization when the listing has no skill list.
      const providerSkills = Array.isArray(job.required_skills)
        ? job.required_skills.filter(skill => typeof skill === 'string' && skill.trim())
        : [];
      const requiredSkills = providerSkills.length > 0
        ? providerSkills
        : normalizeJobSkills(job);

      return {
        ...job,
        requiredSkills,
        required_skills: requiredSkills
      };
    });
}

export function resolveSelectedJobId(jobs, selectedJobId) {
  if (!Array.isArray(jobs) || jobs.length === 0) return null;

  if (selectedJobId && jobs.some(job => job?.id === selectedJobId)) {
    return selectedJobId;
  }

  const firstWithId = jobs.find(job => job && job.id !== null && job.id !== undefined);
  return firstWithId ? firstWithId.id : null;
}

export function selectTechnicalJobs(jobs, selectedJobId) {
  const technicalJobs = filterTechnicalJobs(jobs);
  return {
    jobs: technicalJobs,
    selectedJobId: resolveSelectedJobId(technicalJobs, selectedJobId)
  };
}
