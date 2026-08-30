# Frontend — Intake Web App

React + TypeScript frontend for the hair & scalp intake experience.

## Setup & Run

Ensure the backend is running at `http://127.0.0.1:8000`, then:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

## Build

```bash
npm run typecheck
npm run build
```

## Overview

- **Dynamic Question Flow**: Routes single-select, multi-select, yes/no, number, and text questions with mobile-friendly tap targets.
- **Progress Tracking**: Real-time section indicators (A–E) and question count.
- **Voice Support**: Press-to-talk microphone integration for spoken answers.
- **Review & Export**: Interactive review screen displaying structured intake data and raw JSON export.
