export const TARGET_JOBS = [
  {
    id: "job-ai-sys",
    title: "AI Systems & RAG Engineer",
    company: "Anthropic / Enterprise Labs",
    tier: "Tier-1",
    minCgpa: 7.5,
    requiredSkills: ["Python", "PyTorch", "Vector Embeddings", "RAG Pipelines", "FastAPI", "Docker", "System Design"],
    description: "Architect production agentic workflows, low-latency vector retrieval engines, and fine-tune open-weights models."
  },
  {
    id: "job-cloud-devops",
    title: "Cloud Infrastructure & DevOps Architect",
    company: "Synthetix Cloud Systems",
    tier: "Tier-1",
    minCgpa: 6.5,
    requiredSkills: ["Kubernetes", "Docker", "Terraform", "CI/CD", "AWS", "Linux", "Go"],
    description: "Manage zero-downtime distributed microservices, automate IaaC provisioning, and configure resilient observability meshes."
  },
  {
    id: "job-backend",
    title: "Distributed Backend Developer",
    company: "Razorpay / Stripe Ecosystem",
    tier: "Tier-2",
    minCgpa: 6.0,
    requiredSkills: ["Node.js", "PostgreSQL", "Redis", "REST APIs", "System Design", "Docker"],
    description: "Design high-concurrency payment gateways, transactional consistency engines, and caching topologies."
  },
  {
    id: "job-data-scientist",
    title: "Applied Data Scientist & ML Engineer",
    company: "Zomato AI Research",
    tier: "Tier-2",
    minCgpa: 6.0,
    requiredSkills: ["Python", "SQL", "Scikit-Learn", "Pandas", "PyTorch", "Data Modeling"],
    description: "Build predictive demand pipelines, customer propensity algorithms, and A/B test experiments at scale."
  }
];

export const VERIFIED_RESOURCES = {
  "Vector Embeddings": {
    title: "Vector Search & Retrieval Masterclass",
    provider: "Official LangChain & Pinecone Docs",
    url: "https://docs.pinecone.io/guides/get-started/overview",
    duration: "6 Hours",
    verified: true
  },
  "RAG Pipelines": {
    title: "Building Production RAG Systems",
    provider: "DeepLearning.AI / Coursera",
    url: "https://www.deeplearning.ai/short-courses/retrieval-augmented-generation/",
    duration: "8 Hours",
    verified: true
  },
  "Docker": {
    title: "Docker & Containerization Bootcamp",
    provider: "FreeCodeCamp & Docker Docs",
    url: "https://docs.docker.com/get-started/",
    duration: "10 Hours",
    verified: true
  },
  "Kubernetes": {
    title: "Cloud Native K8s Fundamentals",
    provider: "Linux Foundation (NPTEL Approved)",
    url: "https://kubernetes.io/docs/tutorials/",
    duration: "14 Hours",
    verified: true
  },
  "System Design": {
    title: "High-Volume Scalable Systems Architecture",
    provider: "NPTEL & ByteByteGo",
    url: "https://nptel.ac.in/courses/106105163",
    duration: "18 Hours",
    verified: true
  },
  "Redis": {
    title: "In-Memory Caching and Distributed State",
    provider: "Redis University",
    url: "https://university.redis.com/",
    duration: "5 Hours",
    verified: true
  },
  "Terraform": {
    title: "Automated Infrastructure as Code",
    provider: "HashiCorp Learn",
    url: "https://developer.hashicorp.com/terraform/tutorials",
    duration: "8 Hours",
    verified: true
  }
};

export const HACKATHONS_SEEDS = [
  {
    id: "hack-1",
    name: "Smart India Hackathon (SIH)",
    organizer: "MoE Innovation Cell, Govt of India",
    type: "National",
    prize: "₹1,00,000 / Theme",
    deadline: "In 18 Days",
    tag: "Government & AI",
    link: "https://www.sih.gov.in"
  },
  {
    id: "hack-2",
    name: "TCS CodeVita Season XII",
    organizer: "Tata Consultancy Services",
    type: "Global / Hiring Priority",
    prize: "$20,000 + Tier-1 Job Direct Interview",
    deadline: "In 25 Days",
    tag: "Algorithms & Systems",
    link: "https://campuscommune.tcs.com/en-in/intro/contests/codevita"
  },
  {
    id: "hack-3",
    name: "ETHIndia 2026",
    organizer: "Devfolio Global",
    type: "International Web3 & Systems",
    prize: "$120,000 Total Pool",
    deadline: "In 40 Days",
    tag: "High-Concurrency",
    link: "https://ethindia.co"
  },
  {
    id: "hack-4",
    name: "Adobe GenAI University Hackathon",
    organizer: "Adobe Systems",
    type: "Enterprise Contest",
    prize: "Summer Internships & PPE Offers",
    deadline: "In 12 Days",
    tag: "Creative AI & Agents",
    link: "https://www.adobe.com"
  }
];

