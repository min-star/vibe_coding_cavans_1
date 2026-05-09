import { env } from '../config/env.js';
import type { ModelRegistryItem } from '../types/providers.js';

function buildMockText(prompt: string, references: string[], quantity: number) {
  const outputs = Array.from({ length: quantity }, (_, index) => {
    return `Option ${index + 1}\n\nCreative concept: ${prompt}\n\nVisual cues: ${references.join(', ') || 'minimal clean layout'}\n\nSuggested direction: Use cinematic framing, crisp focal subject, and one strong emotional beat.`;
  });

  return outputs.join('\n\n---\n\n');
}

export async function generateTextWithModel(params: {
  model: ModelRegistryItem | undefined;
  prompt: string;
  references: string[];
  quantity: number;
}) {
  const { model, prompt, references, quantity } = params;

  if (!model || model.provider === 'mock') {
    return buildMockText(prompt, references, quantity);
  }

  if (model.provider === 'openai-compatible') {
    const apiKey = process.env[model.apiKeyEnv || 'OPENAI_API_KEY'] || env.openAiApiKey;
    const baseUrl = model.baseUrl || env.openAiBaseUrl;

    if (!apiKey) {
      throw new Error(`Missing API key for model ${model.id}`);
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model.modelName || model.id,
        messages: [
          {
            role: 'system',
            content:
              'You are a creative assistant for a visual canvas app. Generate concise, production-usable text results.'
          },
          {
            role: 'user',
            content: `Prompt:\n${prompt}\n\nReferences:\n${references.join('\n') || 'None'}\n\nGenerate ${quantity} option(s).`
          }
        ],
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM request failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  return buildMockText(prompt, references, quantity);
}
