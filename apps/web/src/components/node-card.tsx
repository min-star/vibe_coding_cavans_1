import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { CanvasNode, ModelOption } from '../types';

type NodeCardProps = {
  node: CanvasNode;
  selected?: boolean;
  onChange?: (node: CanvasNode) => void;
  onRun?: (node: CanvasNode) => void;
  onDelete?: (node: CanvasNode) => void;
  onVoiceInput?: (node: CanvasNode) => void;
  onImageUpload?: (node: CanvasNode, file: File) => void;
  onVideoUpload?: (node: CanvasNode, file: File) => void;
  modelOptions?: ModelOption[];
};

const textSizeOptions = [18, 22, 26, 32];
const colorOptions = ['#f5f5f5', '#facc15', '#93c5fd', '#fca5a5', '#86efac'];
const nodePlusSize = 44;
const nodeHoverZoneSize = 108;
const nodePlusOffset = -54;
const nodeHandleSize = 60;
const nodeHandleOffset = -62;
const imageAspectOptions: Array<'1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3'> = [
  '1:1',
  '4:3',
  '3:4',
  '16:9',
  '9:16',
  '3:2',
  '2:3'
];
const imageQuantityOptions = [1, 2, 3, 4, 5, 6];
const videoAspectOptions: Array<'16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9'> = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'];
const videoResolutionOptions: Array<'480p' | '720p' | '1080p'> = ['480p', '720p', '1080p'];
const videoDurationOptions = [5, 10];
const videoGenerationModes: Array<'文生视频' | '首帧' | '首尾帧'> = ['文生视频', '首帧', '首尾帧'];

