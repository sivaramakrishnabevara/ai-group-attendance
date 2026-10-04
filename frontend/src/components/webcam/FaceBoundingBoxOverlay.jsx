import React, { useEffect, useRef } from 'react';

export default function FaceBoundingBoxOverlay({
  recognizedFaces = [],
  unknownFaces = [],
  imageWidth = 1280,
  imageHeight = 720,
  onFaceClick
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / (imageWidth || 1);
    const scaleY = canvas.height / (imageHeight || 1);

    // 1. Draw Recognized Faces (Green Bounding Boxes)
    recognizedFaces.forEach((face) => {
      if (!face.box) return;
      const x = face.box.x * scaleX;
      const y = face.box.y * scaleY;
      const w = face.box.width * scaleX;
      const h = face.box.height * scaleY;

      // Box
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, h, 6) : ctx.rect(x, y, w, h);
      ctx.stroke();

      // Label background
      const name = face.student_name || `Student #${face.student_id}`;
      const simText = face.similarity ? ` (${(face.similarity * 100).toFixed(1)}%)` : '';
      const label = `${name}${simText}`;

      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      const textMetrics = ctx.measureText(label);
      const labelW = textMetrics.width + 12;
      const labelH = 22;

      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, Math.max(0, y - labelH), labelW, labelH, [4, 4, 0, 0]) : ctx.fillRect(x, Math.max(0, y - labelH), labelW, labelH);
      ctx.fill();

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 6, Math.max(14, y - 6));
    });

    // 2. Draw Unknown Faces (Orange/Amber Bounding Boxes)
    unknownFaces.forEach((face) => {
      if (!face.box) return;
      const x = face.box.x * scaleX;
      const y = face.box.y * scaleY;
      const w = face.box.width * scaleX;
      const h = face.box.height * scaleY;

      // Box
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, h, 6) : ctx.rect(x, y, w, h);
      ctx.stroke();

      // Label background
      const simText = face.similarity ? ` (${(face.similarity * 100).toFixed(1)}%)` : '';
      const label = `UNKNOWN FACE${simText}`;

      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      const textMetrics = ctx.measureText(label);
      const labelW = textMetrics.width + 12;
      const labelH = 22;

      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, Math.max(0, y - labelH), labelW, labelH, [4, 4, 0, 0]) : ctx.fillRect(x, Math.max(0, y - labelH), labelW, labelH);
      ctx.fill();

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 6, Math.max(14, y - 6));
    });

  }, [recognizedFaces, unknownFaces, imageWidth, imageHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={imageWidth || 1280}
      height={imageHeight || 720}
      className="face-overlay-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10
      }}
    />
  );
}
