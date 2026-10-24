import type { LandmarkFile } from '@/constants/trail';

import raw from '../../../design/assets/trail/layout.json';

// Typed view of design/assets/trail/layout.json. Every coordinate is in the 402-wide map space;
// multiply by `k = screenWidth / MAP_W` to place it on screen.

export type StopState = 'cur' | 'done' | 'missed';

export type LayoutStop = { file: LandmarkFile; name: string; state: StopState; x: number; y: number };
export type LayoutWeek = { label: [string, string] | null; stops: LayoutStop[] };
export type WeekCard = { left: number; top: number; w: number; h: number; label: [string, string] };
export type Boat = { svg: string; w: number; h: number; anchor: string; path: string; dur: number; delay: number };
export type Bridge = { mx: number; my: number; a: number; L: number; g: string };
export type River = { y: number; bridge: Bridge; ripples: [number, number][]; boats: Boat[] };
export type PropAnim = 'sway' | 'tree' | 'hop' | 'rustle' | 'bob';
export type MapProp = { name: string; x: number; y: number; s: number; flip: boolean; anim: PropAnim; svg: string };
export type LeafKind = 'leaf-maple' | 'leaf-oak' | 'leaf-ginkgo';
export type Fall = { x: number; y: number; kind: LeafKind; forest?: boolean };

type Layout = {
  W: number;
  H: number;
  weeks: LayoutWeek[];
  cards: WeekCard[];
  rivers: River[];
  pond: { cx: number; cy: number; rx: number; ry: number };
  props: MapProp[];
  falls: Fall[];
  leaves: Record<LeafKind, string>;
  swan: string;
};

export const LAYOUT = raw as unknown as Layout;
export const MAP_W = LAYOUT.W;
export const MAP_H = LAYOUT.H;

/**
 * Pieces (160×220 artboards) are drawn 150 wide. A stop's (x, y) is the middle of the piece's
 * top face, which sits 145 below the artboard top at this size (measured against trail-full-map.png).
 */
export const PIECE_W = 150;
export const PIECE_H = (PIECE_W * 220) / 160;
export const PIECE_TOP = 145;
/** Floating icon chip / done badge, centered up and to the right of the stop. */
export const CHIP_DX = 55;
export const CHIP_DY = -18;

/**
 * The map is drawn and animated in three horizontal bands, matching the rasterized tiles in
 * assets/images/trail. Ambient motion only runs in the bands near the viewport.
 */
export const BAND_H = 1010;
export const BAND_COUNT = Math.ceil(MAP_H / BAND_H);
export function bandOf(y: number): number {
  return Math.min(BAND_COUNT - 1, Math.max(0, Math.floor(y / BAND_H)));
}

/** "M-80 968.0 L-60 971.1 …" → points. Boat paths in layout.json are polylines. */
export function parsePolyline(d: string): [number, number][] {
  const nums = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const points: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) points.push([nums[i], nums[i + 1]]);
  return points;
}

/** "50% 62%" → [0.5, 0.62] */
export function parseAnchor(anchor: string): [number, number] {
  const [ax, ay] = anchor.split(' ').map((p) => parseFloat(p) / 100);
  return [ax ?? 0.5, ay ?? 0.5];
}
