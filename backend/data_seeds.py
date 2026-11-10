"""
CareerSync Multi-Style Learning Catalog & Seed Datasets
Provides verified resources across 3 student learning styles:
- PROJECT_BASED: Hands-on mini-systems and labs
- VIDEO_LECTURES: NPTEL, Coursera, DeepLearning.AI
- DOCS_READING: Official developer documentation
"""

TARGET_JOBS = [
    {
        "id": "job-ai-sys",
        "title": "AI Systems & RAG Engineer",
        "company": "Anthropic / Enterprise Labs",
        "tier": "Tier-1",
        "min_cgpa": 7.5,
        "required_skills": ["Python", "PyTorch", "Vector Embeddings", "RAG Pipelines", "FastAPI", "Docker", "System Design"],
        "description": "Architect production agentic workflows, low-latency vector retrieval engines, and fine-tune open models."
    },
    {
        "id": "job-cloud-devops",
        "title": "Cloud Infrastructure & DevOps Architect",
        "company": "Synthetix Cloud Systems",
        "tier": "Tier-1",
        "min_cgpa": 6.5,
        "required_skills": ["Kubernetes", "Docker", "Terraform", "CI/CD", "AWS", "Linux", "Go"],
        "description": "Manage zero-downtime distributed microservices and automate IaaC provisioning."
    },
    {
        "id": "job-backend",
        "title": "Distributed Backend Developer",
        "company": "Razorpay / Stripe Ecosystem",
        "tier": "Tier-2",
        "min_cgpa": 6.0,
        "required_skills": ["Node.js", "PostgreSQL", "Redis", "REST APIs", "System Design", "Docker"],
        "description": "Design high-concurrency payment gateways, transactional consistency engines, and caching topologies."
    },
    {
        "id": "job-data-scientist",
        "title": "Applied Data Scientist & ML Engineer",
        "company": "Zomato AI Research",
        "tier": "Tier-2",
        "min_cgpa": 6.0,
        "required_skills": ["Python", "SQL", "Scikit-Learn", "Pandas", "PyTorch", "Data Modeling"],
        "description": "Build predictive demand pipelines, customer propensity algorithms, and A/B test experiments."
    }
]

