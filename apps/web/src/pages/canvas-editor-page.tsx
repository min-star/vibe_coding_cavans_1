import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  type NodeMouseHandler,
  MarkerType,
  Node,
  type ReactFlowInstance,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { NodeCard } from '../components/node-card';
import { useAuthGuard } from '../hooks/use-auth-guard';
import type { Asset, Canvas, CanvasEdge, CanvasNode, ModelOption, NodeType, ShareResponse } from '../types';

type FlowNodeData = {
  node: CanvasNode;
};

function toFlowNode(node: CanvasNode): Node<FlowNodeData> {
  return {
    id: node.id,
    position: node.position,
    data: { node },
    type: 'default',
    draggable: true,
    dragHandle: node.type === 'text' ? '.node-drag-handle' : undefined,
    selectable: true,
    connectable: true,
    style: {
      background: 'transparent',
      border: 'none',
      boxShadow: 'none',
      padding: 0,
      width: 'auto'
    }
  };
}

function toFlowEdge(edge: CanvasEdge): Edge {
  return {
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    label: edge.referenceType,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#0f172a'
    },
    style: {
      stroke: '#0f172a',
      strokeWidth: 2
    }
  };
}

function fromFlowNode(flowNode: Node<FlowNodeData>, canvasId: string): CanvasNode {
  return {
    ...flowNode.data.node,
    canvasId,
    position: flowNode.position
  };
}

