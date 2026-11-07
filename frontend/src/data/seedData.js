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
  "FastAPI": {
    title: "High-Performance Python Backends with FastAPI",
    provider: "Official FastAPI Documentation",
    url: "https://fastapi.tiangolo.com/tutorial/",
    duration: "6 Hours",
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
    rawResume: `PRIYA SHARMA | Computer Science | priya.sharma@campus.edu\n• Architected RAG pipeline with Pinecone and FastAPI, reducing search latency by 42% across 50,000 papers.\n• Built distributed PyTorch training pipeline utilizing multi-GPU nodes with Docker containers.`,
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
    rawResume: `RAHUL VERMA | IT Branch\n• Built a backend using Node.js for an e-commerce grocery store.\n• Handled database queries in PostgreSQL and created basic routes.`,
    qualityScore: 58,
    weakBullets: [
      {
        original: "Built a backend using Node.js for an e-commerce grocery store.",
        improved: "Engineered scalable Node.js REST backend supporting 5,000+ daily orders with 99.8% uptime."
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
    slaHoursPending: 54,
    adminStatus: "Revision Required",
    targetRole: "job-ai-sys",
    skills: ["Manual QA", "Basic Python", "HTML", "CSS"],
    rawResume: `AMIT PATEL | ECE Branch\n• Helped test manual UI forms for student council club website.\n• Wrote basic Python scripts for assignment files.`,
    qualityScore: 35,
    weakBullets: [
      {
        original: "Helped test manual UI forms for student council club website.",
        improved: "Automated test regression suite covering 45+ UI workflows, cataloging 18 critical edge cases."
      }
    ]
  }
];

// Comprehensive Question Bank for All Common Missing Skills
export const MOCK_INTERVIEW_QUESTIONS = {
  "RAG Pipelines": [
    {
      level: "Intermediate",
      question: "How do you handle chunk boundary overlap and lost context when splitting documents into embeddings for RAG?",
      idealKeywords: ["sliding window", "overlap", "metadata", "hierarchical chunking"],
      difficulty: 6
    },
    {
      level: "Advanced",
      question: "Explain the role of a cross-encoder re-ranker before feeding retrieved vectors to an LLM context window.",
      idealKeywords: ["cross-encoder", "re-ranking", "cohere", "top-k", "hallucination"],
      difficulty: 8
    }
  ],
  "Vector Embeddings": [
    {
      level: "Intermediate",
      question: "What is the difference between Cosine Distance, Dot Product, and Euclidean (L2) distance for vector search?",
      idealKeywords: ["normalization", "magnitude", "angle", "high-dimensional"],
      difficulty: 6
    }
  ],
  "Docker": [
    {
      level: "Foundational",
      question: "Why should you use multi-stage builds in production Dockerfiles, and how do layers affect image size?",
      idealKeywords: ["multi-stage", "build artifacts", "layer caching", "attack surface"],
      difficulty: 5
    }
  ],
  "Kubernetes": [
    {
      level: "Intermediate",
      question: "Explain the difference between a Deployment, a StatefulSet, and a DaemonSet in Kubernetes.",
      idealKeywords: ["persistent storage", "node-level pods", "replicas", "rolling updates"],
      difficulty: 7
    }
  ],
  "System Design": [
    {
      level: "Intermediate",
      question: "How would you design an idempotent payment processing API to prevent double-charging on network retry?",
      idealKeywords: ["idempotency key", "redis lock", "database transaction", "unique constraint"],
      difficulty: 7
    }
  ],
  "FastAPI": [
    {
      level: "Foundational",
      question: "How does FastAPI achieve high performance using ASGI, Pydantic, and async/await syntax in Python?",
      idealKeywords: ["event loop", "starlette", "concurrency", "type hints", "pydantic"],
      difficulty: 6
    }
  ],
  "Redis": [
    {
      level: "Intermediate",
      question: "What cache eviction policies does Redis support, and when would you use Cache-Aside vs Write-Through?",
      idealKeywords: ["lru", "lfu", "ttl", "cache invalidation", "stale data"],
      difficulty: 6
    }
  ]
};