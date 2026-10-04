// Lets a seller mark where designs can be printed on a product photo:
// drag the box to move it, use the handles to resize it.
import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KImage, Rect, Transformer } from "react-konva";
import { loadImage } from "../design/imageTools";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export default function PrintAreaEditor({ imageUrl, value, onChange, width = 340 }) {
  const [img, setImg] = useState(null);
  const rectRef = useRef(null);
  const trRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadImage(imageUrl)
      .then((image) => !cancelled && setImg(image))
      .catch(() => !cancelled && setImg(null));
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  useEffect(() => {
    if (img && rectRef.current && trRef.current) {
      trRef.current.nodes([rectRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [img]);

  if (!img) return <div className="spinner" />;
  const height = Math.round((width * img.naturalHeight) / img.naturalWidth);

  const commit = () => {
    const node = rectRef.current;
    const w = clamp((node.width() * node.scaleX()) / width, 0.05, 1);
    const h = clamp((node.height() * node.scaleY()) / height, 0.05, 1);
    node.scaleX(1);
    node.scaleY(1);
    onChange({
      ...value,
      x: clamp(node.x() / width, 0, 1 - w),
      y: clamp(node.y() / height, 0, 1 - h),
      width: w,
      height: h,
    });
  };

  return (
    <Stage width={width} height={height} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", touchAction: "none" }}>
      <Layer>
        <KImage image={img} width={width} height={height} />
        <Rect
          ref={rectRef}
          x={value.x * width}
          y={value.y * height}
          width={value.width * width}
          height={value.height * height}
          fill="rgba(124, 0, 52, 0.12)"
          stroke="#7c0034"
          strokeWidth={2}
          dash={[8, 5]}
          draggable
          dragBoundFunc={(pos) => ({
            x: clamp(pos.x, 0, width - rectRef.current.width() * rectRef.current.scaleX()),
            y: clamp(pos.y, 0, height - rectRef.current.height() * rectRef.current.scaleY()),
          })}
          onDragEnd={commit}
          onTransformEnd={commit}
        />
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          keepRatio={false}
          anchorStroke="#7c0034"
          borderStroke="#7c0034"
          boundBoxFunc={(oldBox, box) =>
            box.x < -1 || box.y < -1 || box.x + box.width > width + 1 || box.y + box.height > height + 1 || box.width < 20 || box.height < 20
              ? oldBox
              : box
          }
        />
      </Layer>
    </Stage>
  );
}
