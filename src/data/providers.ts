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
    description: "火山方舟 Agent Plan，适合长链路 Agent 与 Coding 工作流。",
    region: "中国大陆",
    badge: "置顶 · 已验证",
    docs: "https://www.volcengine.com/docs/82379/2165245",
    custom: { baseUrl: "https://ark.cn-beijing.volces.com/api/plan/v3", modelId: "doubao-seed-2.0-pro" },
  },
  {
    id: "byteplus-coding-plan",
    name: "BytePlus Coding Plan",
    description: "BytePlus 国际站 Coding Plan，套餐额度走专属 OpenAI 兼容网关。",
    region: "亚太国际",
    badge: "置顶 · Plan",
    docs: "https://docs.byteplus.com/en/docs/ModelArk/2277824",
    custom: { baseUrl: "https://ark.ap-southeast.bytepluses.com/api/coding/v3", modelId: "ark-code-latest" },
  },
  {
    id: "volcengine-modelark",
    name: "Volcengine ModelArk",
    description: "火山方舟按量 API，可接豆包及已开通的模型推理接入点。",
    region: "中国大陆",
    badge: "置顶 · PAYG",
    docs: "https://www.volcengine.com/docs/82379/1795150",
    custom: { baseUrl: "https://ark.cn-beijing.volces.com/api/v3", modelId: "doubao-seed-2-0-lite-260215" },
  },
  {
    id: "byteplus-modelark",
    name: "BytePlus ModelArk",
    description: "BytePlus ModelArk 按量 API，OpenAI SDK 兼容。",
    region: "亚太国际",
    badge: "置顶 · PAYG",
    docs: "https://docs.byteplus.com/en/docs/ModelArk/1330626",
    custom: { baseUrl: "https://ark.ap-southeast.bytepluses.com/api/v3", modelId: "seed-2-0-lite-260228" },
  },
  { id: "anthropic", name: "Anthropic", description: "Claude API，Prime Agent 原生 Messages API 支持。", envVar: "ANTHROPIC_API_KEY", region: "Global", docs: "https://docs.anthropic.com/en/api/getting-started" },
  { id: "openai", name: "OpenAI", description: "OpenAI Responses API 与主流 GPT 模型。", envVar: "OPENAI_API_KEY", region: "Global", docs: "https://platform.openai.com/docs/overview" },
  { id: "google", name: "Google Gemini", description: "Google AI Studio Gemini API。", envVar: "GEMINI_API_KEY", region: "Global", docs: "https://ai.google.dev/gemini-api/docs/api-key" },
  { id: "deepseek", name: "DeepSeek", description: "DeepSeek 官方 API，Prime Agent 内置模型目录。", envVar: "DEEPSEEK_API_KEY", region: "中国 / Global", docs: "https://api-docs.deepseek.com/" },
  { id: "openrouter", name: "OpenRouter", description: "用一个 Key 访问多家模型与路由策略。", envVar: "OPENROUTER_API_KEY", region: "Global", docs: "https://openrouter.ai/docs/quickstart" },
  { id: "xai", name: "xAI", description: "Grok 系列模型的官方 API。", envVar: "XAI_API_KEY", region: "Global", docs: "https://docs.x.ai/docs/overview" },
  { id: "groq", name: "Groq", description: "低延迟开源模型推理。", envVar: "GROQ_API_KEY", region: "Global", docs: "https://console.groq.com/docs/quickstart" },
  { id: "mistral", name: "Mistral AI", description: "Mistral 原生 Conversations API。", envVar: "MISTRAL_API_KEY", region: "EU / Global", docs: "https://docs.mistral.ai/getting-started/quickstart/" },
  { id: "cerebras", name: "Cerebras", description: "面向代码与推理的高速模型服务。", envVar: "CEREBRAS_API_KEY", region: "Global", docs: "https://inference-docs.cerebras.ai/quickstart" },
  { id: "zai", name: "Z.AI", description: "GLM 系列模型官方 API。", envVar: "ZAI_API_KEY", region: "中国 / Global", docs: "https://docs.z.ai/" },
  { id: "fireworks", name: "Fireworks AI", description: "多模型 Serverless 与专属推理。", envVar: "FIREWORKS_API_KEY", region: "Global", docs: "https://docs.fireworks.ai/getting-started/quickstart" },
  { id: "kimi-coding", name: "Kimi For Coding", description: "Kimi 面向代码 Agent 的模型入口。", envVar: "KIMI_API_KEY", region: "中国 / Global", docs: "https://platform.moonshot.cn/docs" },
  { id: "minimax", name: "MiniMax", description: "MiniMax 国际站模型 API。", envVar: "MINIMAX_API_KEY", region: "Global", docs: "https://platform.minimax.io/docs/guides/quickstart" },
  { id: "minimax-cn", name: "MiniMax China", description: "MiniMax 中国站模型 API。", envVar: "MINIMAX_CN_API_KEY", region: "中国大陆", docs: "https://platform.minimaxi.com/document" },
  { id: "huggingface", name: "Hugging Face", description: "Hugging Face Inference Providers。", envVar: "HF_TOKEN", region: "Global", docs: "https://huggingface.co/docs/inference-providers/index" },
  { id: "vercel-ai-gateway", name: "Vercel AI Gateway", description: "统一路由、可观测性与多 Provider 切换。", envVar: "AI_GATEWAY_API_KEY", region: "Global", docs: "https://vercel.com/docs/ai-gateway" },
  { id: "prime-inference", name: "Prime Inference", description: "Prime Intellect 官方 OpenAI 兼容推理服务。", envVar: "PRIME_API_KEY", region: "Global", docs: "https://docs.primeintellect.ai/inference/overview" },
  { id: "xiaomi", name: "Xiaomi MiMo", description: "小米 MiMo 模型官方 API。", envVar: "XIAOMI_API_KEY", region: "中国 / Global", docs: "https://platform.xiaomimimo.com/" },
];
