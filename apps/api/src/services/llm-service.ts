import { env } from '../config/env.js';
import type { ModelRegistryItem } from '../types/providers.js';

function normalizeOpenAiCompatibleBaseUrl(baseUrl: string) {
  return baseUrl
    .replace(/\/chat\/completions\/?$/i, '')
    .replace(/\/+$/g, '');
}

function buildMockText(prompt: string, references: string[], quantity: number) {
  const outputs = Array.from({ length: quantity }, (_, index) => {
    return `Option ${index + 1}\n\nCreative concept: ${prompt}\n\nVisual cues: ${references.join(', ') || 'minimal clean layout'}\n\nSuggested direction: Use cinematic framing, crisp focal subject, and one strong emotional beat.`;
  });

  return outputs.join('\n\n---\n\n');
}

function buildMockImageUrl(params: {
  prompt: string;
  references: string[];
  quantity: number;
  aspectRatio: string;
}) {
  const { prompt, references, quantity, aspectRatio } = params;
  const lines = [
    'TapNow Mock Image',
    `Prompt: ${prompt || 'No prompt'}`,
    `Ratio: ${aspectRatio}`,
    `Count: ${quantity}`,
    `Refs: ${references.join(' | ') || 'No references'}`
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="36" fill="url(#bg)"/>
  ${lines
    .map(
      (line, index) =>
        `<text x="52" y="${120 + index * 54}" fill="#f8fafc" font-size="32">${escapeXml(line)}</text>`
    )
    .join('')}
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
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
    const baseUrl = normalizeOpenAiCompatibleBaseUrl(model.baseUrl || env.openAiBaseUrl);

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

export async function generateImageWithModel(params: {
  model: ModelRegistryItem | undefined;
  prompt: string;
  references: string[];
  quantity: number;
  aspectRatio: string;
  inputImages?: string[];
}) {
  const { model, prompt, references, quantity, aspectRatio, inputImages = [] } = params;

  if (!model || model.provider === 'mock') {
    return {
      images: [
        {
          url: buildMockImageUrl({
            prompt,
            references,
            quantity,
            aspectRatio
          })
        }
      ]
    };
  }

  if (model.provider === 'openai-compatible') {
    const apiKey = process.env[model.apiKeyEnv || 'OPENAI_API_KEY'] || env.openAiApiKey;
    const baseUrl = normalizeOpenAiCompatibleBaseUrl(model.baseUrl || env.openAiBaseUrl);

    if (!apiKey) {
      throw new Error(`Missing API key for model ${model.id}`);
    }

    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model.modelName || model.id,
        prompt,
        image: inputImages.length > 0 ? inputImages : undefined,
        sequential_image_generation: quantity > 1 ? 'auto' : undefined,
        sequential_image_generation_options: quantity > 1 ? { max_images: quantity } : undefined,
        size: model.imageSize || '2K',
        output_format: model.outputFormat || 'png',
        watermark: model.watermark ?? false,
        response_format: 'url'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image request failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as {
      data?: Array<{
        url?: string;
        b64_json?: string;
      }>;
    };

    const images = (data.data || [])
      .map((item) => {
        if (item.url) {
          return { url: item.url };
        }
        if (item.b64_json) {
          return { url: `data:image/png;base64,${item.b64_json}` };
        }
        return null;
      })
      .filter(Boolean) as Array<{ url: string }>;

    if (images.length === 0) {
      throw new Error('Image request failed: empty image result');
    }

    return { images };
  }

  return {
    images: [
      {
        url: buildMockImageUrl({
          prompt,
          references,
          quantity,
          aspectRatio
        })
      }
    ]
  };
}