function NodeCardImpl({
  node,
  selected = false,
  onChange,
  onRun,
  onDelete,
  onVoiceInput,
  onImageUpload,
  onVideoUpload,
  modelOptions = []
}: NodeCardProps) {
  const outputText = node.output?.text ? String(node.output.text) : undefined;
  const outputImage =
    node.output?.thumbnailUrl || node.output?.fileUrl || node.output?.inputImageUrl || node.data.previewUrl;
  const inputImage = node.output?.inputImageUrl || node.data.previewUrl;
  const imageReferenceUrls = Array.isArray(node.data.referenceImageUrls)
    ? node.data.referenceImageUrls.map((item) => String(item))
    : typeof node.data.referenceImageUrl === 'string'
      ? [node.data.referenceImageUrl]
      : [];
  const isText = node.type === 'text';
  const isImageUpload = node.type === 'image_upload';
  const isImageUpscale = node.type === 'image_upscale';
  const isVideo = node.type === 'video_generate';
  const isImageNode = isImageUpload || isImageUpscale;
  const outputVideo =
    node.output?.fileUrl && String(node.output.fileUrl).match(/\.(mp4|webm|ogg)$/i)
      ? String(node.output.fileUrl)
      : typeof node.data.videoPreviewUrl === 'string' && node.data.videoPreviewUrl.match(/\.(mp4|webm|ogg)$/i)
        ? String(node.data.videoPreviewUrl)
        : node.data.previewUrl && String(node.data.previewUrl).match(/\.(mp4|webm|ogg)$/i)
          ? String(node.data.previewUrl)
          : undefined;
  const outputVideoPoster =
    typeof node.output?.thumbnailUrl === 'string'
      ? String(node.output.thumbnailUrl)
      : typeof node.data.videoPreviewUrl === 'string'
        ? String(node.data.videoPreviewUrl)
        : undefined;
  const referenceImageUrl =
    typeof node.data.referenceImageUrl === 'string'
      ? node.data.referenceImageUrl
      : typeof node.data.previewUrl === 'string' && node.data.previewUrl.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i)
        ? node.data.previewUrl
        : undefined;
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [inputPrompt, setInputPrompt] = useState(String(node.data.prompt || ''));
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [videoSettingsOpen, setVideoSettingsOpen] = useState(false);
  const [fakeProgress, setFakeProgress] = useState(12);
  const displayText = outputText || String(node.data.prompt || '');

  function handleHoverStart() {
    setHovered(true);
  }

  function handleHoverEnd() {
    setHovered(false);
  }

  useEffect(() => {
    setInputPrompt(String(node.data.prompt || ''));
  }, [node.data.prompt, node.id]);

  useEffect(() => {
    if (
      !isText ||
      !isInlineEditing ||
      !editorRef.current ||
      document.activeElement === editorRef.current
    ) {
      return;
    }
    editorRef.current.innerText = inputPrompt;
    editorRef.current.focus();
  }, [inputPrompt, isInlineEditing, isText]);

  useEffect(() => {
    if (node.status !== 'pending' && node.status !== 'running') {
      setFakeProgress(12);
      return;
    }

    const timer = window.setInterval(() => {
      setFakeProgress((current) => {
        if (current >= 92) {
          return current;
        }
        return current + Math.max(2, Math.round((100 - current) / 10));
      });
    }, 240);

    return () => window.clearInterval(timer);
  }, [node.status]);

  function commitPrompt(nextPrompt: string) {
    if (!onChange) {
      return;
    }
    onChange({
      ...node,
      data: {
        ...node.data,
        prompt: nextPrompt
      }
    });
  }

  const textStyle = useMemo(
    () => ({
      color: String(node.data.textColor || '#f5f5f5'),
      fontSize: Number(node.data.textSize || 26),
      fontWeight: node.data.bold ? 700 : 400,
      fontStyle: node.data.italic ? 'italic' : 'normal'
    }),
    [node.data.bold, node.data.italic, node.data.textColor, node.data.textSize]
  );
  const availableModels =
    modelOptions.length > 0
      ? modelOptions
      : isText
        ? [{ id: 'mock-text', label: 'Mock Text Model', provider: 'mock', taskTypes: ['text_generate'] }]
        : isVideo
          ? [{ id: 'mock-video', label: 'Mock Video Model', provider: 'mock', taskTypes: ['video_generate'] }]
        : [{ id: 'mock-image', label: 'Mock Image Model', provider: 'mock', taskTypes: ['image_generate'] }];

  useEffect(() => {
    if (!selected) {
      setVideoSettingsOpen(false);
    }
  }, [selected]);

  if (isText) {
    return (
      <div style={textNodeWrapStyle}>
        <Handle
          type="target"
          position={Position.Left}
          style={textHandleStyle('left', hovered)}
          onMouseEnter={handleHoverStart}
          onMouseLeave={handleHoverEnd}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={textHandleStyle('right', hovered)}
          onMouseEnter={handleHoverStart}
          onMouseLeave={handleHoverEnd}
        />
        <HoverZone side="left" onEnter={handleHoverStart} onLeave={handleHoverEnd} />
        <HoverZone side="right" onEnter={handleHoverStart} onLeave={handleHoverEnd} />
        {hovered ? <SidePlus side="left" onEnter={handleHoverStart} onLeave={handleHoverEnd} /> : null}
        {hovered ? <SidePlus side="right" onEnter={handleHoverStart} onLeave={handleHoverEnd} /> : null}

        <div
          onMouseEnter={handleHoverStart}
          onMouseLeave={handleHoverEnd}
        >
          <div style={textNodeHeaderStyle} className="node-drag-handle">
            <span style={{ opacity: 0.8 }}>≡</span>
            <span>{node.data.label || 'Text'}</span>
          </div>

          <div
            className="node-drag-handle"
            style={{
              ...textNodeBoxStyle,
              borderColor: selected ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.12)'
            }}
          >
            {isInlineEditing ? (
              <div
                ref={editorRef}
                className="nodrag nopan"
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                style={{
                  ...textPromptStyle,
                  ...textStyle
                }}
                onFocus={() => setIsEditing(true)}
                onInput={(event) => {
                  const nextPrompt = event.currentTarget.innerText;
                  setInputPrompt(nextPrompt);
                }}
                onBlur={(event) => {
                  const nextPrompt = event.currentTarget.innerText;
                  setInputPrompt(nextPrompt);
                  commitPrompt(nextPrompt);
                  setIsEditing(false);
                  setIsInlineEditing(false);
                }}
              >
                {inputPrompt || '双击开始编辑...'}
              </div>
            ) : (
              <div
                className="nodrag nopan"
                style={{
                  ...textPromptStyle,
                  ...textStyle
                }}
                onDoubleClick={() => {
                  setIsInlineEditing(true);
                  setInputPrompt(String(node.data.prompt || inputPrompt || ''));
                }}
              >
                {displayText || '双击开始编辑...'}
              </div>
            )}
            {node.status === 'pending' || node.status === 'running' ? (
              <div style={loadingOverlayStyle} className="nodrag nopan">
                <div style={loadingTitleStyle}>模型生成中...</div>
                <div style={loadingBarTrackStyle}>
                  <div style={{ ...loadingBarFillStyle, width: `${fakeProgress}%` }} />
                </div>
                <div style={loadingHintStyle}>{`${fakeProgress}%`}</div>
              </div>
            ) : null}
          </div>
        </div>

        {selected ? (
          <>
            <div style={toolbarStyle} className="nodrag nopan">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  className="nodrag nopan"
                  type="button"
                  style={{
                    ...toolbarColorDotStyle,
                    background: color,
                    outline: String(node.data.textColor || '#f5f5f5') === color ? '2px solid #ffffff' : 'none'
                  }}
                  onClick={() =>
                    onChange?.({
                      ...node,
                      data: {
                        ...node.data,
                        textColor: color
                      }
                    })
                  }
                />
              ))}

              {textSizeOptions.map((size) => (
                <button
                  key={size}
                  className="nodrag nopan"
                  type="button"
                  style={{
                    ...toolbarActionStyle,
                    background: Number(node.data.textSize || 26) === size ? 'rgba(255,255,255,0.12)' : 'transparent'
                  }}
                  onClick={() =>
                    onChange?.({
                      ...node,
                      data: {
                        ...node.data,
                        textSize: size
                      }
                    })
                  }
                >
                  {size}
                </button>
              ))}

              <button
                className="nodrag nopan"
                type="button"
                style={{
                  ...toolbarActionStyle,
                  background: node.data.bold ? 'rgba(255,255,255,0.12)' : 'transparent'
                }}
                onClick={() =>
                  onChange?.({
                    ...node,
                    data: {
                      ...node.data,
                      bold: !node.data.bold
                    }
                  })
                }
              >
                B
              </button>

              <button
                className="nodrag nopan"
                type="button"
                style={{
                  ...toolbarActionStyle,
                  background: node.data.italic ? 'rgba(255,255,255,0.12)' : 'transparent'
                }}
                onClick={() =>
                  onChange?.({
                    ...node,
                    data: {
                      ...node.data,
                      italic: !node.data.italic
                    }
                  })
                }
              >
                I
              </button>
            </div>

            <div style={generatorPanelStyle} className="nodrag nopan">
              <textarea
                className="nodrag nopan"
                value={inputPrompt}
                onChange={(event) => {
                  const nextPrompt = event.target.value;
                  setInputPrompt(nextPrompt);
                }}
                onBlur={() => commitPrompt(inputPrompt)}
                placeholder="描述任何你想要生成的内容"
                rows={4}
                style={generatorTextareaStyle}
              />

              <div style={generatorFooterStyle}>
                <select
                  className="nodrag nopan"
                  value={String(node.data.model || availableModels[0]?.id || 'mock-text')}
                  onChange={(event) =>
                    onChange?.({
                      ...node,
                      data: {
                        ...node.data,
                        model: event.target.value
                      }
                    })
                  }
                  style={generatorSelectStyle}
                >
                  {availableModels.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div style={generatorActionsStyle}>
                  <button className="nodrag nopan" type="button" style={ghostChipStyle} onClick={() => onVoiceInput?.(node)}>
                    🎙
                  </button>
                  <button
                    className="nodrag nopan"
                    type="button"
                    style={ghostChipStyle}
                    onClick={() =>
                      onChange?.({
                        ...node,
                        data: {
                          ...node.data,
                          quantity: Math.max(1, Number(node.data.quantity || 1) + 1)
                        }
                      })
                    }
                  >
                    {`${Number(node.data.quantity || 1)}x`}
                  </button>
                  <button className="nodrag nopan" type="button" style={ghostChipStyle}>
                    ⤢
                  </button>
                  <button
                    className="nodrag nopan"
                    type="button"
                    style={submitButtonStyle}
                    disabled={node.status === 'pending' || node.status === 'running'}
                    onClick={() => {
                      commitPrompt(inputPrompt);
                      setIsEditing(false);
                      onRun?.({
                        ...node,
                        data: {
                          ...node.data,
                          prompt: inputPrompt
                        }
                      });
                    }}
                  >
                    {node.status === 'pending' || node.status === 'running' ? '生成中...' : '生成'}
                  </button>
                  <button className="nodrag nopan" type="button" style={deleteChipStyle} onClick={() => onDelete?.(node)}>
                    删除
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  if (isImageNode) {
    return (
      <div style={imageNodeWrapStyle}>
        <Handle
          type="target"
          position={Position.Left}
          style={textHandleStyle('left', hovered)}
          onMouseEnter={handleHoverStart}
          onMouseLeave={handleHoverEnd}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={textHandleStyle('right', hovered)}
          onMouseEnter={handleHoverStart}
          onMouseLeave={handleHoverEnd}
        />
        <HoverZone side="left" onEnter={handleHoverStart} onLeave={handleHoverEnd} />
        <HoverZone side="right" onEnter={handleHoverStart} onLeave={handleHoverEnd} />
        {hovered ? <SidePlus side="left" onEnter={handleHoverStart} onLeave={handleHoverEnd} /> : null}
        {hovered ? <SidePlus side="right" onEnter={handleHoverStart} onLeave={handleHoverEnd} /> : null}

        <div
          onMouseEnter={handleHoverStart}
          onMouseLeave={handleHoverEnd}
        >
          <div style={imageNodeHeaderStyle} className="node-drag-handle">
            <span style={{ opacity: 0.8 }}>◫</span>
            <span>{node.data.label || 'Image'}</span>
          </div>

          {selected ? (
            <div style={imageTopToolbarStyle} className="nodrag nopan">
              <label style={uploadButtonStyle} className="nodrag nopan">
                <span>⇧ 上传</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      onImageUpload?.(node, file);
                      event.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          ) : null}

          <div
            className="node-drag-handle"
            style={{
              ...imageNodeBoxStyle,
              borderColor: selected ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.12)'
            }}
          >
            {typeof outputImage === 'string' ? (
              <img
                src={outputImage}
                alt="node image"
                style={imagePreviewStyle}
              />
            ) : (
              <div style={imageEmptyStyle}>🖼</div>
            )}
            {node.status === 'pending' || node.status === 'running' ? (
              <div style={loadingOverlayStyle} className="nodrag nopan">
                <div style={loadingTitleStyle}>图像生成中...</div>
                <div style={loadingBarTrackStyle}>
                  <div style={{ ...loadingBarFillStyle, width: `${fakeProgress}%` }} />
                </div>
                <div style={loadingHintStyle}>{`${fakeProgress}%`}</div>
              </div>
            ) : null}
          </div>
        </div>

        {selected ? (
            <div style={imageBottomPanelStyle} className="nodrag nopan">
              <div style={imageBottomTopRowStyle}>
                <label style={ghostSquareChipStyle} className="nodrag nopan">
                <span>⇧</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      onImageUpload?.(node, file);
                      event.target.value = '';
                    }
                    }}
                  />
                </label>
                {imageReferenceUrls.length > 0 ? (
                  <div style={imageReferenceThumbListStyle}>
                    {imageReferenceUrls.map((url, index) => (
                      <div key={`${url}-${index}`} style={imageReferenceThumbWrapStyle}>
                        <img src={url} alt="reference" style={imageReferenceThumbStyle} />
                        <button
                          type="button"
                          className="nodrag nopan"
                          style={thumbDeleteButtonStyle}
                          onClick={() => {
                            const nextUrls = imageReferenceUrls.filter((_, itemIndex) => itemIndex !== index);
                            const currentIds = Array.isArray(node.data.referenceImageAssetIds)
                              ? node.data.referenceImageAssetIds.map((item) => String(item))
                              : [];
                            const nextIds = currentIds.filter((_, itemIndex) => itemIndex !== index);
                            onChange?.({
                              ...node,
                              data: {
                                ...node.data,
                                referenceImageUrls: nextUrls,
                                referenceImageUrl: nextUrls[0],
                                referenceImageAssetIds: nextIds,
                                referenceImageAssetId: nextIds[0]
                              }
                            });
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

            <textarea
              className="nodrag nopan"
              value={inputPrompt}
              onChange={(event) => {
                const nextPrompt = event.target.value;
                setInputPrompt(nextPrompt);
              }}
              onBlur={() => commitPrompt(inputPrompt)}
              placeholder="描述任何你想要生成的内容"
              rows={4}
              style={generatorTextareaStyle}
            />

            <div style={generatorFooterStyle}>
              <div style={imagePanelMetaStyle}>
                <select
                  className="nodrag nopan"
                  value={String(node.data.model || availableModels[0]?.id || 'mock-image')}
                  onChange={(event) =>
                    onChange?.({
                      ...node,
                      data: {
                        ...node.data,
                        model: event.target.value
                      }
                    })
                  }
                  style={generatorSelectStyle}
                >
                  {availableModels.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  className="nodrag nopan"
                  value={String(node.data.aspectRatio || '1:1')}
                  onChange={(event) =>
                    onChange?.({
                      ...node,
                      data: {
                        ...node.data,
                        aspectRatio: event.target.value as CanvasNode['data']['aspectRatio']
                      }
                    })
                  }
                  style={generatorSelectStyle}
                >
                  {imageAspectOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div style={generatorActionsStyle}>
                <button className="nodrag nopan" type="button" style={ghostChipStyle} onClick={() => onVoiceInput?.(node)}>
                  🎙
                </button>
                <select
                  className="nodrag nopan"
                  value={String(node.data.quantity || 1)}
                  onChange={(event) =>
                    onChange?.({
                      ...node,
                      data: {
                        ...node.data,
                        quantity: Number(event.target.value)
                      }
                    })
                  }
                  style={quantitySelectStyle}
                >
                  {imageQuantityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <button
                  className="nodrag nopan"
                  type="button"
                  style={submitButtonStyle}
                  disabled={node.status === 'pending' || node.status === 'running'}
                  onClick={() => {
                    commitPrompt(inputPrompt);
                    onRun?.({
                      ...node,
                      data: {
                        ...node.data,
                        prompt: inputPrompt
                      }
                    });
                  }}
                >
                  {node.status === 'pending' || node.status === 'running' ? '生成中...' : '生成'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (isVideo) {
    return (
      <div style={videoNodeWrapStyle}>
        <Handle
          type="target"
          position={Position.Left}
          style={textHandleStyle('left', hovered)}
          onMouseEnter={handleHoverStart}
          onMouseLeave={handleHoverEnd}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={textHandleStyle('right', hovered)}
          onMouseEnter={handleHoverStart}
          onMouseLeave={handleHoverEnd}
        />
        <HoverZone side="left" onEnter={handleHoverStart} onLeave={handleHoverEnd} />
        <HoverZone side="right" onEnter={handleHoverStart} onLeave={handleHoverEnd} />
        {hovered ? <SidePlus side="left" onEnter={handleHoverStart} onLeave={handleHoverEnd} /> : null}
        {hovered ? <SidePlus side="right" onEnter={handleHoverStart} onLeave={handleHoverEnd} /> : null}

        <div onMouseEnter={handleHoverStart} onMouseLeave={handleHoverEnd}>
          <div style={imageNodeHeaderStyle} className="node-drag-handle">
            <span style={{ opacity: 0.8 }}>▣</span>
            <span>{node.data.label || 'Video'}</span>
          </div>

          {selected ? (
            <div style={videoTopToolbarStyle} className="nodrag nopan">
              <label style={uploadButtonStyle} className="nodrag nopan">
                <span>⇧ 上传</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      onImageUpload?.(node, file);
                      event.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          ) : null}

          <div
            className="node-drag-handle"
            style={{
              ...videoNodeBoxStyle,
              borderColor: selected ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.12)'
            }}
          >
            {outputVideo ? (
              <video src={outputVideo} controls style={videoPreviewStyle} />
            ) : outputVideoPoster ? (
              <img src={outputVideoPoster} alt="video source" style={videoImagePreviewStyle} />
            ) : (
              <div style={videoEmptyStyle}>
                <div style={videoPlayIconStyle}>▶</div>
              </div>
            )}
            {node.status === 'pending' || node.status === 'running' ? (
              <div style={loadingOverlayStyle} className="nodrag nopan">
                <div style={loadingTitleStyle}>视频生成中...</div>
                <div style={loadingBarTrackStyle}>
                  <div style={{ ...loadingBarFillStyle, width: `${fakeProgress}%` }} />
                </div>
                <div style={loadingHintStyle}>{`${fakeProgress}%`}</div>
              </div>
            ) : null}
          </div>
        </div>

        {selected ? (
          <>
            {videoSettingsOpen ? (
              <div style={videoSettingsPopoverStyle} className="nodrag nopan">
                <div style={videoSettingsBlockStyle}>
                  <div style={videoSettingsLabelStyle}>生成方式</div>
                  <div style={segmentedWrapStyle}>
                    {videoGenerationModes.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className="nodrag nopan"
                        style={segmentedButtonStyle(String(node.data.generationMode || '文生视频') === mode)}
                        onClick={() =>
                          onChange?.({
                            ...node,
                            data: {
                              ...node.data,
                              generationMode: mode
                            }
                          })
                        }
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={videoSettingsBlockStyle}>
                  <div style={videoSettingsLabelStyle}>比例</div>
                  <div style={videoRatioGridStyle}>
                    {videoAspectOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="nodrag nopan"
                        style={videoRatioButtonStyle(String(node.data.aspectRatio || '16:9') === option)}
                        onClick={() =>
                          onChange?.({
                            ...node,
                            data: {
                              ...node.data,
                              aspectRatio: option
                            }
                          })
                        }
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={videoSettingsBlockStyle}>
                  <div style={videoSettingsLabelStyle}>清晰度</div>
                  <div style={segmentedWrapStyle}>
                    {videoResolutionOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="nodrag nopan"
                        style={segmentedButtonStyle(String(node.data.resolution || '1080p') === option)}
                        onClick={() =>
                          onChange?.({
                            ...node,
                            data: {
                              ...node.data,
                              resolution: option
                            }
                          })
                        }
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={videoSettingsBlockStyle}>
                  <div style={videoSettingsLabelStyle}>生成时长</div>
                  <div style={segmentedWrapStyle}>
                    {videoDurationOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="nodrag nopan"
                        style={segmentedButtonStyle(Number(node.data.duration || 5) === option)}
                        onClick={() =>
                          onChange?.({
                            ...node,
                            data: {
                              ...node.data,
                              duration: option
                            }
                          })
                        }
                      >
                        {`${option}s`}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={videoSettingsBlockStyle}>
                  <div style={videoSettingsLabelStyle}>生成音频</div>
                  <div style={segmentedWrapStyle}>
                    {[true, false].map((option) => (
                      <button
                        key={String(option)}
                        type="button"
                        className="nodrag nopan"
                        style={segmentedButtonStyle(Boolean(node.data.audioEnabled ?? true) === option)}
                        onClick={() =>
                          onChange?.({
                            ...node,
                            data: {
                              ...node.data,
                              audioEnabled: option
                            }
                          })
                        }
                      >
                        {option ? '开启' : '关闭'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div style={videoBottomPanelStyle} className="nodrag nopan">
              <div style={videoBottomTopRowStyle}>
                <label style={ghostSquareChipStyle} className="nodrag nopan">
                  <span>⇧</span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        onImageUpload?.(node, file);
                        event.target.value = '';
                      }
                    }}
                  />
                </label>
                {referenceImageUrl ? (
                  <div style={videoReferenceThumbWrapStyle}>
                    <img src={referenceImageUrl} alt="reference" style={videoReferenceThumbStyle} />
                  </div>
                ) : null}
              </div>

              <textarea
                className="nodrag nopan"
                value={inputPrompt}
                onChange={(event) => {
                  const nextPrompt = event.target.value;
                  setInputPrompt(nextPrompt);
                }}
                onBlur={() => commitPrompt(inputPrompt)}
                placeholder="描述任何你想要生成的内容"
                rows={4}
                style={videoTextareaStyle}
              />

              <div style={videoBottomFooterStyle}>
                <div style={videoMetaLeftStyle}>
                  <select
                    className="nodrag nopan"
                    value={String(node.data.model || availableModels[0]?.id || 'mock-video')}
                    onChange={(event) =>
                      onChange?.({
                        ...node,
                        data: {
                          ...node.data,
                          model: event.target.value
                        }
                      })
                    }
                    style={videoFooterSelectStyle}
                  >
                    {availableModels.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="nodrag nopan"
                    style={videoSettingSummaryChipStyle}
                    onClick={() => setVideoSettingsOpen((current) => !current)}
                  >
                    {`${String(node.data.generationMode || '文生视频')} · ${String(node.data.aspectRatio || '16:9')} · ${String(node.data.resolution || '1080p')} · ${Number(node.data.duration || 5)}s · ${Boolean(node.data.audioEnabled ?? true) ? '🔊' : '🔇'}`}
                  </button>
                </div>

                <div style={videoActionsStyle}>
                  <button className="nodrag nopan" type="button" style={ghostChipStyle} onClick={() => onVoiceInput?.(node)}>
                    🎙
                  </button>
                  <select
                    className="nodrag nopan"
                    value={String(node.data.quantity || 1)}
                    onChange={(event) =>
                      onChange?.({
                        ...node,
                        data: {
                          ...node.data,
                          quantity: Number(event.target.value)
                        }
                      })
                    }
                    style={quantitySelectStyle}
                  >
                    {imageQuantityOptions.map((option) => (
                      <option key={option} value={option}>
                        {`${option}x`}
                      </option>
                    ))}
                  </select>
                  <button
                    className="nodrag nopan"
                    type="button"
                    style={submitButtonStyle}
                    disabled={node.status === 'pending' || node.status === 'running'}
                    onClick={() => {
                      commitPrompt(inputPrompt);
                      onRun?.({
                        ...node,
                        data: {
                          ...node.data,
                          prompt: inputPrompt
                        }
                      });
                    }}
                  >
                    {node.status === 'pending' || node.status === 'running' ? '生成中...' : '生成'}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div
      style={{
        minWidth: 260,
        border: '1px solid #94a3b8',
        borderRadius: 20,
        background: '#ffffff',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
        overflow: 'hidden',
        pointerEvents: 'all'
      }}
    >
      <Handle type="target" position={Position.Left} style={defaultHandleStyle('left')} />
      <Handle type="source" position={Position.Right} style={defaultHandleStyle('right')} />
      <div
        style={{
          padding: '12px 16px',
          background: '#0f172a',
          color: '#f8fafc',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span>{node.data.label || node.type}</span>
        <span style={{ fontSize: 11, opacity: 0.8 }}>{node.status}</span>
      </div>
      <div style={{ padding: 14, fontSize: 13, display: 'grid', gap: 10 }}>
        {node.data.prompt ? <div>Prompt: {String(node.data.prompt)}</div> : null}
        {isImageUpload && typeof outputImage === 'string' ? (
          <div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>Uploaded Image</div>
            <img src={outputImage} alt="uploaded asset" style={{ width: '100%', borderRadius: 12 }} />
          </div>
        ) : null}
        {isImageUpscale && typeof inputImage === 'string' && inputImage ? (
          <div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>Input Image</div>
            <img src={inputImage} alt="input preview" style={{ width: '100%', borderRadius: 12 }} />
          </div>
        ) : null}
        {typeof outputImage === 'string' && outputImage.endsWith('.svg') ? (
          <div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>
              {isImageUpscale ? 'Upscale Result' : 'Output'}
            </div>
            <img src={outputImage} alt="node output" style={{ width: '100%', borderRadius: 12 }} />
          </div>
        ) : null}
        {isVideo && typeof node.output?.fileUrl === 'string' ? (
          <div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>Video Output</div>
            <video src={String(node.output.fileUrl)} controls style={{ width: '100%', borderRadius: 12 }} />
          </div>
        ) : null}
        {outputText ? (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{outputText}</pre>
        ) : null}
      </div>
    </div>
  );
}

export const NodeCard = memo(NodeCardImpl);

function HoverZone({
  side,
  onEnter,
  onLeave
}: {
  side: 'left' | 'right';
  onEnter: () => void;
  onLeave: () => void;
}) {
  const hoverZoneOffset = nodePlusOffset - (nodeHoverZoneSize - nodePlusSize) / 2;

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        position: 'absolute',
        top: '50%',
        [side]: hoverZoneOffset,
        transform: 'translateY(-50%)',
        width: nodeHoverZoneSize,
        height: nodeHoverZoneSize,
        borderRadius: 999,
        background: 'transparent',
        zIndex: 4
      }}
    />
  );
}

function SidePlus({
  side,
  onEnter,
  onLeave
}: {
  side: 'left' | 'right';
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        position: 'absolute',
        top: '50%',
        [side]: nodePlusOffset,
        transform: 'translateY(-50%)',
        width: nodePlusSize,
        height: nodePlusSize,
        borderRadius: 999,
        border: '2px solid rgba(192,192,192,0.38)',
        background: 'rgba(192,192,192,0.08)',
        color: '#c0c0c0',
        display: 'grid',
        placeItems: 'center',
        fontSize: 32,
        lineHeight: 1,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        zIndex: 8
      }}
    >
      +
    </div>
  );
}

function defaultHandleStyle(side: 'left' | 'right') {
  return {
    width: 12,
    height: 12,
    borderRadius: 999,
    border: '2px solid #0f172a',
    background: '#ffffff',
    [side]: -7
  } as const;
}

function textHandleStyle(side: 'left' | 'right', visible: boolean) {
  return {
    width: nodeHandleSize,
    height: nodeHandleSize,
    borderRadius: 999,
    border: '2px solid transparent',
    background: 'transparent',
    [side]: nodeHandleOffset,
    top: '50%',
    transform: 'translateY(-50%)',
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? 'auto' : 'none',
    zIndex: 5
  } as const;
}

function segmentedButtonStyle(active: boolean) {
  return {
    minHeight: 42,
    borderRadius: 14,
    border: 0,
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: active ? '#f5f5f5' : 'rgba(255,255,255,0.5)',
    cursor: 'pointer'
  } as const;
}

function videoRatioButtonStyle(active: boolean) {
  return {
    minHeight: 52,
    borderRadius: 14,
    border: 0,
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: active ? '#f5f5f5' : 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: 14
  } as const;
}

const textNodeWrapStyle = {
  position: 'relative',
  width: 480,
  color: '#f5f5f5',
  pointerEvents: 'all',
  overflow: 'visible'
} as const;

const imageNodeWrapStyle = {
  position: 'relative',
  width: 480,
  color: '#f5f5f5',
  pointerEvents: 'all',
  overflow: 'visible'
} as const;

const videoNodeWrapStyle = {
  position: 'relative',
  width: 1120,
  color: '#f5f5f5',
  pointerEvents: 'all',
  overflow: 'visible'
} as const;

const textNodeHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  margin: '0 0 14px 14px',
  fontSize: 16,
  color: 'rgba(255,255,255,0.88)'
} as const;

const imageNodeHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '0 0 14px 14px',
  fontSize: 16,
  color: 'rgba(255,255,255,0.88)'
} as const;

const textNodeBoxStyle = {
  width: '100%',
  height: 470,
  borderRadius: 30,
  background: '#222222',
  border: '1px solid rgba(255,255,255,0.15)',
  padding: 28,
  boxShadow: '0 14px 40px rgba(0,0,0,0.38)',
  position: 'relative',
  overflow: 'hidden',
  boxSizing: 'border-box'
} as const;

const imageNodeBoxStyle = {
  width: '100%',
  height: 470,
  borderRadius: 30,
  background: '#222222',
  border: '1px solid rgba(255,255,255,0.15)',
  padding: 28,
  boxShadow: '0 14px 40px rgba(0,0,0,0.38)',
  position: 'relative',
  overflow: 'hidden',
  boxSizing: 'border-box'
} as const;

const videoNodeBoxStyle = {
  width: '100%',
  height: 630,
  borderRadius: 42,
  background: '#222222',
  border: '1px solid rgba(255,255,255,0.15)',
  padding: 28,
  boxShadow: '0 14px 40px rgba(0,0,0,0.38)',
  position: 'relative',
  overflow: 'hidden',
  boxSizing: 'border-box'
} as const;

const imagePreviewStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'contain' as const,
  display: 'block',
  background: '#161616'
} as const;

const imageEmptyStyle = {
  width: '100%',
  height: '100%',
  display: 'grid',
  placeItems: 'center',
  fontSize: 72,
  color: 'rgba(255,255,255,0.26)'
} as const;

const videoEmptyStyle = {
  width: '100%',
  height: '100%',
  display: 'grid',
  placeItems: 'center',
  background: '#242424'
} as const;

const videoPlayIconStyle = {
  width: 108,
  height: 108,
  borderRadius: 24,
  border: '8px solid rgba(255,255,255,0.14)',
  color: 'rgba(255,255,255,0.28)',
  display: 'grid',
  placeItems: 'center',
  fontSize: 42,
  lineHeight: 1,
  paddingLeft: 8
} as const;

const videoPreviewStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'contain' as const,
  display: 'block',
  background: '#101010',
  borderRadius: 18
} as const;

const videoImagePreviewStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'contain' as const,
  display: 'block',
  background: '#101010',
  borderRadius: 18
} as const;

const textPromptStyle = {
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  outline: 'none',
  height: '100%',
  minHeight: 380,
  maxHeight: 410,
  overflowY: 'auto',
  wordBreak: 'break-word',
  paddingRight: 6
} as const;

const toolbarStyle = {
  position: 'absolute',
  left: -64,
  top: -64,
  width: 680,
  minHeight: 58,
  borderRadius: 999,
  background: 'rgba(36,36,36,0.96)',
  border: '1px solid rgba(255,255,255,0.08)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 14px',
  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
  flexWrap: 'wrap'
} as const;

const imageTopToolbarStyle = {
  position: 'absolute',
  top: -42,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10
} as const;

const videoTopToolbarStyle = {
  position: 'absolute',
  top: -52,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10
} as const;

const uploadButtonStyle = {
  minWidth: 98,
  height: 46,
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(36,36,36,0.96)',
  color: '#f5f5f5',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  boxShadow: '0 12px 30px rgba(0,0,0,0.35)'
} as const;

const toolbarColorDotStyle = {
  width: 24,
  height: 24,
  borderRadius: 999,
  border: 0,
  cursor: 'pointer'
} as const;

const toolbarActionStyle = {
  minWidth: 34,
  height: 34,
  padding: '0 10px',
  borderRadius: 10,
  color: 'rgba(255,255,255,0.72)',
  display: 'grid',
  placeItems: 'center',
  fontSize: 14,
  border: 0,
  cursor: 'pointer'
} as const;

const generatorPanelStyle = {
  position: 'absolute',
  left: -160,
  bottom: -190,
  width: 800,
  minHeight: 170,
  borderRadius: 26,
  background: 'rgba(31,31,31,0.98)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 18px 45px rgba(0,0,0,0.42)',
  padding: 16,
  display: 'grid',
  gap: 12
} as const;

const imageBottomPanelStyle = {
  position: 'absolute',
  left: '50%',
  bottom: -230,
  width: 800,
  transform: 'translateX(-50%)',
  minHeight: 170,
  borderRadius: 26,
  background: 'rgba(31,31,31,0.98)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 18px 45px rgba(0,0,0,0.42)',
  padding: 16,
  display: 'grid',
  gap: 12
} as const;

const imageBottomTopRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 10
} as const;

const imageReferenceThumbWrapStyle = {
  width: 48,
  height: 48,
  borderRadius: 14,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  flexShrink: 0,
  position: 'relative'
} as const;

const imageReferenceThumbStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  display: 'block'
} as const;

const imageReferenceThumbListStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap' as const
} as const;

const thumbDeleteButtonStyle = {
  position: 'absolute',
  top: 2,
  right: 2,
  width: 18,
  height: 18,
  borderRadius: 999,
  border: 0,
  background: 'rgba(0,0,0,0.68)',
  color: '#ffffff',
  fontSize: 12,
  lineHeight: 1,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  padding: 0
} as const;

const videoBottomPanelStyle = {
  position: 'absolute',
  left: '50%',
  bottom: -280,
  width: 800,
  transform: 'translateX(-50%)',
  minHeight: 210,
  borderRadius: 28,
  background: 'rgba(31,31,31,0.98)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 18px 45px rgba(0,0,0,0.42)',
  padding: 14,
  display: 'grid',
  gap: 12
} as const;

const videoBottomTopRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 10
} as const;

const videoReferenceThumbWrapStyle = {
  width: 48,
  height: 48,
  borderRadius: 14,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  flexShrink: 0
} as const;

const videoReferenceThumbStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  display: 'block'
} as const;

const videoTextareaStyle = {
  width: '100%',
  minHeight: 86,
  resize: 'none' as const,
  background: 'transparent',
  border: 0,
  outline: 'none',
  color: '#f5f5f5',
  fontSize: 15
} as const;

const videoBottomFooterStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 14
} as const;

const videoMetaLeftStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minWidth: 0
} as const;

const videoActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10
} as const;

const ghostSquareChipStyle = {
  width: 48,
  height: 48,
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: '#f5f5f5',
  cursor: 'pointer'
} as const;

const ghostIconButtonStyle = {
  width: 36,
  height: 36,
  borderRadius: 12,
  border: 0,
  background: 'transparent',
  color: '#f5f5f5',
  marginLeft: 'auto',
  cursor: 'pointer'
} as const;

const videoFooterSelectStyle = {
  minWidth: 160,
  height: 40,
  borderRadius: 999,
  background: 'transparent',
  border: 0,
  color: '#f5f5f5',
  fontSize: 15,
  outline: 'none',
  padding: '0 2px',
  appearance: 'none' as const
} as const;

const videoSettingSummaryChipStyle = {
  height: 40,
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: '#f5f5f5',
  padding: '0 14px',
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const
} as const;

const videoSettingsPopoverStyle = {
  position: 'absolute',
  left: '50%',
  bottom: -12,
  transform: 'translate(-50%, 100%)',
  width: 402,
  borderRadius: 28,
  background: 'rgba(52,52,52,0.98)',
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '0 24px 50px rgba(0,0,0,0.38)',
  padding: 16,
  display: 'grid',
  gap: 14,
  zIndex: 20
} as const;

const videoSettingsBlockStyle = {
  display: 'grid',
  gap: 10
} as const;

const videoSettingsLabelStyle = {
  fontSize: 14,
  color: 'rgba(255,255,255,0.5)'
} as const;

const segmentedWrapStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
  background: 'rgba(255,255,255,0.05)',
  padding: 6,
  borderRadius: 18
} as const;

const videoRatioGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 8,
  background: 'rgba(255,255,255,0.05)',
  padding: 6,
  borderRadius: 18
} as const;

const generatorTextareaStyle = {
  width: '100%',
  minHeight: 90,
  resize: 'none' as const,
  background: 'transparent',
  border: 0,
  outline: 'none',
  color: '#f5f5f5',
  fontSize: 15
} as const;

const generatorFooterStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12
} as const;

const generatorSelectStyle = {
  minWidth: 120,
  height: 40,
  borderRadius: 12,
  background: '#222222',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#f5f5f5',
  fontSize: 15,
  outline: 'none',
  padding: '0 12px',
  appearance: 'none' as const
} as const;

const generatorActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10
} as const;

const imagePanelMetaStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12
} as const;

