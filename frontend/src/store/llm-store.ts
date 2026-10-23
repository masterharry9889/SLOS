import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LLMProviderId, LLMProviderConfig, AgentId, AgentDefinition, ChatLevel } from '@/types';

export const ACADEMIC_AGENTS: Record<AgentId, AgentDefinition> = {
  tutor: {
    id: 'tutor',
    name: 'Academic Tutor Agent',
    shortName: 'Tutor',
    role: 'Socratic Concept Explainer',
    description: 'Guides you through difficult concepts, step-by-step derivations, and provides clear academic explanations with citations.',
    iconName: 'GraduationCap',
    badgeColor: 'text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800',
    suggestedPrompts: [
      'Explain Big-O vs Big-Omega time complexity with examples',
      'Walk me through the derivation of the Schrödinger wave equation',
      'How does gradient descent optimize weights in neural networks?',
      'Solve this calculus limit step-by-step: lim(x->0) (sin x)/x',
    ],
    systemPrompt: `You are the Student Life OS Academic Tutor Agent.
Your mission is to guide students to deep conceptual understanding using Socratic explanations, clear step-by-step breakdowns, and rigorous academic derivations.
When explaining:
1. Provide a direct, intuitive conceptual overview first.
2. If mathematical or technical, format equations in clean LaTeX notation using $ for inline math and $$ for block math.
3. Structure your answer with clear headers, bullet points, and practical analogies.
4. If a study level is specified (simple, exam, advanced), adapt your depth:
   - Simple: everyday analogies, no unnecessary jargon.
   - Exam: exam-focused key terms, definitions, step-by-step proofs, common pitfalls.
   - Advanced: deep theoretical rigor, formal definitions, edge cases.`,
  },
  notes: {
    id: 'notes',
    name: 'Notes Summarizer Agent',
    shortName: 'Notes',
    role: 'High-Yield Study Synthesizer',
    description: 'Transforms complex topics and reading material into structured, revision-ready study notes and concept maps.',
    iconName: 'BookOpen',
    badgeColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800',
    suggestedPrompts: [
      'Create high-yield revision notes for Binary Search Trees and AVL Trees',
      'Summarize key principles of Multivariable Calculus: Stokes & Green Theorems',
      'Generate flashcard-ready bullet points for Operating Systems: Virtual Memory',
      'Synthesize key formulas and laws in Quantum Mechanics',
    ],
    systemPrompt: `You are the Student Life OS Notes Summarizer Agent.
Your mission is to synthesize textbook chapters and complex academic subjects into dense, high-yield study notes.
Structure your output with:
- 📌 Key Takeaways (Top 3-5 core concepts)
- 🧠 Conceptual Deep-Dive (organized by H2/H3 subtopics)
- 📐 Formulas & Formal Definitions (formatted in KaTeX $ and $$)
- ⚠️ Common Exam Pitfalls & Confusions
- 📝 Self-Test Review Questions at the end.`,
  },
  cheatsheet: {
    id: 'cheatsheet',
    name: 'Cheatsheet Generator Agent',
    shortName: 'Cheatsheet',
    role: 'Rapid Cramming & Formula Sheets',
    description: 'Generates ultra-compact, one-page revision sheets, equation tables, and high-density memory anchors.',
    iconName: 'Sparkles',
    badgeColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800',
    suggestedPrompts: [
      'Generate a 1-page formula cheatsheet for Differential Calculus',
      'Create an algorithm complexity cheatsheet with Best/Average/Worst cases',
      'Make a quick reference sheet for Linear Algebra vector spaces and eigenvalues',
      'Last-minute cram sheet for Data Structures sorting algorithms',
    ],
    systemPrompt: `You are the Student Life OS Cheatsheet Generator Agent.
Your mission is to produce ultra-compact, high-density cheatsheets optimized for last-minute exam revision.
Rules:
- Eliminate filler text; use compact Markdown tables, bullet lists, and KaTeX equations.
- Group formulas logically under bold headings.
- Include essential constants, edge cases, and runtime complexities.
- Format for maximum information density.`,
  },
  paper: {
    id: 'paper',
    name: 'Exam & Paper Prep Agent',
    shortName: 'Exam Prep',
    role: 'Mock Papers & Question Generator',
    description: 'Formulates realistic exam questions, marking schemes, blueprint breakdowns, and practice tests.',
    iconName: 'FileText',
    badgeColor: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800',
    suggestedPrompts: [
      'Generate 5 exam-level multiple choice questions on Graph Algorithms with solutions',
      'Create a 20-mark practice test for Multivariable Integration with marking scheme',
      'Give me 3 tough proof questions for Linear Algebra with full model answers',
      'Quiz me with a 10-minute short-answer exam on Computer Architecture',
    ],
    systemPrompt: `You are the Student Life OS Exam & Paper Prep Agent.
Your mission is to test students and prepare them for exams with rigorous questions matching university blueprints.
When asked to create questions:
1. Provide a mix of conceptual, numerical, and analytical problems.
2. Clearly indicate mark weightings (e.g. [5 Marks]).
3. Provide step-by-step marking rubrics and model solutions.
4. Point out what examiners look for to award full points.`,
  },
  assessment: {
    id: 'assessment',
    name: 'Assessment & Feedback Agent',
    shortName: 'Assessment',
    role: 'Answer Grader & Diagnostic Coach',
    description: 'Evaluates your answers to practice problems, pinpoints conceptual mistakes, and recommends targeted revisions.',
    iconName: 'CheckCircle2',
    badgeColor: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800',
    suggestedPrompts: [
      'Grade my explanation of Dijkstra algorithm and suggest improvements',
      'Review my derivation of the Cauchy-Riemann equations for errors',
      'Diagnose why I am struggling with Dynamic Programming state transitions',
      'Evaluate my answer to this thermodynamics question and score out of 10',
    ],
    systemPrompt: `You are the Student Life OS Assessment & Feedback Agent.
Your mission is to evaluate student-submitted answers with constructive, thorough academic feedback.
Your evaluation must include:
1. Score / Grade estimate (e.g. 8/10).
2. Strengths of the student\'s response.
3. Specific gaps, calculation errors, or misconceptions identified.
4. Correct model answer for comparison.
5. Actionable study steps to solidify the topic.`,
  },
  verifier: {
    id: 'verifier',
    name: 'Syllabus & Fact Verifier',
    shortName: 'Verifier',
    role: 'Grounding & Accuracy Checker',
    description: 'Fact-checks academic claims, validates theoretical statements against standard curricula, and flags common misconceptions.',
    iconName: 'ShieldCheck',
    badgeColor: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800',
    suggestedPrompts: [
      'Is it true that QuickSort is always faster than MergeSort? Verify.',
      'Check if my understanding of the Heisenberg Uncertainty Principle is accurate',
      'Verify whether P=NP has any accepted proofs or counter-examples',
      'Validate this mathematical property: det(A + B) = det(A) + det(B)',
    ],
    systemPrompt: `You are the Student Life OS Syllabus & Fact Verifier Agent.
Your mission is to verify factual accuracy and dispel common student misconceptions with academic precision.
State clearly:
- Verdict: [TRUE / FALSE / PARTIALLY TRUE / COMMON MISCONCEPTION]
- Rigorous explanation with standard textbook definitions.
- Counterexamples if a statement fails in specific edge cases.
- Trusted standard textbook references.`,
  },
};

