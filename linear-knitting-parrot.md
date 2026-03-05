# Questionnaire App — Implementation Plan

## Context

Build a single-user questionnaire app from scratch in an empty directory. The user needs to create questionnaires, add mixed-type questions, fill out responses, and view results — all persisted in localStorage with no backend.

**Stack:** Vite + React 18 + TypeScript + React Router v6 + CSS Modules

---

## Project Structure

```
D:\sandbox\qst-conditional\
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types.ts                   # shared interfaces
    ├── storage.ts                 # localStorage read/write utility
    ├── pages/
    │   ├── Home.tsx               # /  — questionnaire list
    │   ├── Builder.tsx            # /builder/new  and  /builder/:id
    │   ├── Respond.tsx            # /respond/:id
    │   └── Results.tsx            # /results/:id
    ├── components/
    │   ├── QuestionEditor.tsx     # single question form row in Builder
    │   └── QuestionInput.tsx      # renders the correct input in Respond
    └── styles/
        ├── global.css
        ├── Home.module.css
        ├── Builder.module.css
        ├── Respond.module.css
        └── Results.module.css
```

---

## Data Model (`src/types.ts`)

```typescript
export type QuestionType = 'text' | 'multiple-choice' | 'single-select'

export interface Question {
  id: string
  text: string
  type: QuestionType
  options?: string[]   // multiple-choice and single-select only
  required: boolean
}

export interface Questionnaire {
  id: string
  title: string
  description?: string
  questions: Question[]
  createdAt: string
}

export interface Answer {
  questionId: string
  value: string | number | boolean | string[]
}

export interface Response {
  id: string
  questionnaireId: string
  answers: Answer[]
  submittedAt: string
}
```

---

## Storage Utility (`src/storage.ts`)

Two localStorage keys: `"questionnaires"` and `"responses"`.

Functions to export:
- `getQuestionnaires(): Questionnaire[]`
- `saveQuestionnaire(q: Questionnaire): void`
- `deleteQuestionnaire(id: string): void`
- `getResponses(questionnaireId: string): Response[]`
- `saveResponse(r: Response): void`

Use `crypto.randomUUID()` for IDs throughout.

---

## Implementation Steps

### 1. Scaffold project
```bash
npm create vite@latest . -- --template react-ts
npm install react-router-dom
```
Clean out boilerplate (App.css, assets, logo).

### 2. Types & storage (`src/types.ts`, `src/storage.ts`)
Implement interfaces and all storage functions. No UI yet.

### 3. Router setup (`src/App.tsx`, `src/main.tsx`)
Wire up `BrowserRouter` with four routes:
- `/` → `<Home />`
- `/builder/new` → `<Builder />`
- `/builder/:id` → `<Builder />`
- `/respond/:id` → `<Respond />`
- `/results/:id` → `<Results />`

### 4. Home page (`src/pages/Home.tsx`)
- Load questionnaires from storage on mount
- Render a card/row per questionnaire: title, description, date, question count
- Action buttons: New, Edit (→ `/builder/:id`), Respond (→ `/respond/:id`), Results (→ `/results/:id`), Delete (with confirm)
- Empty state message when no questionnaires exist

### 5. QuestionEditor component (`src/components/QuestionEditor.tsx`)
Props: `question`, `onChange`, `onDelete`, `onMoveUp`, `onMoveDown`
- Text input for question text
- Select for type (text / multiple-choice / yes-no / rating)
- Required checkbox
- When type = multiple-choice or single-select: dynamic list of option inputs (add/remove option)
- Delete and reorder buttons

### 6. Builder page (`src/pages/Builder.tsx`)
- Load existing questionnaire if `:id` param present, else start fresh
- Title + description inputs
- List of `<QuestionEditor />` components
- "Add Question" button (appends a default text question)
- "Save" button: validate title not empty, persist, navigate to `/`
- "Cancel" button: navigate to `/` without saving

### 7. QuestionInput component (`src/components/QuestionInput.tsx`)
Props: `question`, `value`, `onChange`
Renders based on `question.type`:
- `text` → `<textarea>`
- `multiple-choice` → checkboxes (multiple answers), built from `question.options`
- `single-select` → radio buttons (one answer), built from `question.options`

### 8. Respond page (`src/pages/Respond.tsx`)
- Load questionnaire by `:id`
- Render title, description, then one `<QuestionInput />` per question
- Track answers in local state `Record<questionId, value>`
- On submit: validate required fields, build `Response` object, save to storage, navigate to `/results/:id`

### 9. Results page (`src/pages/Results.tsx`)
- Load questionnaire + all responses for `:id`
- Show questionnaire title and total response count
- For each question, show:
  - `text`: list each answer verbatim
  - `multiple-choice` / `single-select`: tally option counts and show simple summary (e.g. "Option A: 3, Option B: 1")
- "Back" link to `/`

### 10. Styling (`src/styles/`)
- Clean, minimal design with CSS Modules
- Responsive layout (single column on small screens)
- Consistent button styles (primary, secondary, danger)

---

## Verification

1. `npm run dev` — app starts without errors
2. Create a questionnaire with all 4 question types → saved and visible on Home
3. Edit the questionnaire → changes persist after reload
4. Delete a questionnaire → removed from list
5. Respond to a questionnaire → redirects to Results
6. View Results → all answers shown with summaries
7. Hard-refresh browser → all data survives (localStorage persisted)
8. `npm run build` — TypeScript compiles with no errors