# Multi-Style Verified Resource Catalog (Zero Hallucination)
VERIFIED_LEARNING_CATALOG = {
    "RAG Pipelines": {
        "PROJECT_BASED": {
            "title": "Build a Local RAG Agent with Pinecone & FastAPI",
            "provider": "GitHub Production Lab",
            "url": "https://github.com/pinecone-io/examples",
            "duration": "6 Hours",
            "format": "🛠️ Hands-on Project Lab"
        },
        "VIDEO_LECTURES": {
            "title": "Building Production RAG Systems",
            "provider": "DeepLearning.AI / Coursera",
            "url": "https://www.deeplearning.ai/short-courses/retrieval-augmented-generation/",
            "duration": "8 Hours",
            "format": "🎥 Video Lecture Course"
        },
        "DOCS_READING": {
            "title": "Retrieval-Augmented Generation Architecture Specs",
            "provider": "LangChain & Pinecone Docs",
            "url": "https://docs.pinecone.io/guides/get-started/overview",
            "duration": "4 Hours",
            "format": "📖 Official Documentation"
        }
    },
    "Vector Embeddings": {
        "PROJECT_BASED": {
            "title": "Semantic Search Engine Implementation Lab",
            "provider": "Hugging Face Open Source Labs",
            "url": "https://huggingface.co/tasks/sentence-similarity",
            "duration": "5 Hours",
            "format": "🛠️ Hands-on Project Lab"
        },
        "VIDEO_LECTURES": {
            "title": "Vector Embeddings & Semantic Search in Depth",
            "provider": "NPTEL & DeepLearning.AI",
            "url": "https://nptel.ac.in/courses/106105163",
            "duration": "6 Hours",
            "format": "🎥 Video Lecture Course"
        },
        "DOCS_READING": {
            "title": "Vector Distance Metrics & Mathematical Foundations",
            "provider": "Pinecone Learning Center",
            "url": "https://www.pinecone.io/learn/vector-embeddings/",
            "duration": "3 Hours",
            "format": "📖 Official Documentation"
        }
    },
    "Docker": {
        "PROJECT_BASED": {
            "title": "Multi-Stage Dockerfile Optimization for Microservices",
            "provider": "Docker Labs & Katacoda",
            "url": "https://docs.docker.com/get-started/workshop/",
            "duration": "4 Hours",
            "format": "🛠️ Hands-on Project Lab"
        },
        "VIDEO_LECTURES": {
            "title": "Docker Containerization Bootcamp for Engineers",
            "provider": "FreeCodeCamp & TechWorld",
            "url": "https://www.freecodecamp.org/news/docker-course/",
            "duration": "6 Hours",
            "format": "🎥 Video Lecture Course"
        },
        "DOCS_READING": {
            "title": "Docker Engine & Compose Production Reference",
            "provider": "Official Docker Documentation",
            "url": "https://docs.docker.com/engine/reference/builder/",
            "duration": "3 Hours",
            "format": "📖 Official Documentation"
        }
    },
    "Kubernetes": {
        "PROJECT_BASED": {
            "title": "Deploying Resilient Microservices with Minikube",
            "provider": "Kubernetes Interactive Tutorials",
            "url": "https://kubernetes.io/docs/tutorials/kubernetes-basics/",
            "duration": "8 Hours",
            "format": "🛠️ Hands-on Project Lab"
        },
        "VIDEO_LECTURES": {
            "title": "Cloud Native Kubernetes Fundamentals",
            "provider": "Linux Foundation (NPTEL Approved)",
            "url": "https://nptel.ac.in/courses/106105223",
            "duration": "10 Hours",
            "format": "🎥 Video Lecture Course"
        },
        "DOCS_READING": {
            "title": "Kubernetes Core Concepts & Architecture",
            "provider": "Official Kubernetes Documentation",
            "url": "https://kubernetes.io/docs/concepts/",
            "duration": "5 Hours",
            "format": "📖 Official Documentation"
        }
    },
    "System Design": {
        "PROJECT_BASED": {
            "title": "Designing a Distributed Rate Limiter & Idempotent API",
            "provider": "ByteByteGo Architecture Labs",
            "url": "https://github.com/donnemartin/system-design-primer",
            "duration": "8 Hours",
            "format": "🛠️ Hands-on Project Lab"
        },
        "VIDEO_LECTURES": {
            "title": "Large Scale Distributed Systems Architecture",
            "provider": "MIT OpenCourseWare & NPTEL",
            "url": "https://nptel.ac.in/courses/106105163",
            "duration": "12 Hours",
            "format": "🎥 Video Lecture Course"
        },
        "DOCS_READING": {
            "title": "System Design Primer & RFC Architectural Papers",
            "provider": "High Scalability & System Design Primer",
            "url": "https://github.com/donnemartin/system-design-primer",
            "duration": "6 Hours",
            "format": "📖 Official Documentation"
        }
    },
    "Redis": {
        "PROJECT_BASED": {
            "title": "Implementing Distributed Locks and Cache-Aside Pattern",
            "provider": "Redis Developer Labs",
            "url": "https://developer.redis.com/",
            "duration": "4 Hours",
            "format": "🛠️ Hands-on Project Lab"
        },
        "VIDEO_LECTURES": {
            "title": "Redis In-Memory Data Structures Masterclass",
            "provider": "Redis University",
            "url": "https://university.redis.com/",
            "duration": "5 Hours",
            "format": "🎥 Video Lecture Course"
        },
        "DOCS_READING": {
            "title": "Redis Command Reference & Eviction Strategies",
            "provider": "Official Redis Documentation",
            "url": "https://redis.io/documentation",
            "duration": "3 Hours",
            "format": "📖 Official Documentation"
        }
    },
    "FastAPI": {
        "PROJECT_BASED": {
            "title": "Async CRUD Microservice with Pydantic v2 & JWT",
            "provider": "FastAPI Full-Stack GitHub Labs",
            "url": "https://github.com/tiangolo/fastapi",
            "duration": "5 Hours",
            "format": "🛠️ Hands-on Project Lab"
        },
        "VIDEO_LECTURES": {
            "title": "Building Production Python APIs with FastAPI",
            "provider": "Coursera & FreeCodeCamp",
            "url": "https://www.freecodecamp.org/news/fastapi-quickstart/",
            "duration": "6 Hours",
            "format": "🎥 Video Lecture Course"
        },
        "DOCS_READING": {
            "title": "FastAPI Interactive Tutorial & Dependency Injection",
            "provider": "Official FastAPI Documentation",
            "url": "https://fastapi.tiangolo.com/tutorial/",
            "duration": "4 Hours",
            "format": "📖 Official Documentation"
        }
    },
    "PostgreSQL": {
        "PROJECT_BASED": {
            "title": "Index Optimization, EXPLAIN ANALYZE & Query Tuning",
            "provider": "PostgreSQL Exercise Labs",
            "url": "https://pgexercises.com/",
            "duration": "5 Hours",
            "format": "🛠️ Hands-on Project Lab"
        },
        "VIDEO_LECTURES": {
            "title": "Database Management Systems & SQL Fundamentals",
            "provider": "NPTEL (IIT Kharagpur)",
            "url": "https://nptel.ac.in/courses/106105175",
            "duration": "8 Hours",
            "format": "🎥 Video Lecture Course"
        },
        "DOCS_READING": {
            "title": "PostgreSQL Concurrency Control & Isolation Levels",
            "provider": "Official PostgreSQL Documentation",
            "url": "https://www.postgresql.org/docs/current/transaction-iso.html",
            "duration": "3 Hours",
            "format": "📖 Official Documentation"
        }
    }
}