export const DEFAULT_PROVIDERS: Record<LLMProviderId, LLMProviderConfig> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'High-speed, long-context reasoning with Gemini 2.5 Flash and Pro models.',
    apiKey: '',
    defaultModel: 'gemini-2.5-flash',
    availableModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    enabled: true,
    websiteUrl: 'https://aistudio.google.com/app/apikey',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'Industry-standard models including GPT-4o, GPT-4o-mini, and reasoning models.',
    apiKey: '',
    defaultModel: 'gpt-4o-mini',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'gpt-4-turbo'],
    enabled: false,
    websiteUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Nuanced academic writing and deep reasoning with Claude 3.7 & 3.5 Sonnet.',
    apiKey: '',
    defaultModel: 'claude-3-7-sonnet',
    availableModels: ['claude-3-7-sonnet', 'claude-3-5-sonnet', 'claude-3-5-haiku'],
    enabled: false,
    websiteUrl: 'https://console.anthropic.com/settings/keys',
  },
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    description: 'Ultra-fast low-latency LPU inference running open-weights Llama 3.3 models.',
    apiKey: '',
    defaultModel: 'llama-3.3-70b-versatile',
    availableModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    enabled: false,
    websiteUrl: 'https://console.groq.com/keys',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Advanced reasoning and mathematical deduction with DeepSeek-R1 and Chat.',
    apiKey: '',
    defaultModel: 'deepseek-chat',
    availableModels: ['deepseek-chat', 'deepseek-reasoner'],
    enabled: false,
    websiteUrl: 'https://platform.deepseek.com/api_keys',
  },
  custom: {
    id: 'custom',
    name: 'Custom / Local (Ollama)',
    description: 'Connect to self-hosted Ollama, vLLM, or OpenRouter with an OpenAI-compatible endpoint.',
    apiKey: '',
    defaultModel: 'llama3:8b',
    availableModels: ['llama3:8b', 'deepseek-r1:8b', 'mistral', 'qwen2.5:7b'],
    baseUrl: 'http://localhost:11434/v1',
    enabled: false,
    websiteUrl: 'https://ollama.com',
  },
};

