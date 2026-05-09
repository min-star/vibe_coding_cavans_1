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
  modelOptions?: ModelOption[];
};

const textSizeOptions = [18, 22, 26, 32];
const colorOptions = ['#f5f5f5', '#facc15', '#93c5fd', '#fca5a5', '#86efac'];

function NodeCardImpl({
  node,
  selected = false,
  onChange,
  onRun,
  onDelete,
  onVoiceInput,
  modelOptions = []
}: NodeCardProps) {
  const outputText = node.output?.text ? String(node.output.text) : undefined;
  const outputImage = node.output?.thumbnailUrl || node.output?.fileUrl;
  const inputImage = node.output?.inputImageUrl || node.data.previewUrl;
  const isText = node.type === 'text';
  const isImageUpload = node.type === 'image_upload';
  const isImageUpscale = node.type === 'image_upscale';
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [draftPrompt, setDraftPrompt] = useState(String(node.data.prompt || ''));
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fakeProgress, setFakeProgress] = useState(12);

  useEffect(() => {
    if (isEditing) {
      return;
    }
    const nextValue = String(node.output?.text || node.data.prompt || '');
    setDraftPrompt(nextValue);
  }, [node.data.prompt, node.output?.text, node.id, isEditing]);

  useEffect(() => {
    if (!isText || !editorRef.current || document.activeElement === editorRef.current) {
      return;
    }
    editorRef.current.innerText = draftPrompt;
  }, [draftPrompt, isText]);

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
  const availableModels = modelOptions.length > 0
    ? modelOptions
    : [{ id: 'mock-text', label: 'Mock Text Model', provider: 'mock', taskTypes: ['text_generate'] }];

  if (isText) {
    return (
      <div
        style={textNodeWrapStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Handle type="target" position={Position.Left} style={textHandleStyle('left', hovered)} />
        <Handle type="source" position={Position.Right} style={textHandleStyle('right', hovered)} />
        {hovered ? <SidePlus side="left" /> : null}
        {hovered ? <SidePlus side="right" /> : null}

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
              setDraftPrompt(nextPrompt);
            }}
            onBlur={(event) => {
              const nextPrompt = event.currentTarget.innerText;
              setDraftPrompt(nextPrompt);
              commitPrompt(nextPrompt);
              setIsEditing(false);
            }}
          >
            {draftPrompt || '双击开始编辑...'}
          </div>
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
                value={draftPrompt}
                onChange={(event) => {
                  const nextPrompt = event.target.value;
                  setDraftPrompt(nextPrompt);
                }}
                onBlur={() => commitPrompt(draftPrompt)}
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
                      commitPrompt(draftPrompt);
                      setIsEditing(false);
                      onRun?.({
                        ...node,
                        data: {
                          ...node.data,
                          prompt: draftPrompt
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
        {outputText ? (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{outputText}</pre>
        ) : null}
      </div>
    </div>
  );
}

export const NodeCard = memo(NodeCardImpl);

function SidePlus({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        [side]: -66,
        transform: 'translateY(-50%)',
        width: 44,
        height: 44,
        borderRadius: 999,
        border: '2px solid rgba(255,255,255,0.28)',
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.78)',
        display: 'grid',
        placeItems: 'center',
        fontSize: 32,
        lineHeight: 1,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        pointerEvents: 'none'
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
    width: 44,
    height: 44,
    borderRadius: 999,
    border: '2px solid transparent',
    background: 'transparent',
    [side]: -66,
    top: '50%',
    transform: 'translateY(-50%)',
    opacity: visible ? 1 : 0,
    zIndex: 5
  } as const;
}

const textNodeWrapStyle = {
  position: 'relative',
  width: 480,
  color: '#f5f5f5',
  pointerEvents: 'all'
} as const;

const textNodeHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  margin: '0 0 14px 14px',
  fontSize: 16,
  color: 'rgba(255,255,255,0.88)'
} as const;

const textNodeBoxStyle = {
  height: 470,
  borderRadius: 30,
  background: '#222222',
  border: '1px solid rgba(255,255,255,0.15)',
  padding: 28,
  boxShadow: '0 14px 40px rgba(0,0,0,0.38)',
  position: 'relative',
  overflow: 'hidden'
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
  background: 'transparent',
  border: 0,
  color: '#f5f5f5',
  fontSize: 15,
  outline: 'none'
} as const;

const generatorActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10
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
