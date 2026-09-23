# MysteryOS — AI Investigation Platform

## Mission
MysteryOS is a domain-independent AI investigation platform. Users provide a question/mystery and datasets. The system ingests data, profiles it, detects anomalies and patterns, builds relationships and timelines, extracts evidence, generates hypotheses, uses LLM/RAG reasoning, and produces explainable findings and reports.

## Architecture
- Frontend: Next.js + React + TypeScript + Tailwind CSS
- Backend: Python + FastAPI
- Data: Pandas, NumPy, SciPy, scikit-learn
- AI: provider abstraction for Gemini/OpenAI
- RAG: FAISS initially; PostgreSQL/pgvector can be added later
- Database: PostgreSQL/Supabase-ready
- Charts: Recharts
- Graphs: React Flow

## Rules for Antigravity
1. FIRST inspect the complete repository structure and existing files.
2. Do NOT start coding immediately after reading the repository.
3. First provide a concise architecture analysis and implementation plan.
4. Wait for explicit approval before implementing a major phase.
5. Work one phase/feature at a time.
6. Modify only files required for the requested phase.
7. Never rewrite unrelated files.
8. Reuse existing utilities, types, services and components.
9. Do not create duplicate functionality.
10. Keep API routes thin; business logic belongs in services/engines.
11. Keep frontend presentation separate from backend analysis logic.
12. Never hardcode the platform to one domain such as banking, crime, healthcare or education.
13. Domain-specific behavior must use adapters/configuration.
14. Do not add dependencies unless necessary.
15. Do not change database schema without explicit approval.
16. Preserve existing working functionality.
17. After every implementation phase, run relevant tests/build checks.
18. At the end of a task report: files created, files modified, dependencies added, tests run, and remaining issues.

## Investigation pipeline
Input -> Ingestion -> Profiling -> Anomalies -> Patterns -> Relationships -> Timeline -> Evidence -> Hypotheses -> LLM/RAG -> Findings -> Report

## Phase discipline
Recommended order:
1. Project foundation
2. Frontend shell
3. Dataset upload/preview
4. FastAPI foundation
5. Ingestion
6. Profiling
7. Anomalies
8. Patterns
9. Relationships/graph
10. Timeline
11. Evidence
12. Hypotheses
13. LLM abstraction
14. RAG
15. Investigation Copilot
16. Investigation workspace integration
17. Domain adapters
18. Reports/PDF
19. Database/authentication
20. Testing/deployment
