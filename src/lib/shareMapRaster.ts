import type { LngLat } from "@/src/store/useTripStore";

const TILE = 256;

/** Carto raster tiles (free); aligns with light “positron”-style maps used in-app. */
const TILE_URL = (z: number, x: number, y: number) => {
  const sub = "abc"[Math.abs(x + y + z) % 3]!;
  return `https://${sub}.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`;
};

function lngLatToWorldPx(
  lng: number,
  lat: number,
  z: number
): { x: number; y: number } {
  const scale = TILE * 2 ** z;
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const y =
    (0.5 -
      Math.log(Math.tan(latRad / 2 + Math.PI / 4)) / (2 * Math.PI)) *
    scale;
  return { x, y };
}

function bboxLngLat(coords: LngLat[]): {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
} | null {
  if (coords.length === 0) return null;
  let minLng = coords[0]![0];
  let maxLng = coords[0]![0];
  let minLat = coords[0]![1];
  let maxLat = coords[0]![1];
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const padLng = Math.max((maxLng - minLng) * 0.12, 0.008);
  const padLat = Math.max((maxLat - minLat) * 0.12, 0.008);
  return {
    minLng: minLng - padLng,
    maxLng: maxLng + padLng,
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
  };
}

function simplifyRoute(route: LngLat[], maxPoints: number): LngLat[] {
  if (route.length <= maxPoints) return route;
  const out: LngLat[] = [];
  const last = route.length - 1;
  for (let i = 0; i < maxPoints; i++) {
    const t = i / (maxPoints - 1);
    const idx = Math.min(Math.round(t * last), last);
    out.push(route[idx]!);
  }
  return out;
}

function loadTile(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

type View = {
  z: number;
  viewLeft: number;
  viewTop: number;
};

function pickView(
  bbox: NonNullable<ReturnType<typeof bboxLngLat>>,
  cw: number,
  ch: number
): View {
  const margin = 0.88;
  for (let z = 20; z >= 0; z--) {
    const nw = lngLatToWorldPx(bbox.minLng, bbox.maxLat, z);
    const se = lngLatToWorldPx(bbox.maxLng, bbox.minLat, z);
    const spanX = Math.abs(se.x - nw.x);
    const spanY = Math.abs(se.y - nw.y);
    if (spanX <= cw * margin && spanY <= ch * margin) {
      const cLng = (bbox.minLng + bbox.maxLng) / 2;
      const cLat = (bbox.minLat + bbox.maxLat) / 2;
      const c = lngLatToWorldPx(cLng, cLat, z);
      return {
        z,
        viewLeft: c.x - cw / 2,
        viewTop: c.y - ch / 2,
      };
    }
  }
  const z = 0;
  const c = lngLatToWorldPx(
    (bbox.minLng + bbox.maxLng) / 2,
    (bbox.minLat + bbox.maxLat) / 2,
    z
  );
  return { z, viewLeft: c.x - cw / 2, viewTop: c.y - ch / 2 };
}

function iterTiles(
  z: number,
  viewLeft: number,
  viewTop: number,
  cw: number,
  ch: number
): { tx: number; ty: number; dx: number; dy: number }[] {
  const n = 2 ** z;
  const x0 = Math.floor(viewLeft / TILE);
  const x1 = Math.floor((viewLeft + cw) / TILE);
  const y0 = Math.floor(viewTop / TILE);
  const y1 = Math.floor((viewTop + ch) / TILE);
  const out: { tx: number; ty: number; dx: number; dy: number }[] = [];
  for (let xi = x0; xi <= x1; xi++) {
    for (let yi = y0; yi <= y1; yi++) {
      const wx = ((xi % n) + n) % n;
      if (yi < 0 || yi >= n) continue;
      const dx = xi * TILE - viewLeft;
      const dy = yi * TILE - viewTop;
      out.push({ tx: wx, ty: yi, dx, dy });
    }
  }
  return out;
}

function projectToCanvas(
  lng: number,
  lat: number,
  view: View,
  cw: number,
  ch: number
): { x: number; y: number } {
  const p = lngLatToWorldPx(lng, lat, view.z);
  return { x: p.x - view.viewLeft, y: p.y - view.viewTop };
}

/**
 * Paints OSM-derived Carto raster tiles, route polyline, and highlight dots.
 * Resolves when drawing is finished (tiles may be missing — still draws line).
 */
export async function drawRasterRouteMap(
  canvas: HTMLCanvasElement,
  route: LngLat[],
  highlights: LngLat[],
  width: number,
  height: number
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = width;
  canvas.height = height;

  const bg = "#e8eef2";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (route.length === 0) {
    ctx.fillStyle = "#64748b";
    ctx.font = "600 14px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No GPS path for this trip", width / 2, height / 2);
    return;
  }

  const path =
    route.length >= 2 ? simplifyRoute(route, 400) : route;
  const bbox =
    route.length >= 2
      ? bboxLngLat(path)
      : bboxLngLat([
          [route[0]![0] - 0.04, route[0]![1] - 0.03],
          [route[0]![0] + 0.04, route[0]![1] + 0.03],
        ]);
  if (!bbox) return;

  const view = pickView(bbox, width, height);
  const tiles = iterTiles(view.z, view.viewLeft, view.viewTop, width, height);

  const loaded = await Promise.all(
    tiles.map((t) => loadTile(TILE_URL(view.z, t.tx, t.ty)))
  );

  let anyTile = false;
  for (let i = 0; i < tiles.length; i++) {
    const img = loaded[i];
    if (!img) continue;
    anyTile = true;
    const t = tiles[i]!;
    ctx.drawImage(img, t.dx, t.dy);
  }

  if (!anyTile) {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, width, height);
  }

  if (route.length >= 2) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(37, 99, 235, 0.35)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const [lng, lat] = path[i]!;
      const { x, y } = projectToCanvas(lng, lat, view, width, height);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const [lng, lat] = path[i]!;
      const { x, y } = projectToCanvas(lng, lat, view, width, height);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    for (const [lng, lat] of highlights) {
      const { x, y } = projectToCanvas(lng, lat, view, width, height);
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else {
    const [lng, lat] = route[0]!;
    const { x, y } = projectToCanvas(lng, lat, view, width, height);
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    for (const [hlng, hlat] of highlights) {
      const p = projectToCanvas(hlng, hlat, view, width, height);
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
