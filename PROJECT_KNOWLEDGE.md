# Bun AI API - Project Knowledge Base

## 1. Project Overview
**Name:** `bun-ai-api`
**Purpose:** A high-performance API wrapper for various AI Inference providers (Groq, Cerebras), built with [Bun](https://bun.sh/).
**Goal:** To provide a unified interface for chatting with LLMs, utilizing a round-robin load balancing strategy across multiple providers to maximize throughput and reliability.

## 2. Technology Stack & Key Decisions

*   **Runtime:** [Bun](https://bun.sh/)
    *   *Why:* Selected for its fast startup time, native TypeScript support (no compilation step needed), and high-performance HTTP server (`Bun.serve`).
*   **Language:** TypeScript
    *   *Why:* Type safety is crucial for defining unified interfaces (`APIService`) across different SDKs.
*   **Dependencies:**
    *   `groq-sdk`: Official SDK for Groq.
    *   `@cerebras/cerebras_cloud_sdk`: Official SDK for Cerebras.

## 3. Architecture & Code Structure

### 3.1. Core Interfaces (`types.ts`)
To ensure interchangeable usage of different AI providers, we define standard interfaces:
*   **`ChatMessage`**: Standardizes message format (`role`, `content`).
*   **`APIService`**: Defines the contract that all provider services must follow.
    *   `name`: Identifier string.
    *   `chat`: Function accepting messages and returning an `AsyncIterable<string>` for streaming responses.

### 3.2. Service Implementations (`services/`)
Each provider has its own file in `services/` that adapts the specific SDK to our `APIService` interface.

*   **`services/groq.ts`**:
    *   Implements the Groq provider.
    *   **Current Model:** `moonshotai/kimi-k2-instruct-0905`.
    *   **Implementation Detail:** Wraps the SDK's stream in an async generator to normalize the output delta format.
*   **`services/cerebras.ts`**:
    *   *Status:* File exists but is currently empty (Pending Implementation).
    *   *Goal:* Will implement the Cerebras SDK following the same pattern as Groq.

### 3.3. Entry Point & Logic (`index.ts`)
The main application entry point handles server setup and logic distribution.

*   **Service Registry:** Imports available services (`groqService`, `cerebrasService`) into a `services` array.
*   **Load Balancing (Round-Robin):**
    *   `getNextService()`: A simple function designed to rotate through the `services` array (`currentServiceIndex % length`).
    *   *Design Intent:* This allows the API to distribute load or handle rate limits by switching providers per request.
*   **HTTP Server:**
    *   Uses `Bun.serve`.
    *   **Current Status:** The `fetch` handler currently returns a static generic response ("API de Bun funcionando correctamente") and **does not yet** utilize the `getNextService` logic or the AI services. Connecting the logic to the HTTP endpoint is the next implementation step.

## 4. Development Workflow
*   **Run:** `bun run index.ts` (or `npm start`)
*   **Dev (Watch Mode):** `bun --watch run index.ts`

## 5. Future Improvements / TODOs
1.  **Implement Cerebras Service:** Fill in `services/cerebras.ts`.
2.  **Connect Endpoint:** Update `index.ts` `fetch` handler to parse the request body (messages), call `getNextService()`, and stream the AI response back to the client.
3.  **Error Handling:** Add try-catch blocks around service calls to handle API failures gracefully (potentially failing over to the next service).

## 6. Key Computer Science Concepts & Patterns

This section documents the *why* and *how* of the architectural choices, serving as a learning resource.

### 6.1. Round-Robin Load Balancing (Application Level)
*   **The Concept:** Round-Robin is a basic algorithm for distributing client requests across a group of servers. It works by forwarding requests to each server in turn.
*   **In Our Code:** implemented in `index.ts` via the `getNextService()` function.
*   **The Math:** We use the **Modulo Operator (`%`)**.
    ```typescript
    // currentServiceIndex starts at 0
    // services.length is 2 (Groq, Cerebras)

    // Request 1: index = 0. Service = Groq.
    // Update: (0 + 1) % 2 = 1 (Remainder of 1/2 is 1)

    // Request 2: index = 1. Service = Cerebras.
    // Update: (1 + 1) % 2 = 0 (Remainder of 2/2 is 0) -> Wraps back to start!
    ```
*   **Why use it here?** It's a simple, stateless way to distribute load. By alternating providers, we reduce the chance of hitting "Rate Limits" (requests per minute) on any single API key.

### 6.2. Strategy Pattern (Polymorphism)
*   **The Concept:** A behavioral design pattern that lets you define a family of algorithms (strategies), put each of them into a separate class/object, and make their objects interchangeable.
*   **In Our Code:**
    *   **The Interface (Contract):** `APIService` (in `types.ts`). It forces every provider to have a `name` and a `chat` function.
    *   **The Strategies:** `groqService` and `cerebrasService`. They implement the logic differently internally but look exactly the same from the outside.
*   **Why use it here?** It decouples the *consumer* (the server in `index.ts`) from the *implementation* (the specific SDKs). We can add `OpenAIService` or `AnthropicService` later without changing a single line of logic in `index.ts`. This satisfies the **Open/Closed Principle** (Open for extension, closed for modification).

### 6.3. Asynchronous Generators (Streaming)
*   **The Concept:** Standard functions return one value. Generators (`function*`) can return ("yield") multiple values over time. *Async* Generators allow this to happen while waiting for promises (like network requests).
*   **In Our Code:** The `.chat()` method returns an `AsyncIterable<string>`.
    ```typescript
    async function* () {
      for await (const chunk of chatCompletion) {
        yield chunk... // Emits a piece of text immediately
      }
    }
    ```
*   **Why use it here?** LLMs are slow to generate full responses. Instead of making the user wait 5 seconds for the whole answer, we "stream" tokens as they are generated. This drastically improves the "Time to First Byte" (TTFB) and Perceived Latency.
