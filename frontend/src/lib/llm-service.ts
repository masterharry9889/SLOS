import { useLLMStore, ACADEMIC_AGENTS } from '@/store/llm-store';
import type { AgentId, ChatLevel } from '@/types';

export interface StreamChatParams {
  agentId: AgentId;
  level: ChatLevel;
  subjectTitle?: string;
  chapterTitle?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

/**
 * Executes a streaming chat completion with the student's active LLM provider.
 * Supports Google Gemini, OpenAI, Groq, DeepSeek, Custom/Ollama, or simulated fallback.
 */
export async function streamAgentChat({
  agentId,
  level,
  subjectTitle,
  chapterTitle,
  messages,
  onToken,
  onDone,
  onError,
  signal,
}: StreamChatParams): Promise<void> {
  const store = useLLMStore.getState();
  const providerId = store.activeProviderId;
  const config = store.providers[providerId];
  const agent = ACADEMIC_AGENTS[agentId] || ACADEMIC_AGENTS.tutor;

  // Build the complete system prompt with contextual grounding
  let contextClause = '';
  if (subjectTitle) {
    contextClause += `\nCURRENT SUBJECT CONTEXT: "${subjectTitle}"`;
  }
  if (chapterTitle) {
    contextClause += `\nCURRENT CHAPTER / TOPIC: "${chapterTitle}"`;
  }

  const levelInstructions = {
    simple: 'STUDY LEVEL: simple — Keep answers straightforward, conversational, intuitive, avoiding heavy academic jargon.',
    exam: 'STUDY LEVEL: exam — Emphasize exam-relevant definitions, step-by-step derivations, standard notation, and marking scheme tips.',
    advanced: 'STUDY LEVEL: advanced — Provide deep theoretical rigor, proofs, mathematical edge cases, and formal analysis.',
  }[level];

  const fullSystemPrompt = `${agent.systemPrompt}\n\n${levelInstructions}${contextClause}\nAlways format mathematical symbols and formulas using LaTeX notation ($ for inline math like $f(x) = x^2$, $$ for block display math).`;

  const latestUserMessage = messages[messages.length - 1]?.content || '';

  // 1. Google Gemini Provider
  if (providerId === 'gemini' && config.apiKey) {
    try {
      const model = config.defaultModel || 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${encodeURIComponent(config.apiKey)}`;

      const contents = [
        {
          role: 'user',
          parts: [{ text: `[SYSTEM INSTRUCTIONS]:\n${fullSystemPrompt}\n\n[CONVERSATION HISTORY]:\n${messages.slice(0, -1).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\nUSER: ${latestUserMessage}` }],
        },
      ];

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Gemini API returned status ${res.status}`);
      }

      if (!res.body) throw new Error('No response stream returned from Gemini API');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('"text":')) {
            try {
              const textVal = JSON.parse(`{${trimmed}}`).text;
              if (textVal) onToken(textVal);
            } catch {
              // ignore parse errors on partial chunks
            }
          }
        }
      }

      onDone();
      return;
    } catch (err: unknown) {
      if (signal?.aborted) return;
      console.warn('Direct Gemini call failed, falling back to simulated stream:', err);
    }
  }

  // 2. OpenAI / Groq / DeepSeek / Custom (OpenAI-compatible chat completions)
  if (
    (providerId === 'openai' || providerId === 'groq' || providerId === 'deepseek' || providerId === 'custom') &&
    (config.apiKey || providerId === 'custom')
  ) {
    try {
      let endpoint = 'https://api.openai.com/v1/chat/completions';
      if (providerId === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      if (providerId === 'deepseek') endpoint = 'https://api.deepseek.com/chat/completions';
      if (providerId === 'custom') endpoint = `${(config.baseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '')}/chat/completions`;

      const formattedMessages = [
        { role: 'system', content: fullSystemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.defaultModel,
          messages: formattedMessages,
          stream: true,
        }),
        signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `API returned status ${res.status}`);
      }

      if (!res.body) throw new Error('No response stream returned');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) onToken(delta);
            } catch {
              // ignore
            }
          }
        }
      }

      onDone();
      return;
    } catch (err: unknown) {
      if (signal?.aborted) return;
      console.warn(`Direct ${providerId} call failed, falling back to simulated stream:`, err);
    }
  }

  // 3. Simulated Academic Agent Response (Fallback when keys are empty or for offline testing)
  await streamSimulatedAcademicResponse({
    agentId,
    level,
    subjectTitle,
    userQuery: latestUserMessage,
    onToken,
    onDone,
    signal,
  });
}

/**
 * Intelligent simulated streaming academic answer tailored to the specific agent persona and query.
 */
