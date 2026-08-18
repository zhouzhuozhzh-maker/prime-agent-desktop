export type ProviderDefinition = {
  id: string;
  name: string;
  description: string;
  envVar?: string;
  region: string;
  docs: string;
  badge?: string;
  custom?: {
    baseUrl: string;
    modelId: string;
  };
};

export const providers: ProviderDefinition[] = [
  {
    id: "volcengine-agent-plan",
    name: "Volcengine Agent Plan",
    description: "Volcengine's subscription plan for long-running agent and coding workflows.",
    region: "Mainland China",
    badge: "Priority · Verified",
    docs: "https://www.volcengine.com/docs/82379/2165245",
    custom: { baseUrl: "https://ark.cn-beijing.volces.com/api/plan/v3", modelId: "doubao-seed-2.0-pro" },
  },
  {
    id: "byteplus-coding-plan",
    name: "BytePlus Coding Plan",
    description: "BytePlus Coding Plan with a dedicated OpenAI-compatible subscription gateway.",
    region: "APAC",
    badge: "Priority · Plan",
    docs: "https://docs.byteplus.com/en/docs/ModelArk/2277824",
    custom: { baseUrl: "https://ark.ap-southeast.bytepluses.com/api/coding/v3", modelId: "ark-code-latest" },
  },
  {
    id: "volcengine-modelark",
    name: "Volcengine ModelArk",
    description: "Pay-as-you-go ModelArk API for Doubao and enabled model endpoints.",
    region: "Mainland China",
    badge: "Priority · PAYG",
    docs: "https://www.volcengine.com/docs/82379/1795150",
    custom: { baseUrl: "https://ark.cn-beijing.volces.com/api/v3", modelId: "doubao-seed-2-0-lite-260215" },
  },
  {
    id: "byteplus-modelark",
    name: "BytePlus ModelArk",
    description: "Pay-as-you-go BytePlus ModelArk API with OpenAI SDK compatibility.",
    region: "APAC",
    badge: "Priority · PAYG",
    docs: "https://docs.byteplus.com/en/docs/ModelArk/1330626",
    custom: { baseUrl: "https://ark.ap-southeast.bytepluses.com/api/v3", modelId: "seed-2-0-lite-260228" },
  },
  { id: "anthropic", name: "Anthropic", description: "Native Claude Messages API support in Prime Agent.", envVar: "ANTHROPIC_API_KEY", region: "Global", docs: "https://docs.anthropic.com/en/api/getting-started" },
  { id: "openai", name: "OpenAI", description: "OpenAI Responses API and the latest GPT models.", envVar: "OPENAI_API_KEY", region: "Global", docs: "https://platform.openai.com/docs/overview" },
  { id: "google", name: "Google Gemini", description: "Gemini API through Google AI Studio.", envVar: "GEMINI_API_KEY", region: "Global", docs: "https://ai.google.dev/gemini-api/docs/api-key" },
  { id: "deepseek", name: "DeepSeek", description: "Official DeepSeek API with Prime Agent's built-in model catalog.", envVar: "DEEPSEEK_API_KEY", region: "China / Global", docs: "https://api-docs.deepseek.com/" },
  { id: "openrouter", name: "OpenRouter", description: "Access multiple model vendors and routing policies with one key.", envVar: "OPENROUTER_API_KEY", region: "Global", docs: "https://openrouter.ai/docs/quickstart" },
  { id: "xai", name: "xAI", description: "Official API for the Grok model family.", envVar: "XAI_API_KEY", region: "Global", docs: "https://docs.x.ai/docs/overview" },
  { id: "groq", name: "Groq", description: "Low-latency inference for open models.", envVar: "GROQ_API_KEY", region: "Global", docs: "https://console.groq.com/docs/quickstart" },
  { id: "mistral", name: "Mistral AI", description: "Native Mistral Conversations API.", envVar: "MISTRAL_API_KEY", region: "EU / Global", docs: "https://docs.mistral.ai/getting-started/quickstart/" },
  { id: "cerebras", name: "Cerebras", description: "High-speed model service for code and reasoning.", envVar: "CEREBRAS_API_KEY", region: "Global", docs: "https://inference-docs.cerebras.ai/quickstart" },
  { id: "zai", name: "Z.AI", description: "Official API for the GLM model family.", envVar: "ZAI_API_KEY", region: "China / Global", docs: "https://docs.z.ai/" },
  { id: "fireworks", name: "Fireworks AI", description: "Serverless and dedicated inference across multiple models.", envVar: "FIREWORKS_API_KEY", region: "Global", docs: "https://docs.fireworks.ai/getting-started/quickstart" },
  { id: "kimi-coding", name: "Kimi For Coding", description: "Kimi's model endpoint optimized for coding agents.", envVar: "KIMI_API_KEY", region: "China / Global", docs: "https://platform.moonshot.cn/docs" },
  { id: "minimax", name: "MiniMax", description: "MiniMax global model API.", envVar: "MINIMAX_API_KEY", region: "Global", docs: "https://platform.minimax.io/docs/guides/quickstart" },
  { id: "minimax-cn", name: "MiniMax China", description: "MiniMax model API for Mainland China.", envVar: "MINIMAX_CN_API_KEY", region: "Mainland China", docs: "https://platform.minimaxi.com/document" },
  { id: "huggingface", name: "Hugging Face", description: "Hugging Face Inference Providers.", envVar: "HF_TOKEN", region: "Global", docs: "https://huggingface.co/docs/inference-providers/index" },
  { id: "vercel-ai-gateway", name: "Vercel AI Gateway", description: "Unified routing, observability, and provider switching.", envVar: "AI_GATEWAY_API_KEY", region: "Global", docs: "https://vercel.com/docs/ai-gateway" },
  { id: "prime-inference", name: "Prime Inference", description: "Prime Intellect's OpenAI-compatible inference service.", envVar: "PRIME_API_KEY", region: "Global", docs: "https://docs.primeintellect.ai/inference/overview" },
  { id: "xiaomi", name: "Xiaomi MiMo", description: "Official API for Xiaomi MiMo models.", envVar: "XIAOMI_API_KEY", region: "China / Global", docs: "https://platform.xiaomimimo.com/" },
];
