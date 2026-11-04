"""
CareerSync Static Seed Catalog
Guarantees 100% uptime with zero external network lag.
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

VERIFIED_LEARNING_CATALOG = {
    "Vector Embeddings": {
        "title": "Vector Search & Retrieval Masterclass",
        "provider": "Official Pinecone & LangChain Docs",
        "url": "https://docs.pinecone.io/guides/get-started/overview",
        "duration": "6 Hours",
        "verified": True
    },
    "RAG Pipelines": {
        "title": "Building Production RAG Systems",
        "provider": "DeepLearning.AI / Coursera",
        "url": "https://www.deeplearning.ai/short-courses/retrieval-augmented-generation/",
        "duration": "8 Hours",
        "verified": True
    },
    "Docker": {
        "title": "Docker & Containerization Bootcamp",
        "provider": "FreeCodeCamp & Docker Docs",
        "url": "https://docs.docker.com/get-started/",
        "duration": "10 Hours",
        "verified": True
    },
    "Kubernetes": {
        "title": "Cloud Native K8s Fundamentals",
        "provider": "Linux Foundation (NPTEL Approved)",
        "url": "https://kubernetes.io/docs/tutorials/",
        "duration": "14 Hours",
        "verified": True
    },
    "System Design": {
        "title": "High-Volume Scalable Systems Architecture",
        "provider": "NPTEL & ByteByteGo",
        "url": "https://nptel.ac.in/courses/106105163",
        "duration": "18 Hours",
        "verified": True
    },
    "Redis": {
        "title": "In-Memory Caching and Distributed State",
        "provider": "Redis University",
        "url": "https://university.redis.com/",
        "duration": "5 Hours",
        "verified": True
    },
    "Terraform": {
        "title": "Automated Infrastructure as Code",
        "provider": "HashiCorp Learn",
        "url": "https://developer.hashicorp.com/terraform/tutorials",
        "duration": "8 Hours",
        "verified": True
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
    },
    {
        "id": "hack-3",
        "name": "ETHIndia 2026",
        "organizer": "Devfolio Global",
        "type": "International Web3 & Systems",
        "prize": "$120,000 Total Pool",
        "deadline": "In 40 Days",
        "tag": "High-Concurrency",
        "link": "https://ethindia.co"
    },
    {
        "id": "hack-4",
        "name": "Adobe GenAI University Hackathon",
        "organizer": "Adobe Systems",
        "type": "Enterprise Contest",
        "prize": "Summer Internships & PPE Offers",
        "deadline": "In 12 Days",
        "tag": "Creative AI & Agents",
        "link": "https://www.adobe.com"
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
        "sla_hours_pending": 54,  # Triggers SLA Escalation (> 48 hrs)
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
            "question": "How do you mitigate 'chunk boundary bleeding' and lost context when splitting long-form documentation into vector embeddings for RAG?",
            "keywords": ["sliding window", "overlap", "metadata", "hierarchical chunking", "token limit"],
            "difficulty": 6
        },
        {
            "id": "rag-q2",
            "level": "Advanced",
            "question": "Describe your strategy for re-ranking retrieved vector matches before feeding them to an LLM context window to prevent hallucinations.",
            "keywords": ["cross-encoder", "reciprocal rank fusion", "cohere rerank", "top-k", "cosine similarity threshold"],
            "difficulty": 8
        }
    ],
    "System Design": [
        {
            "id": "sys-q1",
            "level": "Intermediate",
            "question": "How would you design an idempotent payment processing API to prevent duplicate charges during network timeouts?",
            "keywords": ["idempotency key", "redis lock", "database transaction", "unique constraint", "retry token"],
            "difficulty": 7
        }
    ],
    "Docker": [
        {
            "id": "dock-q1",
            "level": "Foundational",
            "question": "What is the difference between an ephemeral container layer and a Docker volume, and why should you use multi-stage builds in production?",
            "keywords": ["persistence", "image size", "build artifacts", "security attack surface", "layer caching"],
            "difficulty": 5
        }
    ]
}