function EditorInner() {
  const token = useAuthGuard();
  const { id: canvasId } = useParams();
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [allNodes, setAllNodes] = useState<CanvasNode[]>([]);
  const [shareResponse, setShareResponse] = useState<ShareResponse | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<Node<FlowNodeData>, Edge> | null>(null);
  const flowOverlayRef = useRef<HTMLDivElement | null>(null);
  const [createMenu, setCreateMenu] = useState<{
    clientX: number;
    clientY: number;
    canvasX: number;
    canvasY: number;
  } | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const selectedNode = useMemo(
    () => allNodes.find((node) => node.id === selectedNodeId) || null,
    [allNodes, selectedNodeId]
  );

  function updateNodeLocal(updatedNode: CanvasNode) {
    const nextNodes = allNodes.map((node) => (node.id === updatedNode.id ? updatedNode : node));
    syncNodes(nextNodes);
  }

  function syncNodes(nextNodes: CanvasNode[]) {
    setAllNodes(nextNodes);
    setNodes(nextNodes.map(toFlowNode));
  }

  async function loadCanvas() {
    if (!token || !canvasId) {
      return;
    }
    const data = await apiRequest<{
      canvas: Canvas;
      nodes: CanvasNode[];
      edges: CanvasEdge[];
    }>(`/canvases/${canvasId}`, { token });

    setCanvas(data.canvas);
    syncNodes(data.nodes);
    setEdges(data.edges.map(toFlowEdge));
  }

  async function loadAssets() {
    if (!token) {
      return;
    }
    const data = await apiRequest<{ assets: Asset[] }>('/assets', { token });
    setAssets(data.assets);
  }

  async function loadModels() {
    const data = await apiRequest<{ models: ModelOption[] }>('/models');
    setModelOptions(data.models.filter((item) => item.taskTypes.includes('text_generate')));
  }

  async function addNode(type: NodeType, customPosition?: { x: number; y: number }) {
    if (!token || !canvasId) {
      return;
    }
    const data = await apiRequest<{ node: CanvasNode }>(`/canvases/${canvasId}/nodes`, {
      method: 'POST',
      token,
      body: {
        type,
        position: customPosition || { x: 120 + Math.random() * 320, y: 120 + Math.random() * 240 }
      }
    });
    const normalizedNode =
      type === 'text'
        ? {
            ...data.node,
            data: {
              ...data.node.data,
              label: 'Text',
              model: modelOptions[0]?.id || 'mock-text',
              quantity: 1
            }
          }
        : data.node;
    const nextNodes = [...allNodes, normalizedNode];
    syncNodes(nextNodes);
    setCreateMenu(null);
  }

  async function saveCanvas() {
    if (!token || !canvasId || !canvas) {
      return;
    }

    const normalizedNodes = nodes.map((node) => fromFlowNode(node, canvasId));
    const normalizedEdges: CanvasEdge[] = edges.map((edge) => ({
      id: edge.id,
      canvasId,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      referenceType: (typeof edge.label === 'string' ? edge.label : 'prompt') as CanvasEdge['referenceType'],
      createdAt: new Date().toISOString()
    }));

    const data = await apiRequest<{
      canvas: Canvas;
      nodes: CanvasNode[];
      edges: CanvasEdge[];
    }>(`/canvases/${canvasId}/content`, {
      method: 'PUT',
      token,
      body: {
        title: canvas.title,
        viewport: canvas.viewport,
        nodes: normalizedNodes,
        edges: normalizedEdges
      }
    });

    setCanvas(data.canvas);
    syncNodes(data.nodes);
    setEdges(data.edges.map(toFlowEdge));
    alert('Canvas saved.');
  }

  async function runNode(node: CanvasNode) {
    if (!token || !canvasId) {
      return;
    }

    updateNodeLocal({
      ...node,
      status: 'pending',
      data: {
        ...node.data,
        prompt: String(node.data.prompt || node.data.label || '')
      }
    });

    const references = edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => {
        const sourceNode = allNodes.find((item) => item.id === edge.source);
        if (!sourceNode) {
          return edge.source;
        }
        return String(
          sourceNode.output?.fileUrl ||
            sourceNode.output?.thumbnailUrl ||
            sourceNode.output?.text ||
            sourceNode.data.label ||
            sourceNode.type
        );
      });

    const endpointMap: Record<NodeType, string | null> = {
      text: '/tasks/text-generate',
      image_upload: null,
      image_upscale: '/tasks/image-upscale',
      video_generate: '/tasks/video-generate'
    };

    const endpoint = endpointMap[node.type];
    if (!endpoint) {
      alert('Upload nodes are not runnable. Use Assets page to upload files.');
      return;
    }

    const input = {
      prompt: String(node.data.prompt || node.data.label || ''),
      references,
      sourceNodeIds: edges.filter((edge) => edge.target === node.id).map((edge) => edge.source),
      duration: Number(node.data.duration || 5),
      model: String(node.data.model || modelOptions[0]?.id || 'mock-text'),
      quantity: Number(node.data.quantity || 1)
    };

    try {
      const task = await apiRequest<{ taskId: string; status: string }>(endpoint, {
        method: 'POST',
        token,
        body: {
          canvasId,
          nodeId: node.id,
          input
        }
      });

      await pollTask(task.taskId);
    } catch (error) {
      updateNodeLocal({
        ...node,
        status: 'failed'
      });
      alert(error instanceof Error ? error.message : '生成失败');
    }
  }

  async function pollTask(taskId: string) {
    if (!token) {
      return;
    }

    let count = 0;
    while (count < 20) {
      const task = await apiRequest<{
        status: 'pending' | 'running' | 'success' | 'failed';
        errorMessage?: string;
        nodeId?: string;
        result?: Record<string, unknown>;
      }>(`/tasks/${taskId}`, { token });
      if (task.status === 'success' || task.status === 'failed') {
        if (task.status === 'success' && task.nodeId && task.result) {
          const currentNode = allNodes.find((item) => item.id === task.nodeId);
          if (currentNode) {
            updateNodeLocal({
              ...currentNode,
              status: 'success',
              output: task.result
            });
          }
        }
        if (task.status === 'failed' && task.nodeId) {
          const currentNode = allNodes.find((item) => item.id === task.nodeId);
          if (currentNode) {
            updateNodeLocal({
              ...currentNode,
              status: 'failed'
            });
          }
        }
        await loadCanvas();
        if (task.status === 'failed') {
          alert(task.errorMessage || '生成失败');
        }
        return;
      }
      count += 1;
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
  }

  async function shareCanvas() {
    if (!token || !canvasId) {
      return;
    }
    const data = await apiRequest<ShareResponse>(`/canvases/${canvasId}/share`, {
      method: 'POST',
      token
    });
    setShareResponse(data);
  }

  async function cloneCanvasNow() {
    if (!token || !canvasId) {
      return;
    }
    await apiRequest(`/canvases/${canvasId}/clone`, {
      method: 'POST',
      token
    });
    alert('Canvas cloned into your list.');
  }

  async function saveNodeOutputAsAsset() {
    if (!token || !canvasId || !selectedNode) {
      return;
    }
    await apiRequest('/assets/save-from-node', {
      method: 'POST',
      token,
      body: {
        canvasId,
        nodeId: selectedNode.id
      }
    });
    await loadAssets();
    alert('Node output saved to assets.');
  }

  async function deleteNodeById(nodeId: string) {
    if (!token || !nodeId) {
      return;
    }
    await apiRequest(`/canvases/nodes/${nodeId}`, {
      method: 'DELETE',
      token
    });
    setSelectedNodeId(null);
    await loadCanvas();
  }

  async function deleteSelectedNode() {
    if (!selectedNodeId) {
      return;
    }
    await deleteNodeById(selectedNodeId);
  }

  useEffect(() => {
    void loadCanvas();
    void loadAssets();
    void loadModels();
  }, [token, canvasId]);

  useEffect(() => {
    function handleWindowClick() {
      setCreateMenu(null);
    }

    if (!createMenu) {
      return;
    }

    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, [createMenu]);

  useEffect(() => {
    const container = flowOverlayRef.current;
    if (!container) {
      return;
    }

    function handleDoubleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const clickedOnNode = Boolean(target.closest('.react-flow__node'));
      const clickedOnEdge = Boolean(target.closest('.react-flow__edge'));
      const clickedOnControl = Boolean(target.closest('.react-flow__controls'));

      if (clickedOnNode || clickedOnEdge || clickedOnControl || !flowInstance) {
        return;
      }

      const containerBounds = container.getBoundingClientRect();
      const menuWidth = 220;
      const menuHeight = 230;
      const rawX = event.clientX - containerBounds.left + 12;
      const rawY = event.clientY - containerBounds.top + 12;
      const position = flowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      setCreateMenu({
        clientX: Math.min(rawX, containerBounds.width - menuWidth - 12),
        clientY: Math.min(rawY, containerBounds.height - menuHeight - 12),
        canvasX: position.x,
        canvasY: position.y
      });
    }

    container.addEventListener('dblclick', handleDoubleClick, true);
    return () => container.removeEventListener('dblclick', handleDoubleClick, true);
  }, [flowInstance]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tagName === 'input' || tagName === 'textarea' || target?.isContentEditable;

      if (isTypingTarget) {
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId) {
        event.preventDefault();
        void deleteNodeById(selectedNodeId);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, token]);

  const handleNodeClick: NodeMouseHandler<Node<FlowNodeData>> = (_, node) => {
    setSelectedNodeId(node.id);
    setCreateMenu(null);
  };

  function handlePaneClick() {
    setCreateMenu(null);
    setSelectedNodeId(null);
  }

  function handleVoiceInput(node: CanvasNode) {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      alert('当前浏览器不支持语音输入。');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (speechEvent: SpeechRecognitionEvent) => {
      const transcript = speechEvent.results[0]?.[0]?.transcript || '';
      updateNodeLocal({
        ...node,
        data: {
          ...node.data,
          prompt: `${String(node.data.prompt || '')}${transcript}`.trim()
        }
      });
    };
    recognition.start();
  }

  return (
    <div style={editorShellStyle}>
      <aside style={sidePanelStyle}>
        <h2>{canvas?.title || 'Canvas'}</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <button onClick={() => void addNode('text')} style={buttonStyle}>
            Add Text Node
          </button>
          <button onClick={() => void addNode('image_upscale')} style={buttonStyle}>
            Add Upscale Node
          </button>
          <button onClick={() => void addNode('video_generate')} style={buttonStyle}>
            Add Video Node
          </button>
          <button onClick={() => void addNode('image_upload')} style={secondaryButtonStyle}>
            Add Upload Node
          </button>
        </div>
        <hr />
        <div style={{ display: 'grid', gap: 10 }}>
          <button onClick={() => void saveCanvas()} style={buttonStyle}>
            Save Canvas
          </button>
          <button onClick={() => void shareCanvas()} style={secondaryButtonStyle}>
            Share
          </button>
          <button onClick={() => void cloneCanvasNow()} style={secondaryButtonStyle}>
            Clone
          </button>
        </div>
        {shareResponse ? (
          <div style={noticeStyle}>
            <div>Share Link</div>
            <a href={shareResponse.webUrl} target="_blank" rel="noreferrer">
              {shareResponse.webUrl}
            </a>
          </div>
        ) : null}
      </aside>

      <section style={flowSectionStyle}>
        <div
          ref={flowOverlayRef}
          style={flowOverlayStyle}
        >
        {createMenu ? (
          <div
            style={{
              ...createMenuStyle,
              left: createMenu.clientX,
              top: createMenu.clientY
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={createMenuTitleStyle}>添加节点</div>
            <button
              style={createMenuItemStyle}
              onClick={() => void addNode('text', { x: createMenu.canvasX, y: createMenu.canvasY })}
            >
              文本
            </button>
            <button
              style={createMenuItemStyle}
              onClick={() =>
                void addNode('image_upload', { x: createMenu.canvasX, y: createMenu.canvasY })
              }
            >
              上传图片
            </button>
            <button
              style={createMenuItemStyle}
              onClick={() =>
                void addNode('image_upscale', { x: createMenu.canvasX, y: createMenu.canvasY })
              }
            >
              图像放大
            </button>
            <button
              style={createMenuItemStyle}
              onClick={() =>
                void addNode('video_generate', { x: createMenu.canvasX, y: createMenu.canvasY })
              }
            >
              视频
            </button>
          </div>
        ) : null}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onInit={setFlowInstance}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onConnect={(params: Connection) =>
            setEdges((eds) =>
              addEdge(
                {
                  ...params,
                  id: `${params.source}-${params.target}-${Date.now()}`,
                  label: 'input',
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#0f172a'
                  },
                  style: {
                    stroke: '#0f172a',
                    strokeWidth: 2
                  }
                },
                eds
              )
            )
          }
          nodesConnectable
          elementsSelectable
          selectNodesOnDrag={false}
          nodeTypes={{
            default: ({ id, data }) => (
              <NodeCard
                node={data.node}
                selected={selectedNodeId === id}
                onChange={updateNodeLocal}
                onRun={(node) => void runNode(node)}
                onDelete={(node) => void deleteNodeById(node.id)}
                onVoiceInput={handleVoiceInput}
                modelOptions={modelOptions}
              />
            )
          }}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
        </div>
      </section>

    </div>
  );
}

export function CanvasEditorPage() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}

const editorShellStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '280px 1fr',
  gap: 16,
  height: 'calc(100vh - 120px)'
};

const sidePanelStyle: CSSProperties = {
  background: '#ffffff',
  borderRadius: 20,
  padding: 18,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
  overflow: 'auto'
};

const flowSectionStyle: CSSProperties = {
  borderRadius: 20,
  overflow: 'hidden',
  border: '1px solid #cbd5e1',
  background: '#e2e8f0'
};

const flowOverlayStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%'
};

const buttonStyle: CSSProperties = {
  padding: '10px 16px',
  borderRadius: 12,
  border: 0,
  background: '#0f172a',
  color: '#fff'
};

const secondaryButtonStyle: CSSProperties = {
  padding: '10px 16px',
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  background: '#fff'
};

const noticeStyle: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: '#f8fafc',
  fontSize: 13
};

const createMenuStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 20,
  width: 220,
  padding: 12,
  borderRadius: 18,
  background: 'rgba(15, 23, 42, 0.96)',
  color: '#f8fafc',
  boxShadow: '0 20px 50px rgba(2, 6, 23, 0.45)',
  display: 'grid',
  gap: 8
};

const createMenuTitleStyle: CSSProperties = {
  fontSize: 13,
  opacity: 0.8,
  padding: '4px 6px 10px'
};

const createMenuItemStyle: CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '12px 14px',
  borderRadius: 14,
  border: 0,
  background: 'rgba(255,255,255,0.08)',
  color: '#f8fafc',
  cursor: 'pointer'
};