HACKATHON_SEEDS = [
    {
        "id": "hack-1",
        "name": "Smart India Hackathon (SIH)",
        "organizer": "MoE Innovation Cell, Govt of India",
        "type": "National",
        "prize": "₹1,00,000 / Theme",
        "deadline": "In 18 Days",
        "tag": "Government & AI",
        "link": "https://www.sih.gov.in"
    },
    {
        "id": "hack-2",
        "name": "TCS CodeVita Season XII",
        "organizer": "Tata Consultancy Services",
        "type": "Global / Hiring Priority",
        "prize": "$20,000 + Tier-1 Job Direct Interview",
        "deadline": "In 25 Days",
        "tag": "Algorithms & Systems",
        "link": "https://campuscommune.tcs.com/en-in/intro/contests/codevita"
    }
]

STUDENT_DATABASE = [
    {
        "id": "stud-01",
        "name": "Priya Sharma",
        "email": "priya.sharma@campus.edu",
        "phone": "+91 98765 43210",
        "address": "B-402, Narmada Hostel, Campus Tech Zone",
        "branch": "Computer Science & Engineering",
        "cgpa": 8.8,
        "active_apps_count": 2,
        "sla_hours_pending": 14,
        "admin_status": "Approved",
        "target_role": "job-ai-sys",
        "skills": ["Python", "PyTorch", "FastAPI", "Vector Embeddings", "Docker", "SQL", "Git"],
        "raw_resume": "PRIYA SHARMA | Computer Science\n• Architected RAG pipeline with Pinecone and FastAPI, reducing search latency by 42% across 50,000 papers.\n• Built distributed PyTorch training pipeline utilizing multi-GPU nodes with Docker containers.",
        "quality_score": 88
    },
    {
        "id": "stud-02",
        "name": "Rahul Verma",
        "email": "rahul.v@campus.edu",
        "phone": "+91 91234 56789",
        "address": "Room 108, Boys Residence Hall, Sector 4",
        "branch": "Information Technology",
        "cgpa": 6.8,
        "active_apps_count": 3,
        "sla_hours_pending": 32,
        "admin_status": "Pending",
        "target_role": "job-backend",
        "skills": ["Node.js", "REST APIs", "PostgreSQL", "Git", "JavaScript"],
        "raw_resume": "RAHUL VERMA | IT Branch\n• Built a backend using Node.js for an e-commerce grocery store.\n• Handled database queries in PostgreSQL and created basic routes.",
        "quality_score": 58
    },
    {
        "id": "stud-03",
        "name": "Amit Patel",
        "email": "amit.patel@campus.edu",
        "phone": "+91 90000 11111",
        "address": "Flat 12, Sunrise Apts, West Campus",
        "branch": "Electronics & Communication",
        "cgpa": 5.6,
        "active_apps_count": 3,
        "sla_hours_pending": 54,
        "admin_status": "Revision Required",
        "target_role": "job-ai-sys",
        "skills": ["Manual QA", "Basic Python", "HTML", "CSS"],
        "raw_resume": "AMIT PATEL | ECE Branch\n• Helped test manual UI forms for student council club website.\n• Wrote basic Python scripts for assignment files.",
        "quality_score": 35
    }
]