export const DEMO_PROFILES = [
  {
    id: "stud-01",
    name: "Priya Sharma",
    email: "priya.sharma@campus.edu",
    phone: "+91 98765 43210",
    address: "B-402, Narmada Hostel, Campus Tech Zone",
    branch: "Computer Science & Engineering",
    cgpa: 8.8,
    activeAppsCount: 2,
    slaHoursPending: 14,
    adminStatus: "Approved",
    targetRole: "job-ai-sys",
    skills: ["Python", "PyTorch", "FastAPI", "Vector Embeddings", "Docker", "SQL", "Git"],
    rawResume: `PRIYA SHARMA | Computer Science | priya.sharma@campus.edu | +91 98765 43210
Education: B.Tech CSE, 2026. CGPA: 8.8.
Summary: AI Systems enthusiast experienced in vector embeddings, neural retrieval and microservices.
Projects:
• Architected RAG pipeline with Pinecone and FastAPI, reducing search latency by 42% across 50,000 technical papers.
• Built distributed PyTorch training pipeline utilizing multi-GPU nodes with Docker containers.
• Designed real-time event analytics backend using Redis pub-sub serving 1,200 requests/second.`,
    qualityScore: 88,
    weakBullets: []
  },
  {
    id: "stud-02",
    name: "Rahul Verma",
    email: "rahul.v@campus.edu",
    phone: "+91 91234 56789",
    address: "Room 108, Boys Residence Hall, Sector 4",
    branch: "Information Technology",
    cgpa: 6.8,
    activeAppsCount: 3,
    slaHoursPending: 32,
    adminStatus: "Pending",
    targetRole: "job-backend",
    skills: ["Node.js", "REST APIs", "PostgreSQL", "Git", "JavaScript"],
    rawResume: `RAHUL VERMA | IT Branch | rahul.v@campus.edu | +91 91234 56789
Education: B.Tech IT, 2026. CGPA: 6.8.
Summary: Backend engineer with core Node.js and PostgreSQL development experience.
Projects:
• Built a backend using Node.js for an e-commerce grocery store.
• Handled database queries in PostgreSQL and created basic routes.
• Integrated Stripe payment gateway API for checkout flow.`,
    qualityScore: 58,
    weakBullets: [
      {
        original: "Built a backend using Node.js for an e-commerce grocery store.",
        improved: "Engineered scalable Node.js REST backend supporting 5,000+ daily orders with 99.8% uptime."
      },
      {
        original: "Handled database queries in PostgreSQL and created basic routes.",
        improved: "Optimized complex PostgreSQL joins and indexing structures, decreasing average API response time by 35%."
      }
    ]
  },
  {
    id: "stud-03",
    name: "Amit Patel",
    email: "amit.patel@campus.edu",
    phone: "+91 90000 11111",
    address: "Flat 12, Sunrise Apts, West Campus",
    branch: "Electronics & Communication",
    cgpa: 5.6,
    activeAppsCount: 3,
    slaHoursPending: 54, // Triggers SLA Overdue Escalation (> 48 hrs)
    adminStatus: "Revision Required",
    targetRole: "job-ai-sys",
    skills: ["Manual QA", "Basic Python", "HTML", "CSS"],
    rawResume: `AMIT PATEL | amit.patel@campus.edu | +91 90000 11111 | Flat 12, Sunrise Apts
Education: B.Tech ECE, 2026. CGPA: 5.6.
Summary: Entry level developer interested in software testing and AI systems.
Experience:
• Helped test manual UI forms for student council club website.
• Wrote basic Python scripts for assignment files.`,
    qualityScore: 35,
    weakBullets: [
      {
        original: "Helped test manual UI forms for student council club website.",
        improved: "Executed regression testing protocol covering 45+ UI submission workflows, cataloging 18 critical edge cases."
      },
      {
        original: "Wrote basic Python scripts for assignment files.",
        improved: "Automated recurring file processing batch jobs in Python, saving 4 hours of manual processing weekly."
      }
    ]
  }
];

export const MOCK_INTERVIEW_QUESTIONS = {
  "RAG Pipelines": [
    {
      level: "Intermediate",
      question: "How do you mitigate 'chunk boundary bleeding' and lost context when splitting long-form documentation into vector embeddings for RAG?",
      idealKeywords: ["sliding window", "overlap", "metadata", "hierarchical chunking", "token limit"],
      difficulty: 6
    },
    {
      level: "Advanced",
      question: "Describe your strategy for re-ranking retrieved vector matches before feeding them to an LLM context window to prevent hallucinations.",
      idealKeywords: ["cross-encoder", "reciprocal rank fusion", "cohere rerank", "top-k", "cosine similarity threshold"],
      difficulty: 8
    }
  ],
  "System Design": [
    {
      level: "Intermediate",
      question: "How would you design an idempotent payment processing API to prevent duplicate charges during network timeouts?",
      idealKeywords: ["idempotency key", "redis lock", "database transaction", "unique constraint", "retry token"],
      difficulty: 7
    }
  ],
  "Docker": [
    {
      level: "Foundational",
      question: "What is the difference between an ephemeral container layer and a Docker volume, and why should you use multi-stage builds in production?",
      idealKeywords: ["persistence", "image size", "build artifacts", "security attack surface", "layer caching"],
      difficulty: 5
    }
  ]
};