# InnoTrack System

InnoTrack is a comprehensive, full-stack application designed as a graduation project. The system consists of three main components: a modern web frontend, a robust backend API, and an AI-powered microservice for advanced analytics and natural language processing.

## Project Structure

The repository is organized into three main directories, each representing a core component of the system:

- **[`InnoTrack Frontend`](./InnoTrack%20Frontend)**: The user interface built with Next.js and React.
- **[`InnoTrack backend`](./InnoTrack%20backend)**: The core API and business logic built with .NET.
- **[`InnoTrack AI`](./InnoTrack%20AI)**: The AI microservice providing machine learning and NLP capabilities.

---

### 1. Frontend (`InnoTrack Frontend`)
A modern, responsive web application built to provide a seamless user experience. It leverages real-time communication and beautiful UI components.

**Tech Stack:**
- **Framework:** Next.js 16+ & React 19
- **Styling:** Tailwind CSS v4
- **UI Components:** Shadcn UI, Radix UI, Framer Motion
- **Real-time:** Microsoft SignalR
- **Data Visualization:** Recharts
- **Icons & Markdown:** Lucide React, React Markdown, remark-gfm

To get started with the frontend, navigate to the `InnoTrack Frontend` directory and check its `README.md`.

### 2. Backend (`InnoTrack backend`)
A robust, scalable backend system following Clean Architecture principles (Domain, Application, Infrastructure, API).

**Tech Stack:**
- **Framework:** .NET (C#)
- **Architecture:** Clean Architecture
- **Containerization:** Docker & Docker Compose
- **Features:** Entity Framework Core (assumed), RESTful API, Real-time Hubs.

To run the backend, navigate to the `InnoTrack backend` directory. You can use the provided `.slnx` solution file or run it via Docker Compose.

### 3. AI Service (`InnoTrack AI`)
A specialized Python microservice providing machine learning, embeddings, and generative AI capabilities to the main application.

**Tech Stack:**
- **API Framework:** FastAPI & Uvicorn
- **Machine Learning:** PyTorch, Scikit-learn, SciPy
- **NLP & Embeddings:** Transformers, Sentence-Transformers, KeyBERT, YAKE
- **Vector Search:** FAISS
- **Generative AI:** Google GenAI
- **Data Processing:** Pandas, NumPy, PyArrow
- **Database:** SQLAlchemy, PyODBC

To start the AI service, navigate to the `InnoTrack AI` directory, install the requirements, and run the FastAPI server.

---

## Getting Started

To run the full system locally, you will need to set up each component.

1. **Backend**: Navigate to `InnoTrack backend`, configure your `.env` (using `.env.example` as a reference), and start the API (via Visual Studio, .NET CLI, or Docker Compose).
2. **AI Service**: Navigate to `InnoTrack AI`, create a virtual environment, install `requirements.txt`, and run `start.sh` or the Uvicorn server.
3. **Frontend**: Navigate to `InnoTrack Frontend`, run `npm install`, and then `npm run dev` to start the development server.

*(Note: Please refer to the individual `README.md` files in each subdirectory for more specific setup instructions, environment variables, and scripts.)*
