# IsekAIChat 🌀

A mysterious rift has opened, allowing our world to connect to the worlds of fiction. **IsekAIChat** is an immersive AI-powered chat application that lets you connect your consciousness with your favorite fictional characters.

## ✨ Features

- **Dimensional Links**: Connect with characters from any fictional universe.
- **Personality Harvesting**: Uses Google Gemini to analyze and simulate accurate character personalities.
- **Real-time Communication**: Instant messaging with characters via Firebase Firestore.
- **Immersive UI**: A polished, dark-themed interface with portal animations and cosmic visuals.
- **Secure Authentication**: Google Login integration via Firebase Auth.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Animations**: [Motion](https://motion.dev/) (formerly Framer Motion)
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend & AI
- **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (Real-time NoSQL)
- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth)
- **AI Engine**: [Google Gemini API](https://ai.google.dev/) (`@google/genai`)

## 📂 Project Structure

- `src/pages`: Main application views (Landing, Chat, Disclaimer).
- `src/shared`: Reusable components, hooks, and services.
- `src/shared/services`: Firebase and Gemini API integrations.
- `docs/ERD.md`: Detailed database schema and entity relationships.

## 🚀 Getting Started

1. **Environment Setup**:
   - Copy `.env.example` to `.env`.
   - Provide your `GEMINI_API_KEY`.
   - Configure your Firebase project in `firebase-applet-config.json`.

2. **Installation**:
   ```bash
   npm install
   ```

3. **Development**:
   ```bash
   npm run dev
   ```

## 📜 Disclaimer
Users are solely responsible for the characters they connect and the content of their chats. By using the App, users acknowledge that they are interacting with AI-generated simulations.