const quantitySelectStyle = {
  minWidth: 62,
  height: 40,
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#222222',
  color: '#f5f5f5',
  padding: '0 12px',
  outline: 'none',
  appearance: 'none' as const
} as const;

const ghostChipStyle = {
  minWidth: 42,
  height: 40,
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: '#f5f5f5',
  padding: '0 12px',
  cursor: 'pointer'
} as const;

const submitButtonStyle = {
  minWidth: 72,
  height: 40,
  borderRadius: 999,
  border: 0,
  background: '#737373',
  color: '#ffffff',
  cursor: 'pointer',
  padding: '0 18px'
} as const;

const loadingOverlayStyle = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(17,17,17,0.72)',
  display: 'grid',
  alignContent: 'center',
  gap: 14,
  padding: 32,
  backdropFilter: 'blur(1px)'
} as const;

const loadingTitleStyle = {
  fontSize: 22,
  color: '#f5f5f5',
  fontWeight: 600
} as const;

const loadingBarTrackStyle = {
  width: '100%',
  height: 14,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.12)',
  overflow: 'hidden'
} as const;

const loadingBarFillStyle = {
  height: '100%',
  borderRadius: 999,
  background: 'linear-gradient(90deg, #60a5fa 0%, #f5f5f5 100%)',
  transition: 'width 180ms ease'
} as const;

const loadingHintStyle = {
  color: 'rgba(255,255,255,0.72)',
  fontSize: 14
} as const;

const deleteChipStyle = {
  minWidth: 64,
  height: 40,
  borderRadius: 999,
  border: 0,
  background: '#7f1d1d',
  color: '#ffffff',
  cursor: 'pointer',
  padding: '0 16px'
} as const;
