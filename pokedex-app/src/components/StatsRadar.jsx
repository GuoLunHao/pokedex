import { useRef, useEffect } from 'react';

export default function StatsRadar({ stats, size = 280 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = size, H = size;
    const cx = W / 2, cy = H / 2, R = Math.min(cx, cy) - 25;
    const n = 6;
    const keys = ['hp', 'attack', 'defense', 'sp_attack', 'sp_defense', 'speed'];
    const labels = ['HP', '攻击', '防御', '特攻', '特防', '速度'];
    const maxStat = 180;

    ctx.clearRect(0, 0, W, H);

    // Background rings
    for (let ri = 1; ri <= 5; ri++) {
      const r = R * ri / 5;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = Math.PI / 2 + (2 * Math.PI * i / n);
        const x = cx + r * Math.cos(angle);
        const y = cy - r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Axes
    for (let i = 0; i < n; i++) {
      const angle = Math.PI / 2 + (2 * Math.PI * i / n);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(angle), cy - R * Math.sin(angle));
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Data polygon
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const val = Math.min(parseInt(stats[keys[idx]] || 0), maxStat) / maxStat;
      const angle = Math.PI / 2 + (2 * Math.PI * idx / n);
      const x = cx + R * val * Math.cos(angle);
      const y = cy - R * val * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(238, 107, 47, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#ee6b2f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dots
    for (let i = 0; i < n; i++) {
      const val = Math.min(parseInt(stats[keys[i]] || 0), maxStat) / maxStat;
      const angle = Math.PI / 2 + (2 * Math.PI * i / n);
      const x = cx + R * val * Math.cos(angle);
      const y = cy - R * val * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#ee6b2f';
      ctx.fill();
    }

    // Labels
    ctx.fillStyle = '#444';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      const angle = Math.PI / 2 + (2 * Math.PI * i / n);
      const x = cx + (R + 18) * Math.cos(angle);
      const y = cy - (R + 18) * Math.sin(angle);
      ctx.fillText(labels[i], x, y + 4);
    }
  }, [stats, size]);

  return <canvas ref={canvasRef} width={size} height={size} />;
}