interface LLMStoreState {
  providers: Record<LLMProviderId, LLMProviderConfig>;
  activeProviderId: LLMProviderId;
  activeModel: string;
  setApiKey: (providerId: LLMProviderId, apiKey: string) => void;
  setDefaultModel: (providerId: LLMProviderId, model: string) => void;
  setBaseUrl: (providerId: LLMProviderId, url: string) => void;
  setActiveProvider: (providerId: LLMProviderId, model?: string) => void;
  clearApiKey: (providerId: LLMProviderId) => void;
  getEffectiveKey: (providerId?: LLMProviderId) => string;
  hasConfiguredKey: () => boolean;
}

export const useLLMStore = create<LLMStoreState>()(
  persist(
    (set, get) => ({
      providers: DEFAULT_PROVIDERS,
      activeProviderId: 'gemini',
      activeModel: 'gemini-2.5-flash',

      setApiKey: (providerId, apiKey) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [providerId]: {
              ...state.providers[providerId],
              apiKey: apiKey.trim(),
              enabled: Boolean(apiKey.trim()),
            },
          },
        })),

      setDefaultModel: (providerId, model) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [providerId]: {
              ...state.providers[providerId],
              defaultModel: model,
            },
          },
          ...(state.activeProviderId === providerId ? { activeModel: model } : {}),
        })),

      setBaseUrl: (providerId, url) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [providerId]: {
              ...state.providers[providerId],
              baseUrl: url.trim(),
            },
          },
        })),

      setActiveProvider: (providerId, model) => {
        const provider = get().providers[providerId];
        set({
          activeProviderId: providerId,
          activeModel: model || provider.defaultModel || provider.availableModels[0],
        });
      },

      clearApiKey: (providerId) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [providerId]: {
              ...state.providers[providerId],
              apiKey: '',
              enabled: false,
            },
          },
        })),

      getEffectiveKey: (providerId) => {
        const id = providerId || get().activeProviderId;
        return get().providers[id]?.apiKey || '';
      },

      hasConfiguredKey: () => {
        const state = get();
        return Object.values(state.providers).some((p) => Boolean(p.apiKey && p.apiKey.trim().length > 0));
      },
    }),
    {
      name: 'slos_llm_settings_v1',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
    }
  )
);

/**
 * Validates a provider API key by making a minimal test call.
 */
export async function testProviderApiKey(
  providerId: LLMProviderId,
  apiKey: string,
  model?: string,
  customBaseUrl?: string
): Promise<{ success: boolean; message: string }> {
  if (!apiKey && providerId !== 'custom') {
    return { success: false, message: 'API key cannot be empty' };
  }

  try {
    if (providerId === 'gemini') {
      const selectedModel = model || 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg = errorData?.error?.message || `HTTP ${res.status}`;
        return { success: false, message: `Gemini API Error: ${msg}` };
      }
      return { success: true, message: 'Google Gemini key is active and verified!' };
    }

    if (providerId === 'groq') {
      const selectedModel = model || 'llama-3.3-70b-versatile';
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg = errorData?.error?.message || `HTTP ${res.status}`;
        return { success: false, message: `Groq API Error: ${msg}` };
      }
      return { success: true, message: 'Groq Cloud key is active and verified!' };
    }

    if (providerId === 'openai') {
      const selectedModel = model || 'gpt-4o-mini';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg = errorData?.error?.message || `HTTP ${res.status}`;
        return { success: false, message: `OpenAI API Error: ${msg}` };
      }
      return { success: true, message: 'OpenAI key is active and verified!' };
    }

    if (providerId === 'deepseek') {
      const selectedModel = model || 'deepseek-chat';
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg = errorData?.error?.message || `HTTP ${res.status}`;
        return { success: false, message: `DeepSeek API Error: ${msg}` };
      }
      return { success: true, message: 'DeepSeek key is active and verified!' };
    }

    if (providerId === 'custom') {
      const baseUrl = customBaseUrl || 'http://localhost:11434/v1';
      const endpoint = `${baseUrl.replace(/\/+$/, '')}/models`;
      const res = await fetch(endpoint, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });

      if (!res.ok) {
        return { success: false, message: `Custom endpoint returned status ${res.status}` };
      }
      return { success: true, message: 'Custom endpoint reachable and verified!' };
    }

    // Anthropic (CORS direct calls from browser may require proxy or extension)
    if (providerId === 'anthropic') {
      if (apiKey.startsWith('sk-ant-') && apiKey.length > 20) {
        return { success: true, message: 'Anthropic key format looks valid!' };
      }
      return { success: false, message: 'Invalid Anthropic key format (expected sk-ant-...)' };
    }

    return { success: true, message: 'Key saved successfully.' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Connection failed: ${errorMsg}` };
  }
}
