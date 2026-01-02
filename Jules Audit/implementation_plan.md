# Lumina AI Implementation Plan

Based on the [Audit Report](./audit_report.md) dated October 26, 2023, the following implementation plan outlines the steps required to transform the current prototype into a production-ready application.

## Phase 1: Security & Infrastructure (Critical)

- [ ] **Secure API Key**
    - [ ] Create a Firebase Cloud Function (or equivalent backend proxy) to handle Gemini API requests.
    - [ ] Remove `process.env.API_KEY` injection from `vite.config.ts`.
    - [ ] Update client-side code (`services/genai/client.ts`) to call the proxy instead of the Gemini API directly.
    - [ ] Implement Firebase App Check to restrict access to the proxy.

- [ ] **Initialize Firebase**
    - [ ] Create a new Firebase project in the Firebase Console.
    - [ ] Install the SDK: `npm install firebase`.
    - [ ] Create `src/services/firebase.ts` and initialize the app with environment-specific config.

## Phase 2: Authentication & User Management (High)

- [ ] **Implement Authentication**
    - [ ] Enable "Email/Password" and "Google Sign-In" providers in Firebase Console.
    - [ ] Create an `AuthProvider` context in React to manage the `currentUser` state.
    - [ ] Implement a `<Login />` and `<Register />` view/modal.
    - [ ] Protect the main chat interface; require login to save data.

- [ ] **Session Management**
    - [ ] Update the UI to reflect user state (Avatar, Name).
    - [ ] Handle sign-out and token refresh automatically.

## Phase 3: Data Persistence (High)

- [ ] **Migrate to Firestore**
    - [ ] Provision a Firestore database in the Firebase Console.
    - [ ] Update `storageService.ts` to implement the `StorageService` interface using Firestore SDK instead of IndexedDB.
    - [ ] Implement data structure: `users/{userId}/sessions/{sessionId}/messages`.
    - [ ] Write Security Rules to ensure users can only read/write their own data.

- [ ] **Cloud Storage Integration**
    - [ ] Provision a Storage bucket.
    - [ ] Refactor `audioUtils.ts` to upload generated audio blobs to Firebase Storage and return a download URL.
    - [ ] Refactor image upload logic to store user images in `users/{uid}/uploads/`.

## Phase 4: Reliability & Performance (Medium)

- [ ] **API Resilience**
    - [ ] Create an `APIManager` class.
    - [ ] Implement exponential backoff for network errors (retry logic).
    - [ ] Add a circuit breaker to prevent cascading failures during outages.

- [ ] **Performance Tuning**
    - [ ] Move audio decoding logic to a Web Worker to unblock the main thread.
    - [ ] Implement `react-window` for the `MessageList` component to handle long conversations smoothly.

## Phase 5: Advanced Features (Low/Future)

- [ ] **Multi-Agent Orchestration**
    - [ ] Refactor `chatService.ts` to use a "Supervisor" pattern.
    - [ ] Define a clear `Agent` interface.
    - [ ] Implement a shared state object for complex agent hand-offs.

- [ ] **Token Optimization**
    - [ ] Implement a "Summarizer" background task to compress old chat history instead of hard-truncating it.

---

**Note:** This plan should be updated as tasks are completed. Refer to `audit_report.md` for detailed technical justifications.
