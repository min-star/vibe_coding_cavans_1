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

function buildMockVideoUrl(params: {
  prompt: string;
  references: string[];
  duration: number;
  aspectRatio: string;
  resolution: string;
}) {
  const { prompt, references, duration, aspectRatio, resolution } = params;
  const lines = [
    'TapNow Mock Video',
    `Prompt: ${prompt || 'No prompt'}`,
    `Ratio: ${aspectRatio}`,
    `Resolution: ${resolution}`,
    `Duration: ${duration}s`,
    `Refs: ${references.join(' | ') || 'No references'}`
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111111"/>
      <stop offset="100%" stop-color="#2f2f2f"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="40" fill="url(#bg)"/>
  <rect x="526" y="246" width="228" height="228" rx="34" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="16"/>
  <polygon points="615,290 615,430 725,360" fill="rgba(255,255,255,0.28)"/>
  ${lines
    .map(
      (line, index) =>
        `<text x="52" y="${112 + index * 48}" fill="#f8fafc" font-size="28">${escapeXml(line)}</text>`
    )
    .join('')}
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function extractUrl(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'url' in value) {
    const nested = (value as { url?: unknown }).url;
    return typeof nested === 'string' ? nested : undefined;
  }

  return undefined;
}

function extractVideoGenerationOutput(taskData: {
  content?: unknown;
  output?: unknown;
}) {
  let videoUrl: string | undefined;
  let posterUrl: string | undefined;

  if (Array.isArray(taskData.content)) {
    for (const item of taskData.content) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const typedItem = item as Record<string, unknown>;
      videoUrl ||= extractUrl(typedItem.video_url);
      posterUrl ||= extractUrl(typedItem.image_url);
    }
  } else if (taskData.content && typeof taskData.content === 'object') {
    const typedContent = taskData.content as Record<string, unknown>;
    videoUrl ||= extractUrl(typedContent.video_url);
    posterUrl ||= extractUrl(typedContent.image_url);
    videoUrl ||= extractUrl(typedContent.video);
    posterUrl ||= extractUrl(typedContent.poster);
  }

  if (taskData.output && typeof taskData.output === 'object') {
    const typedOutput = taskData.output as Record<string, unknown>;
    videoUrl ||= extractUrl(typedOutput.video_url);
    posterUrl ||= extractUrl(typedOutput.image_url);
    videoUrl ||= extractUrl(typedOutput.video);
    posterUrl ||= extractUrl(typedOutput.poster);
  }

  return {
    videoUrl,
    posterUrl
  };
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

export async function generateVideoWithModel(params: {
  model: ModelRegistryItem | undefined;
  prompt: string;
  references: string[];
  duration: number;
  aspectRatio: string;
  resolution: string;
  generationMode: string;
  audioEnabled: boolean;
  inputVideoUrl?: string;
  inputImageUrls?: string[];
}) {
  const {
    model,
    prompt,
    references,
    duration,
    aspectRatio,
    resolution,
    generationMode,
    audioEnabled,
    inputVideoUrl,
    inputImageUrls = []
  } = params;

  if (!model || model.provider === 'mock') {
    return {
      videoUrl: '',
      posterUrl: buildMockVideoUrl({
        prompt,
        references,
        duration,
        aspectRatio,
        resolution
      }),
      metadata: {
        generationMode,
        audioEnabled,
        inputVideoUrl,
        inputImageUrls
      }
    };
  }

  if (model.provider === 'openai-compatible') {
    const apiKey = process.env[model.apiKeyEnv || 'OPENAI_API_KEY'] || env.openAiApiKey;
    const baseUrl = normalizeOpenAiCompatibleBaseUrl(model.baseUrl || env.openAiBaseUrl);

    if (!apiKey) {
      throw new Error(`Missing API key for model ${model.id}`);
    }

    const endpoint = model.videoEndpoint || `${baseUrl}/contents/generations/tasks`;
    const content: Array<Record<string, unknown>> = [];

    if (generationMode === '首帧' || generationMode === '首尾帧') {
      const firstFrame = inputImageUrls[0] || inputVideoUrl;
      if (firstFrame) {
        content.push({
          type: 'image_url',
          role: 'first_frame',
          image_url: {
            url: firstFrame
          }
        });
      }
    }

    if (generationMode === '首尾帧') {
      const lastFrame = inputImageUrls[1] || inputImageUrls[0];
      if (lastFrame) {
        content.push({
          type: 'image_url',
          role: 'last_frame',
          image_url: {
            url: lastFrame
          }
        });
      }
    }

    content.push({
      type: 'text',
      text: prompt
    });

    const createResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model.modelName || model.id,
        content,
        resolution,
        ratio: aspectRatio,
        duration,
        generate_audio: audioEnabled
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Video request failed: ${createResponse.status} ${errorText}`);
    }

    const createData = (await createResponse.json()) as {
      id?: string;
      task_id?: string;
    };

    const taskId = createData.id || createData.task_id;
    if (!taskId) {
      throw new Error('Video request failed: missing task id');
    }

    for (let attempt = 0; attempt < 90; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const taskResponse = await fetch(`${endpoint}/${taskId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      });

      if (!taskResponse.ok) {
        const errorText = await taskResponse.text();
        throw new Error(`Video status request failed: ${taskResponse.status} ${errorText}`);
      }

      const taskData = (await taskResponse.json()) as {
        status?: string;
        state?: string;
        content?: unknown;
        output?: unknown;
        error?: { message?: string };
      };

      const status = String(taskData.status || taskData.state || '').toLowerCase();
      if (status.includes('failed')) {
        throw new Error(taskData.error?.message || 'Video generation failed');
      }

      const extracted = extractVideoGenerationOutput(taskData);

      if (extracted.videoUrl) {
        return {
          videoUrl: extracted.videoUrl,
          posterUrl: extracted.posterUrl,
          metadata: {
            taskId,
            generationMode,
            audioEnabled
          }
        };
      }
    }

    throw new Error('Video generation polling timed out');
  }

  return {
    videoUrl: '',
    posterUrl: buildMockVideoUrl({
      prompt,
      references,
      duration,
      aspectRatio,
      resolution
    }),
    metadata: {
      generationMode,
      audioEnabled
    }
  };
}
