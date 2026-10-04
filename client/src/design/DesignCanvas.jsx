// The interactive canvas: product photo, the print area, and the design layers you can
// drag, resize and rotate.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KImage, Text as KText, Rect, Ellipse, Group, Transformer, Line } from "react-konva";
import { DESIGN_WIDTH } from "./designUtils";
import { imageKey, layerProps } from "./renderer";

const SNAP = 12; // design units

function TextNode({ layer, nodeProps, onRef }) {
  const ref = useRef(null);
  // Text is positioned by its centre: work out the offset from its real height.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.offsetY(node.height() / 2);
    node.getLayer()?.batchDraw();
  });
  return (
    <KText
      ref={(node) => {
        ref.current = node;
        onRef(layer.id, node);
      }}
      {...layerProps(layer)}
      {...nodeProps}
    />
  );
}

export default function DesignCanvas({
  width,
  mockup,
  area,
  H,
  layers,
  images,
  selectedId,
  onSelect,
  onChange,
  showGuides,
  fontsVersion,
}) {
  const nodes = useRef(new Map());
  const transformerRef = useRef(null);
  const [snapLines, setSnapLines] = useState({ x: false, y: false });

  const imageAspect = mockup ? mockup.naturalHeight / mockup.naturalWidth : 1;
  const height = Math.round(width * imageAspect);
  const scale = (area.width * width) / DESIGN_WIDTH;
  const areaBox = { x: area.x * width, y: area.y * height, width: area.width * width, height: H * scale };

  const selected = layers.find((l) => l.id === selectedId);

  // Attach the resize/rotate handles to the selected layer
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const node = selected && !selected.locked ? nodes.current.get(selected.id) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selected, layers, fontsVersion]);

  const setNodeRef = (id, node) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  };

  // Keep a layer's centre inside the print area while dragging
  const dragBound = (pos) => ({
    x: Math.min(areaBox.x + areaBox.width, Math.max(areaBox.x, pos.x)),
    y: Math.min(areaBox.y + areaBox.height, Math.max(areaBox.y, pos.y)),
  });

  const handleDragMove = (e) => {
    const node = e.target;
    const nearX = Math.abs(node.x() - DESIGN_WIDTH / 2) < SNAP;
    const nearY = Math.abs(node.y() - H / 2) < SNAP;
    if (nearX) node.x(DESIGN_WIDTH / 2);
    if (nearY) node.y(H / 2);
    if (nearX !== snapLines.x || nearY !== snapLines.y) setSnapLines({ x: nearX, y: nearY });
  };

  const handleDragEnd = (layer, e) => {
    setSnapLines({ x: false, y: false });
    onChange(layer.id, { x: e.target.x(), y: e.target.y() });
  };

  // Turn the handle's stretching into real width/height/font size
  const handleTransformEnd = (layer, e) => {
    const node = e.target;
    const sx = Math.abs(node.scaleX());
    const sy = Math.abs(node.scaleY());
    const changes = { x: node.x(), y: node.y(), rotation: Math.round(node.rotation() * 10) / 10 };
    if (layer.type === "text") {
      changes.width = Math.max(40, layer.width * sx);
      if (Math.abs(sy - 1) > 0.001) changes.fontSize = Math.max(8, Math.round(layer.fontSize * sy));
      node.scaleX(1);
      node.scaleY(1);
    } else {
      changes.width = Math.max(10, layer.width * sx);
      changes.height = Math.max(10, layer.height * sy);
      if (layer.type === "image" && layer.frame === "circle") changes.height = changes.width;
      node.scaleX(layer.flipX ? -1 : 1);
      node.scaleY(1);
    }
    onChange(layer.id, changes);
  };

  const clearSelection = (e) => {
    const name = e.target.name();
    if (e.target === e.target.getStage() || name === "mockup" || name === "print-area") onSelect(null);
  };

  const transformerAnchors =
    selected?.type === "text"
      ? ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]
      : selected?.type === "image"
        ? ["top-left", "top-right", "bottom-left", "bottom-right"]
        : undefined;

  return (
    <Stage width={width} height={height} onMouseDown={clearSelection} onTouchStart={clearSelection}>
      <Layer>
        {mockup ? (
          <KImage name="mockup" image={mockup} width={width} height={height} />
        ) : (
          <Rect name="mockup" width={width} height={height} fill="#f4f4f6" />
        )}
        {showGuides && (
          <Rect
            name="print-area"
            {...areaBox}
            stroke="#7c0034"
            strokeWidth={1.5}
            dash={[8, 6]}
            fill="rgba(124, 0, 52, 0.03)"
          />
        )}

        <Group x={areaBox.x} y={areaBox.y} scaleX={scale} scaleY={scale} clipX={0} clipY={0} clipWidth={DESIGN_WIDTH} clipHeight={H}>
          {layers.map((layer) => {
            if (layer.hidden) return null;
            const nodeProps = {
              draggable: !layer.locked,
              dragBoundFunc: dragBound,
              onMouseDown: () => onSelect(layer.id),
              onTouchStart: () => onSelect(layer.id),
              onDragStart: () => onSelect(layer.id),
              onDragMove: handleDragMove,
              onDragEnd: (e) => handleDragEnd(layer, e),
              onTransformEnd: (e) => handleTransformEnd(layer, e),
            };
            if (layer.type === "text") {
              return <TextNode key={layer.id} layer={layer} nodeProps={nodeProps} onRef={setNodeRef} />;
            }
            const ref = (node) => setNodeRef(layer.id, node);
            if (layer.type === "image") {
              const image = images.get(imageKey(layer));
              if (!image) return null;
              return <KImage key={layer.id} ref={ref} {...layerProps(layer, image)} {...nodeProps} />;
            }
            if (layer.type === "ellipse") return <Ellipse key={layer.id} ref={ref} {...layerProps(layer)} {...nodeProps} />;
            return <Rect key={layer.id} ref={ref} {...layerProps(layer)} {...nodeProps} />;
          })}
        </Group>

        {/* Centre lines while snapping */}
        {snapLines.x && (
          <Line points={[areaBox.x + areaBox.width / 2, areaBox.y, areaBox.x + areaBox.width / 2, areaBox.y + areaBox.height]} stroke="#e11d48" strokeWidth={1} dash={[4, 4]} listening={false} />
        )}
        {snapLines.y && (
          <Line points={[areaBox.x, areaBox.y + areaBox.height / 2, areaBox.x + areaBox.width, areaBox.y + areaBox.height / 2]} stroke="#e11d48" strokeWidth={1} dash={[4, 4]} listening={false} />
        )}

        <Transformer
          ref={transformerRef}
          rotateEnabled
          keepRatio={selected?.type !== "rect" && selected?.type !== "ellipse"}
          enabledAnchors={transformerAnchors}
          anchorSize={11}
          anchorCornerRadius={6}
          anchorStroke="#7c0034"
          borderStroke="#7c0034"
          rotateAnchorOffset={28}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 12 || Math.abs(newBox.height) < 12 ? oldBox : newBox)}
        />
      </Layer>
    </Stage>
  );
}
