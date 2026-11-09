/**
 * ========================================================================
 * [CORE ENGINE] PartNormalizer & PartRiggingSystem (바닐라 JS Live2D 리깅 시스템)
 * 사용처: sd_asset_studio.html, live2d_rigging_test.html
 * ========================================================================
 */
class PartNormalizer {
  static getTrimmedBounds(sourceImage, alphaThreshold = 15) {
    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.naturalWidth || sourceImage.width;
    canvas.height = sourceImage.naturalHeight || sourceImage.height;
    if (canvas.width <= 0 || canvas.height <= 0) return { minX:0, minY:0, maxX:0, maxY:0, width:1, height:1 };
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(sourceImage, 0, 0);
    let imgData;
    try {
      imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      return { minX:0, minY:0, maxX:canvas.width, maxY:canvas.height, width:canvas.width, height:canvas.height };
    }
    const data = imgData.data;
    let minX = canvas.width, minY = canvas.height;
    let maxX = -1, maxY = -1;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha > alphaThreshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX === -1) {
      return { minX: 0, minY: 0, maxX: canvas.width, maxY: canvas.height, width: canvas.width, height: canvas.height };
    }
    return {
      minX, minY, maxX, maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  }

  static createNormalizedCanvas(sourceImage, targetWidth, targetHeight, fitMode = 'contain') {
    const bounds = this.getTrimmedBounds(sourceImage);
    const normCanvas = document.createElement('canvas');
    normCanvas.width = targetWidth;
    normCanvas.height = targetHeight;
    const ctx = normCanvas.getContext('2d');

    let drawW = targetWidth;
    let drawH = targetHeight;
    let drawX = 0;
    let drawY = 0;

    if (fitMode === 'contain' && bounds.width > 0 && bounds.height > 0) {
      const scale = Math.min(targetWidth / bounds.width, targetHeight / bounds.height);
      drawW = bounds.width * scale;
      drawH = bounds.height * scale;
      drawX = (targetWidth - drawW) / 2;
      drawY = (targetHeight - drawH) / 2;
    }

    ctx.drawImage(
      sourceImage,
      bounds.minX, bounds.minY, bounds.width, bounds.height,
      drawX, drawY, drawW, drawH
    );
    return normCanvas;
  }
}

class PartRiggingSystem {
  constructor(canvasElement, config) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.config = config;
    this.imageMap = new Map();
    this.selectedPartId = 'weapon';
    this.showDebugGizmo = true;
  }

  render() {
    if (!this.canvas) return;
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // 체커보드 배경
    const ctx = this.ctx;
    ctx.fillStyle = '#151c2c';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Z-Index 정렬 후 렌더링
    const sorted = [...this.config.parts].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    for (const part of sorted) {
      this.drawPart(part);
    }

    if (this.showDebugGizmo && this.selectedPartId) {
      const selected = this.config.parts.find(p => p.id === this.selectedPartId);
      if (selected) this.drawGizmo(selected);
    }
  }

  drawPart(part) {
    const asset = this.imageMap.get(part.id);
    if (!asset || asset.width <= 0 || asset.height <= 0) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = part.opacity !== undefined ? part.opacity : 1.0;

    ctx.translate(part.anchor.x, part.anchor.y);
    const rad = (part.rotation || 0) * (Math.PI / 180);
    ctx.rotate(rad);

    const scaleX = (part.scale?.x ?? 1.0) * (part.flipX ? -1 : 1);
    const scaleY = part.scale?.y ?? 1.0;
    ctx.scale(scaleX, scaleY);

    const assetW = asset.width;
    const assetH = asset.height;
    const pivotX = (part.pivot?.x ?? 0.5) * assetW;
    const pivotY = (part.pivot?.y ?? 0.5) * assetH;

    ctx.drawImage(asset, -pivotX, -pivotY, assetW, assetH);
    ctx.restore();
  }

  drawGizmo(part) {
    const asset = this.imageMap.get(part.id);
    if (!asset) return;

    const ctx = this.ctx;
    const assetW = asset.width;
    const assetH = asset.height;
    const rad = (part.rotation || 0) * (Math.PI / 180);
    const scaleX = (part.scale?.x ?? 1.0) * (part.flipX ? -1 : 1);
    const scaleY = part.scale?.y ?? 1.0;
    const pivotX = (part.pivot?.x ?? 0.5) * assetW;
    const pivotY = (part.pivot?.y ?? 0.5) * assetH;

    ctx.save();
    ctx.translate(part.anchor.x, part.anchor.y);
    ctx.rotate(rad);
    ctx.scale(scaleX, scaleY);

    // 바운딩 박스
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-pivotX, -pivotY, assetW, assetH);

    // 피벗 포인트 (빨간 원 + 십자)
    ctx.setLineDash([]);
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
    ctx.moveTo(0, -12); ctx.lineTo(0, 12);
    ctx.stroke();
    ctx.restore();

    // 앵커 포인트 (노란 다이아몬드)
    ctx.save();
    ctx.translate(part.anchor.x, part.anchor.y);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(7, 0); ctx.lineTo(0, 7); ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // options.render=false 로 여러 파츠를 일괄 갱신한 뒤 render()를 한 번만 호출할 수 있음
  updatePartTransform(partId, updates, options = {}) {
    const part = this.config.parts.find(p => p.id === partId);
    if (!part) return;
    if (updates.anchor) Object.assign(part.anchor, updates.anchor);
    if (updates.pivot) Object.assign(part.pivot, updates.pivot);
    if (updates.scale) Object.assign(part.scale, updates.scale);
    if (updates.rotation !== undefined) part.rotation = updates.rotation;
    if (updates.flipX !== undefined) part.flipX = updates.flipX;
    if (options.render !== false) this.render();
  }

  exportConfig() {
    return JSON.stringify(this.config, null, 2);
  }
}
