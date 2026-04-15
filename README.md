# 🎓 ChronoTable — Intelligent College Timetable Generator

<div align="center">

**AI-powered timetable generation system with constraint satisfaction, genetic algorithm optimization, and a stunning dark-mode dashboard.**

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Express](https://img.shields.io/badge/Express-4-green?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-purple?logo=prisma)

</div>

---

## ✨ Features

### 🧬 Scheduling Engine
- **Genetic Algorithm + CSP** hybrid optimization
- Configurable population size, generations, mutation/elitism rates
- Automatic conflict detection (teacher, room, batch overlaps)
- Lab session support with consecutive slot allocation
- Sub-3-second generation for typical workloads

### 📊 Data Management
- Full CRUD for **Departments, Semesters, Teachers, Subjects, Rooms, Batches**
- **Time Slots** with bulk generation of standard Mon–Fri schedules
- **Subject → Teacher** assignments with visual mapping
- Lab vs. theory subject classification

### ⚙️ Constraint Builder
- 18 constraint types across Teacher, Subject, Room, Batch, and Global categories
- Priority levels: Mandatory, High, Medium, Low
- Toggle constraints on/off without deleting
- Custom constraint support

### 📅 Timetable Viewer
- **Three view modes**: by Batch, Teacher, or Room
- Color-coded subject grid with lab badges
- Schedule status management (Draft → Published → Archived)
- Subject legend

### 📥 Export
- **CSV** — spreadsheet-ready export
- **JSON** — structured data export
- **HTML** — beautiful standalone timetable with dark theme
- **Print** — print-optimized layout

### 📈 Analytics Dashboard
- Overview stats (departments, teachers, subjects, rooms, batches, schedules)
- **Teacher workload distribution** with bar charts
- **Room utilization** with circular progress indicators
- **Free slots by day** visual breakdown
- **AI Insights** — automatic analysis of workload balance, room usage, and scheduling quality

### 🔐 Authentication
- JWT-based authentication
- Admin and Faculty roles
- Protected API endpoints

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                  │
│  Landing Page │ Login │ Dashboard │ Data │ Constraints    │
│  Generate │ Timetable Viewer │ Analytics                 │
│  ─────────────────── Tailwind CSS + ShadCN ────────────  │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API (Proxied via Next.js rewrites)
┌──────────────────────────┴──────────────────────────────┐
│                   Backend (Express + TS)                  │
│  Auth │ CRUD Routes │ Schedule Generation │ Analytics     │
│  ────────────── Prisma ORM ─────────────────────────     │
│  ────────────── Genetic Algorithm Engine ────────────     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│                    PostgreSQL Database                    │
│  users │ departments │ semesters │ teachers │ subjects    │
│  rooms │ batches │ time_slots │ constraints │ schedules   │
│  schedule_entries │ subject_teachers                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **PostgreSQL** 14+
- **npm** or **yarn**

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Database Setup

```bash
cd backend

# Create your .env file (already provided with defaults)
# Edit DATABASE_URL if your PostgreSQL credentials differ

# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed sample data
npx ts-node prisma/seed.ts
```

### 3. Run Development Servers

```bash
# Terminal 1 — Backend (port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

### 4. Open the App

Visit **http://localhost:3000**

**Demo credentials:** `admin@college.edu` / `admin123`

---

## 🐳 Docker Deployment

```bash
# From project root
docker-compose up --build

# The app will be available at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:4000
# PostgreSQL: localhost:5432
```

---

## 📁 Project Structure

```
project-time-table/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (11 models)
│   │   └── seed.ts                # Sample data seeder
│   ├── src/
│   │   ├── algorithm/
│   │   │   └── scheduler.ts       # Genetic Algorithm + CSP engine
│   │   ├── lib/
│   │   │   └── prisma.ts          # Prisma client singleton
│   │   ├── middleware/
│   │   │   └── auth.ts            # JWT authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.routes.ts     # Login / Register
│   │   │   ├── department.routes.ts
│   │   │   ├── semester.routes.ts
│   │   │   ├── teacher.routes.ts
│   │   │   ├── subject.routes.ts
│   │   │   ├── room.routes.ts
│   │   │   ├── batch.routes.ts
│   │   │   ├── timeSlot.routes.ts
│   │   │   ├── constraint.routes.ts
│   │   │   ├── schedule.routes.ts # Generate + view + edit
│   │   │   └── analytics.routes.ts
│   │   └── index.ts               # Express app entry point
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Landing page
│   │   │   ├── login/page.tsx     # Auth page
│   │   │   ├── globals.css        # Design system
│   │   │   ├── layout.tsx         # Root layout
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx     # Dashboard shell + sidebar
│   │   │       ├── page.tsx       # Dashboard overview
│   │   │       ├── data/page.tsx  # Academic data CRUD
│   │   │       ├── constraints/page.tsx
│   │   │       ├── generate/page.tsx
│   │   │       ├── timetable/page.tsx
│   │   │       └── analytics/page.tsx
│   │   └── lib/
│   │       ├── api.ts             # API client
│   │       └── utils.ts           # Helpers & constants
│   ├── Dockerfile
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
├── docker-compose.yml
├── implementation_plan.md
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login |
| `GET`  | `/api/auth/me` | Current user info |
| `CRUD` | `/api/departments` | Manage departments |
| `CRUD` | `/api/semesters` | Manage semesters |
| `CRUD` | `/api/teachers` | Manage teachers |
| `CRUD` | `/api/subjects` | Manage subjects (with teacher assignments) |
| `CRUD` | `/api/rooms` | Manage rooms |
| `CRUD` | `/api/batches` | Manage batches |
| `CRUD` | `/api/time-slots` | Manage time slots |
| `POST` | `/api/time-slots/bulk` | Bulk create time slots |
| `CRUD` | `/api/constraints` | Manage scheduling constraints |
| `POST` | `/api/schedules/generate` | Generate timetable |
| `GET`  | `/api/schedules/:id` | Get schedule with entries |
| `GET`  | `/api/schedules/:id/batch/:batchId` | Batch-filtered view |
| `GET`  | `/api/schedules/:id/teacher/:teacherId` | Teacher-filtered view |
| `GET`  | `/api/schedules/:id/room/:roomId` | Room-filtered view |
| `PATCH` | `/api/schedules/:id/status` | Update schedule status |
| `PUT`  | `/api/schedules/entry/:id` | Edit schedule entry |
| `DELETE` | `/api/schedules/:id` | Delete schedule |
| `GET`  | `/api/analytics` | Get analytics data |

---

## 🧬 How the Algorithm Works

1. **Build Allocations** — For each batch, determine required subject-teacher pairings and lecture counts
2. **Initialize Population** — Create N chromosomes using CSP backtracking + random placement
3. **Evaluate Fitness** — Score each chromosome based on hard constraints (conflicts = heavy penalty) and soft constraints (workload balance, preferences)
4. **Evolve** — Tournament selection → Uniform crossover → Mutation (reassign time slot or room)
5. **Elitism** — Preserve top performers across generations
6. **Output** — Return the best chromosome as schedule entries

### Constraint Penalties
| Constraint | Penalty | Severity |
|-----------|---------|----------|
| Teacher double-booking | 1000 | Hard |
| Room double-booking | 1000 | Hard |
| Batch overlap | 1000 | Hard |
| Lab in non-lab room | 200 | Medium |
| Teacher overload/day | 50/extra | Medium |
| Batch overload/day | 30/extra | Medium |
| Teacher unavailable | 30-500 | Variable |
| Workload imbalance | 5×σ | Soft |

---

## 📝 License

MIT © 2026 ChronoTable