INTERVIEW_QUESTION_BANK = {
    "RAG Pipelines": [
        {
            "id": "rag-q1",
            "level": "Intermediate",
            "question": "How do you handle chunk boundary overlap and lost context when splitting documents into embeddings for RAG?",
            "keywords": ["sliding window", "overlap", "metadata", "hierarchical chunking"],
            "difficulty": 6
        },
        {
            "id": "rag-q2",
            "level": "Advanced",
            "question": "Explain the role of a cross-encoder re-ranker before feeding retrieved vectors to an LLM context window.",
            "keywords": ["cross-encoder", "re-ranking", "cohere", "top-k", "hallucination"],
            "difficulty": 8
        }
    ],
    "Vector Embeddings": [
        {
            "id": "vec-q1",
            "level": "Intermediate",
            "question": "What is the difference between Cosine Distance, Dot Product, and Euclidean (L2) distance for vector search?",
            "keywords": ["normalization", "magnitude", "angle", "high-dimensional"],
            "difficulty": 6
        }
    ],
    "Docker": [
        {
            "id": "dock-q1",
            "level": "Foundational",
            "question": "Why should you use multi-stage builds in production Dockerfiles, and how do layers affect image size?",
            "keywords": ["multi-stage", "build artifacts", "layer caching", "attack surface"],
            "difficulty": 5
        }
    ],
    "Kubernetes": [
        {
            "id": "k8s-q1",
            "level": "Intermediate",
            "question": "Explain the difference between a Deployment, a StatefulSet, and a DaemonSet in Kubernetes.",
            "keywords": ["persistent storage", "node-level pods", "replicas", "rolling updates"],
            "difficulty": 7
        }
    ],
    "System Design": [
        {
            "id": "sys-q1",
            "level": "Intermediate",
            "question": "How would you design an idempotent payment processing API to prevent double-charging on network retry?",
            "keywords": ["idempotency key", "redis lock", "database transaction", "unique constraint"],
            "difficulty": 7
        }
    ],
    "FastAPI": [
        {
            "id": "fast-q1",
            "level": "Foundational",
            "question": "How does FastAPI achieve high performance using ASGI, Pydantic, and async/await syntax in Python?",
            "keywords": ["event loop", "starlette", "concurrency", "type hints", "pydantic"],
            "difficulty": 6
        }
    ],
    "Redis": [
        {
            "id": "red-q1",
            "level": "Intermediate",
            "question": "What cache eviction policies does Redis support, and when would you use Cache-Aside vs Write-Through?",
            "keywords": ["lru", "lfu", "ttl", "cache invalidation", "stale data"],
            "difficulty": 6
        }
    ],
    "PostgreSQL": [
        {
            "id": "pg-q1",
            "level": "Intermediate",
            "question": "Explain database transaction isolation levels and how MVCC works in PostgreSQL to prevent dirty reads.",
            "keywords": ["isolation levels", "mvcc", "dirty read", "snapshot", "acid"],
            "difficulty": 7
        }
    ]
}