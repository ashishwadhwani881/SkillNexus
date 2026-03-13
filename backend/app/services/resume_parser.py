import io
from typing import List, Tuple
from PyPDF2 import PdfReader

# Comprehensive tech skills dictionary for matching
TECH_SKILLS = {
    # Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "golang",
    "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab",
    # Frontend
    "react", "reactjs", "react.js", "angular", "vue", "vuejs", "vue.js",
    "svelte", "next.js", "nextjs", "nuxt", "gatsby", "html", "css",
    "sass", "scss", "tailwind", "tailwindcss", "bootstrap", "jquery",
    "webpack", "vite", "redux", "mobx", "zustand",
    # Backend
    "node.js", "nodejs", "express", "fastapi", "django", "flask",
    "spring", "spring boot", "asp.net", ".net", "rails", "laravel",
    "gin", "fiber", "fastify", "nest.js", "nestjs",
    # Databases
    "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
    "dynamodb", "cassandra", "sqlite", "oracle", "sql server", "neo4j",
    "firebase", "supabase",
    # Cloud & DevOps
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s",
    "terraform", "ansible", "jenkins", "github actions", "gitlab ci",
    "ci/cd", "nginx", "apache", "linux", "bash",
    # AI/ML
    "machine learning", "deep learning", "tensorflow", "pytorch",
    "scikit-learn", "pandas", "numpy", "opencv", "nlp",
    "natural language processing", "computer vision", "langchain",
    "transformers", "hugging face", "llm", "generative ai",
    # Tools & Practices
    "git", "github", "gitlab", "jira", "agile", "scrum",
    "rest api", "graphql", "grpc", "microservices", "api",
    "testing", "unit testing", "tdd", "devops", "mlops",
    # Data
    "sql", "nosql", "data science", "data engineering", "etl",
    "apache spark", "hadoop", "airflow", "kafka",
}


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text content from a PDF file."""
    reader = PdfReader(io.BytesIO(file_content))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text


def extract_skills(text: str) -> List[str]:
    """Extract tech skills from resume text."""
    text_lower = text.lower()
    found_skills = set()

    for skill in TECH_SKILLS:
        if skill in text_lower:
            found_skills.add(skill)

    return sorted(list(found_skills))


def parse_resume(file_content: bytes) -> List[str]:
    """Parse a resume PDF and return an array of skills."""
    text = extract_text_from_pdf(file_content)
    skills = extract_skills(text)
    return skills