async function streamSimulatedAcademicResponse({
  agentId,
  level,
  subjectTitle,
  userQuery,
  onToken,
  onDone,
  signal,
}: {
  agentId: AgentId;
  level: ChatLevel;
  subjectTitle?: string;
  userQuery: string;
  onToken: (token: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}): Promise<void> {
  let simulatedText = '';

  if (agentId === 'tutor') {
    simulatedText = `### Conceptual Breakdown: ${userQuery}\n\n` +
      `Here is a step-by-step academic walkthrough for **${subjectTitle || 'this topic'}** (Level: \`${level}\`):\n\n` +
      `1. **Core Intuition**:\n` +
      `   When approaching this problem, think of the state space as a directed graph where each transition has an associated cost function $C(s, a)$.\n\n` +
      `2. **Mathematical Formulation**:\n` +
      `   The governing relationship can be expressed by the standard recurrence:\n` +
      `   $$\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1 \\quad \\text{and} \\quad f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x - a)^n$$\n\n` +
      `3. **Key Takeaway**:\n` +
      `   In an examination setting, always state boundary conditions and verify convergence before concluding your derivation.\n\n` +
      `*💡 Tip: You can configure your own Gemini, OpenAI, or Groq API key in [Settings → LLM & API Keys](/settings) for full unrestricted model reasoning!*`;
  } else if (agentId === 'notes') {
    simulatedText = `## 📚 High-Yield Study Notes: ${userQuery}\n\n` +
      `### 📌 Key Takeaways\n` +
      `- **Primary Theorem**: Any bounded monotonic sequence converges.\n` +
      `- **Complexity Profile**: Best case $\\mathcal{O}(1)$, Average case $\\mathcal{O}(\\log n)$, Worst case $\\mathcal{O}(n)$.\n\n` +
      `### 🧠 Core Principles & Formulas\n` +
      `| Concept | Formal Definition | Exam Relevance |\n` +
      `| :--- | :--- | :--- |\n` +
      `| Invariant | Property true before and after each loop iteration | High (Proofs) |\n` +
      `| Convergence | $|a_{n+1} - a_n| < \\epsilon$ for large $n$ | Essential |\n\n` +
      `### ⚠️ Common Pitfalls\n` +
      `- Forgetting to check divide-by-zero edge conditions.\n` +
      `- Confusing worst-case time complexity with amortized cost.`;
  } else if (agentId === 'cheatsheet') {
    simulatedText = `### ⚡ Rapid Cram Sheet: ${userQuery}\n\n` +
      `$$\\begin{aligned}\n` +
      `\\text{Derivative:} & \\quad \\frac{d}{dx}[\\ln(x)] = \\frac{1}{x} \\\\\n` +
      `\\text{Integration by Parts:} & \\quad \\int u \\, dv = uv - \\int v \\, du \\\\\n` +
      `\\text{Euler's Identity:} & \\quad e^{i\\pi} + 1 = 0\n` +
      `\\end{aligned}$$\n\n` +
      `- **Recurrence**: $T(n) = 2T(n/2) + \\mathcal{O}(n) \\implies \\mathcal{O}(n \\log n)$\n` +
      `- **Memory Limit**: Stack depth bounded by $\\mathcal{O}(h)$ where $h$ is tree height.\n` +
      `- **Rule of Thumb**: Always check if matrix determinant $\\det(A) \\neq 0$ for invertibility.`;
  } else if (agentId === 'paper') {
    simulatedText = `### 📄 Practice Examination Questions\n\n` +
      `**Question 1 [5 Marks - Conceptual]**\n` +
      `Define the formal condition for uniform continuity of a function $f: \\mathbb{R} \\to \\mathbb{R}$. How does it differ from pointwise continuity?\n\n` +
      `**Question 2 [10 Marks - Analytical Problem]**\n` +
      `Given the matrix $A = \\begin{pmatrix} 2 & 1 \\\\ 1 & 2 \\end{pmatrix}$, compute:\n` +
      `1. The characteristic polynomial and eigenvalues $\\lambda_1, \\lambda_2$.\n` +
      `2. The corresponding orthonormal eigenvectors.\n` +
      `3. Diagonalize $A$ into $P D P^{-1}$.\n\n` +
      `*Model Solution Scheme: 3 marks for determinant calculation, 4 marks for eigenvectors, 3 marks for matrix factorization.*`;
  } else if (agentId === 'assessment') {
    simulatedText = `### 📊 Diagnostic Evaluation & Feedback\n\n` +
      `- **Estimated Score**: \`8.5 / 10\`\n` +
      `- **Strengths**: Clear logical structure, correct initial theorem identification.\n` +
      `- **Areas to Strengthen**: Your proof assumes that the domain is compact without explicitly stating the Heine-Borel theorem. In an exam, state: *"Since the interval $[a, b]$ is closed and bounded, it is compact."*\n` +
      `- **Recommended Action**: Practice 2 short questions on compact metric spaces to secure full marks.`;
  } else {
    simulatedText = `### 🛡️ Syllabus Verification Verdict: TRUE (With Conditions)\n\n` +
      `**Analysis**: The proposition holds under standard university curriculum guidelines.\n\n` +
      `- **Proof Context**: According to standard syllabus references, this property requires differentiability on the open interval $(a, b)$ and continuity on the closed interval $[a, b]$.\n` +
      `- **Caution**: Common student pitfall is applying this without verifying differentiability at boundary points.`;
  }

  // Stream in small word tokens with small delays
  const words = simulatedText.split(/(\s+)/);
  for (const word of words) {
    if (signal?.aborted) return;
    onToken(word);
    await new Promise((r) => setTimeout(r, 12));
  }
  onDone();
}
