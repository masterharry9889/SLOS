import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LLMProviderId, LLMProviderConfig, AgentId, AgentDefinition } from '@/types';

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
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude models for writing and reasoning.',
    defaultModel: 'claude-3-5-sonnet-20241022',
    availableModels: ['claude-3-5-sonnet-20241022'],
    websiteUrl: 'https://console.anthropic.com/settings/keys',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models through the OpenAI API.',
    defaultModel: 'gpt-4o-mini',
    availableModels: ['gpt-4o-mini'],
    websiteUrl: 'https://platform.openai.com/api-keys',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini models through Google AI.',
    defaultModel: 'gemini-2.0-flash',
    availableModels: ['gemini-2.0-flash'],
    websiteUrl: 'https://aistudio.google.com/app/apikey',
  },
  grok: {
    id: 'grok',
    name: 'Grok',
    description: 'Grok models provided by xAI.',
    defaultModel: 'grok-3-mini',
    availableModels: ['grok-3-mini'],
    websiteUrl: 'https://console.x.ai/',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    description: 'Fast inference with Groq-hosted models.',
    defaultModel: 'llama-3.3-70b-versatile',
    availableModels: ['llama-3.3-70b-versatile'],
    websiteUrl: 'https://console.groq.com/keys',
  },
  local: {
    id: 'local',
    name: 'Local / Ollama',
    description: 'A local OpenAI-compatible inference endpoint.',
    defaultModel: 'llama3.2',
    availableModels: ['llama3.2'],
    baseUrl: 'http://localhost:11434/v1',
    websiteUrl: 'https://ollama.com',
  },
};

interface LLMStoreState {
  providers: Record<LLMProviderId, LLMProviderConfig>;
  activeProviderId: LLMProviderId;
  activeModel: string;
  setDefaultModel: (providerId: LLMProviderId, model: string) => void;
  setBaseUrl: (providerId: LLMProviderId, url: string) => void;
  setActiveProvider: (providerId: LLMProviderId, model?: string) => void;
}

export const useLLMStore = create<LLMStoreState>()(
  persist(
    (set, get) => ({
      providers: DEFAULT_PROVIDERS,
      activeProviderId: 'anthropic',
      activeModel: DEFAULT_PROVIDERS.anthropic.defaultModel,

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

    }),
    {
      name: 'slos_llm_settings_v1',
      version: 3,
      migrate: () => ({
        providers: DEFAULT_PROVIDERS,
        activeProviderId: 'anthropic' as LLMProviderId,
        activeModel: DEFAULT_PROVIDERS.anthropic.defaultModel,
      }),
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
    }
  )
);
