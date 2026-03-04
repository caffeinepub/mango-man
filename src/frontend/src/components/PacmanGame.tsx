import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMobile } from "../hooks/use-mobile";

// ─── Constants ────────────────────────────────────────────────────────────────
const TILE = 20;
const COLS = 21;
const ROWS = 23;
const CANVAS_W = COLS * TILE;
const CANVAS_H = ROWS * TILE;

// Speed in tiles/second
const PACMAN_SPEED = 7.5;
const GHOST_SPEED = 3.5;
const FRIGHTENED_SPEED = 2;
const GHOST_SPEED_LEAVING = 2.5;

// Timing
const FRIGHTENED_DURATION = 8000; // ms
const GHOST_EXIT_DELAY = 2000; // ms between ghost exits
const BLINK_START = 2000; // ms before frightened ends, start blinking
const SCATTER_DURATION = 7000; // ms in scatter before switching to chase
const CHASE_DURATION = 20000; // ms in chase before switching back

// ─── Colors (Mango Mustard) ──────────────────────────────────────────────────
const C = {
  bg: "#FFF8E7",
  wall: "#C8860A",
  wallLight: "#E6A010",
  dot: "#E6A800",
  powerPellet: "#FF6B00",
  pacman: "#FFAA00",
  pacmanOutline: "#E68800",
  ghost1: "#E6B800", // mustard yellow
  ghost2: "#FF8C00", // deep mango
  ghost3: "#CC6600", // burnt amber
  ghost4: "#B8860B", // golden brown
  frightened: "#FFD580",
  frightenedBlink: "#FF9900",
  ghostEyes: "#FFFFFF",
  ghostPupil: "#1A3A6B",
  text: "#3D2000",
  textLight: "#7A4400",
  hudBg: "#FFF0C0",
  scoreFlash: "#FF6B00",
};

// ─── Maze Layout ─────────────────────────────────────────────────────────────
// 0=dot, 1=wall, 2=empty (ghost house / eaten dot), 3=power pellet, 4=ghost door, 5=eaten dot (walkable)
const RAW_MAZE: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 3, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 3, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 0, 1, 2, 1, 1, 4, 4, 4, 1, 1, 2, 1, 0, 1, 1, 1, 1],
  [2, 2, 2, 2, 0, 2, 2, 1, 2, 2, 2, 2, 2, 1, 2, 2, 0, 2, 2, 2, 2],
  [1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 3, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 3, 1],
  [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Direction = "left" | "right" | "up" | "down" | null;
type GhostMode = "scatter" | "chase" | "frightened" | "eaten" | "leaving";
type GameState =
  | "start"
  | "playing"
  | "paused"
  | "gameover"
  | "levelcomplete"
  | "dying";

interface Position {
  x: number;
  y: number;
}

interface Ghost {
  id: number;
  x: number; // pixel x (center)
  y: number; // pixel y (center)
  col: number; // current tile col
  row: number; // current tile row
  dir: Direction;
  nextDir: Direction;
  mode: GhostMode;
  color: string;
  scatterTarget: Position; // tile position
  exitDelay: number;
  frightenedTimer: number;
  eatScore: number;
}

interface GameRef {
  maze: number[][];
  dots: number;
  pacX: number;
  pacY: number;
  pacCol: number;
  pacRow: number;
  pacDir: Direction;
  pacNextDir: Direction;
  pacMouthAngle: number;
  pacMouthDir: number; // 1 = opening, -1 = closing
  pacMovProgress: number;
  ghosts: Ghost[];
  gameState: GameState;
  score: number;
  lives: number;
  level: number;
  frightenedActive: boolean;
  frightenedTimer: number;
  frightenedEatCount: number;
  scatterTimer: number; // counts up; drives scatter/chase cycle
  lastTime: number;
  frameReq: number;
  levelCompleteTimer: number;
  dyingTimer: number;
  floatingTexts: FloatingText[];
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  timer: number;
  maxTimer: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isWalkableForGhost(
  maze: number[][],
  col: number,
  row: number,
  _mode: GhostMode,
): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  const t = maze[row][col];
  if (t === 1) return false;
  return true;
}

function isWalkableForPacman(
  maze: number[][],
  col: number,
  row: number,
): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  const t = maze[row][col];
  return t !== 1; // only walls block pac-man; ghost house (2), door (4), and eaten dots (5) are all walkable
}

function dirToVec(dir: Direction): { dx: number; dy: number } {
  if (dir === "left") return { dx: -1, dy: 0 };
  if (dir === "right") return { dx: 1, dy: 0 };
  if (dir === "up") return { dx: 0, dy: -1 };
  if (dir === "down") return { dx: 0, dy: 1 };
  return { dx: 0, dy: 0 };
}

function oppositeDir(dir: Direction): Direction {
  if (dir === "left") return "right";
  if (dir === "right") return "left";
  if (dir === "up") return "down";
  if (dir === "down") return "up";
  return null;
}

function initMaze(): number[][] {
  return RAW_MAZE.map((row) => [...row]);
}

function countDots(maze: number[][]): number {
  let count = 0;
  for (const row of maze) {
    for (const t of row) {
      if (t === 0 || t === 3) count++;
    }
  }
  return count;
}

function initGhosts(): Ghost[] {
  // Ghost house center: around col 10, rows 9-11
  const ghosts: Ghost[] = [
    {
      id: 0,
      x: 10 * TILE + TILE / 2,
      y: 10 * TILE + TILE / 2,
      col: 10,
      row: 10,
      dir: "left",
      nextDir: "left",
      mode: "leaving",
      color: C.ghost1,
      scatterTarget: { x: 0, y: 0 },
      exitDelay: 0,
      frightenedTimer: 0,
      eatScore: 200,
    },
    {
      id: 1,
      x: 8 * TILE + TILE / 2,
      y: 10 * TILE + TILE / 2,
      col: 8,
      row: 10,
      dir: "right",
      nextDir: "right",
      mode: "scatter",
      color: C.ghost2,
      scatterTarget: { x: COLS - 1, y: 0 },
      exitDelay: GHOST_EXIT_DELAY,
      frightenedTimer: 0,
      eatScore: 200,
    },
    {
      id: 2,
      x: 12 * TILE + TILE / 2,
      y: 10 * TILE + TILE / 2,
      col: 12,
      row: 10,
      dir: "left",
      nextDir: "left",
      mode: "scatter",
      color: C.ghost3,
      scatterTarget: { x: 0, y: ROWS - 1 },
      exitDelay: GHOST_EXIT_DELAY * 2,
      frightenedTimer: 0,
      eatScore: 200,
    },
    {
      id: 3,
      x: 10 * TILE + TILE / 2,
      y: 12 * TILE + TILE / 2,
      col: 10,
      row: 12,
      dir: "up",
      nextDir: "up",
      mode: "scatter",
      color: C.ghost4,
      scatterTarget: { x: COLS - 1, y: ROWS - 1 },
      exitDelay: GHOST_EXIT_DELAY * 3,
      frightenedTimer: 0,
      eatScore: 200,
    },
  ];
  return ghosts;
}

function initGame(): GameRef {
  const maze = initMaze();
  return {
    maze,
    dots: countDots(maze),
    pacX: 10 * TILE + TILE / 2,
    pacY: 20 * TILE + TILE / 2,
    pacCol: 10,
    pacRow: 20,
    pacDir: null,
    pacNextDir: null,
    pacMouthAngle: 0.25,
    pacMouthDir: 1,
    pacMovProgress: 0,
    ghosts: initGhosts(),
    gameState: "start",
    score: 0,
    lives: 3,
    level: 1,
    frightenedActive: false,
    frightenedTimer: 0,
    frightenedEatCount: 0,
    scatterTimer: 0,
    lastTime: 0,
    frameReq: 0,
    levelCompleteTimer: 0,
    dyingTimer: 0,
    floatingTexts: [],
  };
}

// ─── Ghost BFS pathfinding ─────────────────────────────────────────────────
// Full BFS to find the true shortest path direction, avoiding wall traps
function ghostNextDirBFS(
  ghost: Ghost,
  maze: number[][],
  targetCol: number,
  targetRow: number,
): Direction {
  const { col, row, mode } = ghost;

  // Clamp target to valid maze bounds
  const tc = Math.max(0, Math.min(COLS - 1, targetCol));
  const tr = Math.max(0, Math.min(ROWS - 1, targetRow));

  if (col === tc && row === tr) return ghost.dir ?? "left";

  // BFS
  type Node = { col: number; row: number; firstDir: Direction };
  const visited = new Set<number>();
  const queue: Node[] = [];
  const key = (c: number, r: number) => r * COLS + c;

  visited.add(key(col, row));

  const dirs: Direction[] = ["up", "left", "down", "right"];
  for (const d of dirs) {
    const { dx, dy } = dirToVec(d);
    const nc = col + dx;
    const nr = row + dy;
    const nk = key(nc, nr);
    if (!isWalkableForGhost(maze, nc, nr, mode)) continue;
    if (visited.has(nk)) continue;
    visited.add(nk);
    queue.push({ col: nc, row: nr, firstDir: d });
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.col === tc && node.row === tr) return node.firstDir;

    for (const d of dirs) {
      const { dx, dy } = dirToVec(d);
      const nc = node.col + dx;
      const nr = node.row + dy;
      const nk = key(nc, nr);
      if (!isWalkableForGhost(maze, nc, nr, mode)) continue;
      if (visited.has(nk)) continue;
      visited.add(nk);
      queue.push({ col: nc, row: nr, firstDir: node.firstDir });
    }
  }

  // Target unreachable — pick any non-reverse walkable direction
  const opp = oppositeDir(ghost.dir);
  for (const d of dirs) {
    if (d === opp) continue;
    const { dx, dy } = dirToVec(d);
    if (isWalkableForGhost(maze, col + dx, row + dy, mode)) return d;
  }
  // Last resort: allow reversing
  for (const d of dirs) {
    const { dx, dy } = dirToVec(d);
    if (isWalkableForGhost(maze, col + dx, row + dy, mode)) return d;
  }
  return ghost.dir ?? "left";
}

// ─── Draw Functions ───────────────────────────────────────────────────────────
function drawMaze(
  ctx: CanvasRenderingContext2D,
  maze: number[][],
  level: number,
) {
  // Background
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const wallColor = level > 3 ? "#A06800" : C.wall;
  const wallHighlight = level > 3 ? "#C8860A" : C.wallLight;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = maze[r][c];
      if (t === 1) {
        const x = c * TILE;
        const y = r * TILE;
        ctx.fillStyle = wallColor;
        ctx.fillRect(x, y, TILE, TILE);
        // inner highlight
        ctx.fillStyle = wallHighlight;
        ctx.fillRect(x + 1, y + 1, TILE - 3, 2);
        ctx.fillRect(x + 1, y + 1, 2, TILE - 3);
      }
    }
  }
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  maze: number[][],
  timer: number,
) {
  const pulse = Math.sin(timer * 0.006) * 0.3 + 0.7;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = maze[r][c];
      const cx = c * TILE + TILE / 2;
      const cy = r * TILE + TILE / 2;

      if (t === 0) {
        ctx.fillStyle = C.dot;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (t === 3) {
        ctx.globalAlpha = pulse;
        ctx.fillStyle = C.powerPellet;
        ctx.shadowColor = C.powerPellet;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }
  }
}

function drawPacman(ctx: CanvasRenderingContext2D, g: GameRef, dying: boolean) {
  const { pacX, pacY, pacDir, pacMouthAngle, dyingTimer } = g;
  const r = TILE * 0.45;

  ctx.save();
  ctx.translate(pacX, pacY);

  let angle = 0;
  if (pacDir === "right") angle = 0;
  else if (pacDir === "left") angle = Math.PI;
  else if (pacDir === "up") angle = -Math.PI / 2;
  else if (pacDir === "down") angle = Math.PI / 2;

  if (dying) {
    ctx.rotate(angle);
    const progress = dyingTimer / 800; // 0..1
    const startAngle = -Math.PI * progress;
    const endAngle = Math.PI + Math.PI * progress;
    ctx.fillStyle = C.pacman;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.rotate(angle);
    const mouthRad = pacMouthAngle * Math.PI;

    // Glow
    ctx.shadowColor = C.pacman;
    ctx.shadowBlur = 12;

    // Body
    ctx.fillStyle = C.pacman;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, mouthRad, Math.PI * 2 - mouthRad);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.shadowBlur = 0;
    ctx.strokeStyle = C.pacmanOutline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, mouthRad, Math.PI * 2 - mouthRad);
    ctx.closePath();
    ctx.stroke();

    // Eye
    ctx.fillStyle = C.text;
    ctx.beginPath();
    ctx.arc(r * 0.1, -r * 0.4, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawGhost(
  ctx: CanvasRenderingContext2D,
  ghost: Ghost,
  frightenedActive: boolean,
  frightenedTimer: number,
) {
  const { x, y, mode } = ghost;
  const r = TILE * 0.44;
  const isEaten = mode === "eaten";

  if (isEaten) {
    // Just draw eyes
    drawGhostEyes(ctx, x, y, r, ghost.dir);
    return;
  }

  let bodyColor: string;
  if (mode === "frightened" || (frightenedActive && mode !== "leaving")) {
    // Blink when about to end
    const shouldBlink = frightenedTimer < BLINK_START;
    const blinkOn = shouldBlink ? Math.floor(Date.now() / 200) % 2 === 0 : true;
    bodyColor = blinkOn ? C.frightened : C.frightenedBlink;
  } else {
    bodyColor = ghost.color;
  }

  ctx.save();
  ctx.translate(x, y);

  // Ghost shadow/glow
  if (mode !== "frightened" && !isEaten) {
    ctx.shadowColor = ghost.color;
    ctx.shadowBlur = 8;
  }

  // Ghost body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  // Top semicircle
  ctx.arc(0, -r * 0.15, r, Math.PI, 0);
  // Right side down
  ctx.lineTo(r, r * 0.85);
  // Wavy bottom - 3 bumps
  const bumpW = (r * 2) / 3;
  ctx.quadraticCurveTo(r - bumpW * 0.17, r * 1.05, r - bumpW * 0.5, r * 0.75);
  ctx.quadraticCurveTo(r - bumpW * 0.83, r * 0.45, r - bumpW, r * 0.85);
  ctx.quadraticCurveTo(r - bumpW * 1.17, r * 1.05, r - bumpW * 1.5, r * 0.75);
  ctx.quadraticCurveTo(r - bumpW * 1.83, r * 0.45, r - bumpW * 2, r * 0.85);
  ctx.quadraticCurveTo(r - bumpW * 2.17, r * 1.05, -r, r * 0.75);
  ctx.lineTo(-r, -r * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Eyes
  if (mode === "frightened" || (frightenedActive && mode !== "leaving")) {
    // Frightened face
    ctx.fillStyle = "#A06000";
    // Eyes (dots)
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.2, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.2, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Wavy mouth
    ctx.strokeStyle = "#A06000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 0.2);
    ctx.quadraticCurveTo(-r * 0.2, r * 0.35, 0, r * 0.2);
    ctx.quadraticCurveTo(r * 0.2, r * 0.05, r * 0.4, r * 0.2);
    ctx.stroke();
  } else {
    // Normal eyes
    ctx.fillStyle = C.ghostEyes;
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.2, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.3, -r * 0.2, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (look in direction of movement)
    const { dx, dy } = dirToVec(ghost.dir);
    const pOff = r * 0.1;
    ctx.fillStyle = C.ghostPupil;
    ctx.beginPath();
    ctx.ellipse(
      -r * 0.3 + dx * pOff,
      -r * 0.2 + dy * pOff,
      r * 0.12,
      r * 0.16,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      r * 0.3 + dx * pOff,
      -r * 0.2 + dy * pOff,
      r * 0.12,
      r * 0.16,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.restore();
}

function drawGhostEyes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  dir: Direction,
) {
  ctx.save();
  ctx.translate(x, y);
  const { dx, dy } = dirToVec(dir);
  const pOff = r * 0.1;

  ctx.fillStyle = C.ghostEyes;
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.2, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.3, -r * 0.2, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.ghostPupil;
  ctx.beginPath();
  ctx.ellipse(
    -r * 0.3 + dx * pOff,
    -r * 0.2 + dy * pOff,
    r * 0.12,
    r * 0.16,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(
    r * 0.3 + dx * pOff,
    -r * 0.2 + dy * pOff,
    r * 0.12,
    r * 0.16,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.restore();
}

function drawFloatingTexts(
  ctx: CanvasRenderingContext2D,
  texts: FloatingText[],
) {
  for (const ft of texts) {
    const progress = 1 - ft.timer / ft.maxTimer;
    const alpha = ft.timer / ft.maxTimer;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = C.scoreFlash;
    ctx.font = `bold ${TILE}px 'Cabinet Grotesk', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(ft.text, ft.x, ft.y - progress * 30);
    ctx.globalAlpha = 1;
  }
}

function drawStartScreen(ctx: CanvasRenderingContext2D, timer: number) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Draw some dots as decoration
  for (let i = 0; i < 10; i++) {
    const x = (i * 2 + 1) * TILE + TILE / 2;
    const y = 14 * TILE + TILE / 2;
    ctx.fillStyle = C.dot;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Title shadow
  ctx.fillStyle = "#B07000";
  ctx.font = `bold 36px 'Bricolage Grotesque', system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("MANGO MAN", CANVAS_W / 2 + 2, CANVAS_H / 2 - 58);

  // Title
  ctx.fillStyle = C.pacman;
  ctx.shadowColor = C.pacman;
  ctx.shadowBlur = 20;
  ctx.font = `bold 36px 'Bricolage Grotesque', system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("MANGO MAN", CANVAS_W / 2, CANVAS_H / 2 - 60);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = C.wall;
  ctx.font = `700 16px 'Cabinet Grotesk', system-ui, sans-serif`;
  ctx.fillText("a pac-man adventure", CANVAS_W / 2, CANVAS_H / 2 - 32);

  // Animated pac-man demo
  const demoX = CANVAS_W / 2 + Math.sin(timer * 0.002) * 60;
  ctx.fillStyle = C.pacman;
  ctx.shadowColor = C.pacman;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  const mouth = 0.2 + Math.sin(timer * 0.01) * 0.2;
  ctx.moveTo(demoX, CANVAS_H / 2 + 10);
  ctx.arc(demoX, CANVAS_H / 2 + 10, 14, mouth * Math.PI, (2 - mouth) * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Instructions
  const blink = Math.floor(timer / 500) % 2 === 0;
  if (blink) {
    ctx.fillStyle = C.wall;
    ctx.font = `700 14px 'Cabinet Grotesk', system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(
      "PRESS SPACE OR CLICK TO START",
      CANVAS_W / 2,
      CANVAS_H / 2 + 50,
    );
  }

  // Controls hint
  ctx.fillStyle = C.textLight;
  ctx.font = `500 12px 'Cabinet Grotesk', system-ui, sans-serif`;
  ctx.fillText("Arrow Keys or WASD to move", CANVAS_W / 2, CANVAS_H / 2 + 75);
  ctx.fillText(
    "Swipe or tap buttons on mobile",
    CANVAS_W / 2,
    CANVAS_H / 2 + 92,
  );

  // Ghost row
  const ghostColors = [C.ghost1, C.ghost2, C.ghost3, C.ghost4];
  for (let i = 0; i < 4; i++) {
    const gx = CANVAS_W / 2 - 45 + i * 30;
    const gy = CANVAS_H / 2 - 8;
    drawGhostPreview(ctx, gx, gy, ghostColors[i], 11);
  }
}

function drawGhostPreview(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  r: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -r * 0.15, r, Math.PI, 0);
  ctx.lineTo(r, r * 0.85);
  const bumpW = (r * 2) / 3;
  ctx.quadraticCurveTo(r - bumpW * 0.17, r * 1.05, r - bumpW * 0.5, r * 0.75);
  ctx.quadraticCurveTo(r - bumpW * 0.83, r * 0.45, r - bumpW, r * 0.85);
  ctx.quadraticCurveTo(r - bumpW * 1.17, r * 1.05, r - bumpW * 1.5, r * 0.75);
  ctx.quadraticCurveTo(r - bumpW * 1.83, r * 0.45, r - bumpW * 2, r * 0.85);
  ctx.quadraticCurveTo(r - bumpW * 2.17, r * 1.05, -r, r * 0.75);
  ctx.lineTo(-r, -r * 0.15);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.2, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.3, -r * 0.2, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGameOver(ctx: CanvasRenderingContext2D, score: number) {
  ctx.fillStyle = "rgba(61, 32, 0, 0.75)";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.fillStyle = C.powerPellet;
  ctx.shadowColor = C.powerPellet;
  ctx.shadowBlur = 20;
  ctx.font = `bold 44px 'Bricolage Grotesque', system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 40);
  ctx.shadowBlur = 0;

  ctx.fillStyle = C.pacman;
  ctx.font = `bold 22px 'Bricolage Grotesque', system-ui, sans-serif`;
  ctx.fillText(`SCORE: ${score}`, CANVAS_W / 2, CANVAS_H / 2 + 5);

  ctx.fillStyle = C.dot;
  ctx.font = `700 14px 'Cabinet Grotesk', system-ui, sans-serif`;
  const blink = Math.floor(Date.now() / 500) % 2 === 0;
  if (blink)
    ctx.fillText(
      "PRESS SPACE OR CLICK TO RETRY",
      CANVAS_W / 2,
      CANVAS_H / 2 + 42,
    );
}

function drawLevelComplete(
  ctx: CanvasRenderingContext2D,
  level: number,
  timer: number,
) {
  const alpha = Math.min(1, timer / 200);
  ctx.globalAlpha = alpha * 0.6;
  ctx.fillStyle = "#FFF8E7";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.globalAlpha = 1;

  ctx.fillStyle = C.wall;
  ctx.shadowColor = C.wall;
  ctx.shadowBlur = 16;
  ctx.font = `bold 32px 'Bricolage Grotesque', system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("LEVEL COMPLETE!", CANVAS_W / 2, CANVAS_H / 2 - 20);
  ctx.shadowBlur = 0;

  ctx.fillStyle = C.pacman;
  ctx.font = `bold 20px 'Cabinet Grotesk', system-ui, sans-serif`;
  ctx.fillText(
    `Level ${level + 1} incoming...`,
    CANVAS_W / 2,
    CANVAS_H / 2 + 20,
  );
}

// ─── Ghost Update (module-level for stable useCallback deps) ──────────────────
function updateGhost(ghost: Ghost, dt: number, g: GameRef) {
  const { maze, pacCol, pacRow } = g;

  // While waiting to leave the house, bounce up/down inside it
  if (ghost.exitDelay > 0) {
    ghost.exitDelay -= dt;
    // Bounce the ghost up and down inside the house so it visibly moves
    const bounceSpeed = GHOST_SPEED_LEAVING * TILE * (dt / 1000);
    if (ghost.dir === "up") {
      ghost.y -= bounceSpeed;
      if (ghost.y <= 9 * TILE + TILE / 2) {
        ghost.y = 9 * TILE + TILE / 2;
        ghost.dir = "down";
      }
    } else {
      ghost.y += bounceSpeed;
      if (ghost.y >= 11 * TILE + TILE / 2) {
        ghost.y = 11 * TILE + TILE / 2;
        ghost.dir = "up";
      }
    }
    ghost.col = Math.floor(ghost.x / TILE);
    ghost.row = Math.floor(ghost.y / TILE);
    if (ghost.exitDelay <= 0) {
      ghost.exitDelay = 0;
      ghost.mode = "leaving";
    }
    return;
  }

  // Update frightened timer
  if (ghost.mode === "frightened") {
    ghost.frightenedTimer -= dt;
    if (ghost.frightenedTimer <= 0) {
      ghost.mode = "scatter";
    }
  }

  // Speed based on mode
  let speed: number;
  if (ghost.mode === "frightened") speed = FRIGHTENED_SPEED;
  else if (ghost.mode === "leaving" || ghost.mode === "eaten")
    speed = GHOST_SPEED_LEAVING;
  else speed = GHOST_SPEED;

  const pixelSpeed = speed * TILE * (dt / 1000);

  // ── Leaving mode: navigate out of the ghost house step by step ─────────────
  // Exit path:
  //   Phase 1: center on col 10 (x = 10*TILE+TILE/2)
  //   Phase 2: move up through door (rows 9->8->7) to row 6 (open maze)
  //   Done: switch to scatter mode
  if (ghost.mode === "leaving") {
    const centerX = 10 * TILE + TILE / 2; // col 10 – aligns with door
    const openY = 6 * TILE + TILE / 2; // row 6 (open maze corridor above door)

    const snap = (v: number, target: number) =>
      Math.abs(v - target) < pixelSpeed ? target : v;

    // Phase 1: align to center column (col 10, above the door)
    if (Math.abs(ghost.x - centerX) > 2) {
      const dx = ghost.x < centerX ? 1 : -1;
      ghost.x = snap(ghost.x + dx * pixelSpeed, centerX);
      ghost.dir = dx > 0 ? "right" : "left";
    }
    // Phase 2: move straight up through door to open maze at row 6
    else if (ghost.y > openY + 2) {
      ghost.x = centerX;
      ghost.col = 10;
      ghost.y = snap(ghost.y - pixelSpeed, openY);
      ghost.dir = "up";
    } else {
      // Done -- ghost is now in the open maze at col 10, row 6
      ghost.x = centerX;
      ghost.y = openY;
      ghost.col = 10;
      ghost.row = 6;
      ghost.dir = "left";
      ghost.mode = "scatter";
    }

    ghost.col = Math.floor(ghost.x / TILE);
    ghost.row = Math.floor(ghost.y / TILE);
    return;
  }

  // Check if eaten ghost reached house entrance (row 9, col 10 = door area)
  if (ghost.mode === "eaten") {
    const houseEnterX = 10 * TILE + TILE / 2;
    const houseEnterY = 10 * TILE + TILE / 2;
    const distToHouse =
      Math.abs(ghost.x - houseEnterX) + Math.abs(ghost.y - houseEnterY);
    if (distToHouse < pixelSpeed + 4) {
      ghost.x = houseEnterX;
      ghost.y = houseEnterY;
      ghost.col = 10;
      ghost.row = 10;
      ghost.mode = "leaving";
      ghost.exitDelay = 1500;
      return;
    }
  }

  // Determine target tile for scatter/chase/frightened/eaten
  let targetCol: number;
  let targetRow: number;

  if (ghost.mode === "eaten") {
    targetCol = 10;
    targetRow = 10; // aim for center of ghost house
  } else if (ghost.mode === "frightened") {
    // Random flee: pick a random corner each time (evaluated at tile center)
    const corners = [
      { c: 1, r: 1 },
      { c: COLS - 2, r: 1 },
      { c: 1, r: ROWS - 2 },
      { c: COLS - 2, r: ROWS - 2 },
    ];
    const corner = corners[Math.floor(Math.random() * corners.length)];
    targetCol = corner.c;
    targetRow = corner.r;
  } else if (ghost.mode === "chase") {
    targetCol = pacCol;
    targetRow = pacRow;
  } else {
    // scatter
    targetCol = ghost.scatterTarget.x;
    targetRow = ghost.scatterTarget.y;
  }

  // ── Tile-center-to-tile-center movement ──────────────────────────────────
  // Ghost stores its current tile (col, row) and moves toward the center of
  // that tile. When it reaches center it picks the next tile.
  const tileCenterX = ghost.col * TILE + TILE / 2;
  const tileCenterY = ghost.row * TILE + TILE / 2;
  const distToCenter =
    Math.abs(ghost.x - tileCenterX) + Math.abs(ghost.y - tileCenterY);

  if (distToCenter <= pixelSpeed + 0.5) {
    // Snap exactly to this tile center
    ghost.x = tileCenterX;
    ghost.y = tileCenterY;

    // Pick next direction using BFS
    const newDir = ghostNextDirBFS(ghost, maze, targetCol, targetRow);
    ghost.dir = newDir;
    ghost.nextDir = newDir;

    // Advance to next tile
    const { dx, dy } = dirToVec(ghost.dir);
    const nc = ghost.col + dx;
    const nr = ghost.row + dy;
    if (isWalkableForGhost(maze, nc, nr, ghost.mode)) {
      ghost.col = nc;
      ghost.row = nr;
    }
  }

  // Move toward the current target tile center
  const nextCenterX = ghost.col * TILE + TILE / 2;
  const nextCenterY = ghost.row * TILE + TILE / 2;
  const dx = nextCenterX - ghost.x;
  const dy = nextCenterY - ghost.y;
  const dist = Math.abs(dx) + Math.abs(dy);

  if (dist > 0) {
    const moveX = dist > 0 ? (dx / dist) * Math.min(pixelSpeed, dist) : 0;
    const moveY = dist > 0 ? (dy / dist) * Math.min(pixelSpeed, dist) : 0;
    ghost.x += moveX;
    ghost.y += moveY;
  }

  // Tunnel wrap (row 10 corridor)
  if (ghost.x < 0) {
    ghost.x = CANVAS_W;
    ghost.col = COLS - 1;
  }
  if (ghost.x > CANVAS_W) {
    ghost.x = 0;
    ghost.col = 0;
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PacmanGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameRef>(initGame());
  const timerRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const isMobile = useIsMobile();

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>("start");
  const [hiScore, setHiScore] = useState(0);

  // ── Start / Restart ────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const g = gameRef.current;
    const newGame = initGame();
    newGame.gameState = "playing";
    newGame.score = g.score; // carry score on same session? No, fresh
    newGame.score = 0;
    newGame.lives = 3;
    newGame.level = 1;
    Object.assign(g, newGame);
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameState("playing");
    canvasRef.current?.focus();
  }, []);

  const handleCanvasClick = useCallback(() => {
    const g = gameRef.current;
    if (g.gameState === "start" || g.gameState === "gameover") {
      startGame();
    }
    canvasRef.current?.focus();
  }, [startGame]);

  // ── Input ──────────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const g = gameRef.current;
      const key = e.key;

      if (key === " " || key === "Enter") {
        e.preventDefault();
        if (g.gameState === "start" || g.gameState === "gameover") {
          startGame();
        }
        return;
      }

      let dir: Direction = null;
      if (key === "ArrowLeft" || key === "a" || key === "A") {
        dir = "left";
        e.preventDefault();
      } else if (key === "ArrowRight" || key === "d" || key === "D") {
        dir = "right";
        e.preventDefault();
      } else if (key === "ArrowUp" || key === "w" || key === "W") {
        dir = "up";
        e.preventDefault();
      } else if (key === "ArrowDown" || key === "s" || key === "S") {
        dir = "down";
        e.preventDefault();
      }

      if (dir) {
        g.pacNextDir = dir;
      }
    },
    [startGame],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Touch controls ─────────────────────────────────────────────────────────
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      const g = gameRef.current;
      if (g.gameState === "start" || g.gameState === "gameover") {
        startGame();
      }
    },
    [startGame],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      touchStartRef.current = null;

      const MIN_SWIPE = 20;
      if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) return;

      const g = gameRef.current;
      if (Math.abs(dx) >= Math.abs(dy)) {
        g.pacNextDir = dx > 0 ? "right" : "left";
      } else {
        g.pacNextDir = dy > 0 ? "down" : "up";
      }
    },
    [],
  );

  // D-pad button press handler
  const handleDpadPress = useCallback(
    (dir: Direction) => {
      const g = gameRef.current;
      if (g.gameState === "start" || g.gameState === "gameover") {
        startGame();
        return;
      }
      g.pacNextDir = dir;
    },
    [startGame],
  );

  // ── Game loop ──────────────────────────────────────────────────────────────
  const gameLoop = useCallback(
    (timestamp: number) => {
      const g = gameRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      timerRef.current = timestamp;

      if (g.gameState === "start") {
        drawStartScreen(ctx, timestamp);
        g.frameReq = requestAnimationFrame(gameLoop);
        return;
      }

      if (g.gameState === "gameover") {
        drawMaze(ctx, g.maze, g.level);
        drawDots(ctx, g.maze, timestamp);
        drawGameOver(ctx, g.score);
        g.frameReq = requestAnimationFrame(gameLoop);
        return;
      }

      const dt = g.lastTime > 0 ? Math.min(timestamp - g.lastTime, 50) : 16;
      g.lastTime = timestamp;

      if (g.gameState === "levelcomplete") {
        g.levelCompleteTimer += dt;
        drawMaze(ctx, g.maze, g.level);
        drawLevelComplete(ctx, g.level, g.levelCompleteTimer);
        if (g.levelCompleteTimer > 2500) {
          // Next level
          g.level++;
          g.maze = initMaze();
          g.dots = countDots(g.maze);
          g.pacX = 10 * TILE + TILE / 2;
          g.pacY = 20 * TILE + TILE / 2;
          g.pacCol = 10;
          g.pacRow = 20;
          g.pacDir = null;
          g.pacNextDir = null;
          g.ghosts = initGhosts();
          g.frightenedActive = false;
          g.frightenedTimer = 0;
          g.scatterTimer = 0;
          g.levelCompleteTimer = 0;
          g.gameState = "playing";
          setLevel(g.level);
          setGameState("playing");
        }
        g.frameReq = requestAnimationFrame(gameLoop);
        return;
      }

      if (g.gameState === "dying") {
        g.dyingTimer += dt;
        drawMaze(ctx, g.maze, g.level);
        drawDots(ctx, g.maze, timestamp);
        // Draw ghosts fading
        for (const ghost of g.ghosts) {
          ctx.globalAlpha = Math.max(0, 1 - g.dyingTimer / 400);
          drawGhost(ctx, ghost, false, 0);
          ctx.globalAlpha = 1;
        }
        drawPacman(ctx, g, true);

        if (g.dyingTimer > 800) {
          g.lives--;
          setLives(g.lives);
          if (g.lives <= 0) {
            g.gameState = "gameover";
            setGameState("gameover");
            if (g.score > hiScore) setHiScore(g.score);
          } else {
            // Reset positions
            g.pacX = 10 * TILE + TILE / 2;
            g.pacY = 20 * TILE + TILE / 2;
            g.pacCol = 10;
            g.pacRow = 20;
            g.pacDir = null;
            g.pacNextDir = null;
            g.ghosts = initGhosts();
            g.frightenedActive = false;
            g.frightenedTimer = 0;
            g.scatterTimer = 0;
            g.dyingTimer = 0;
            g.gameState = "playing";
            setGameState("playing");
          }
        }

        g.frameReq = requestAnimationFrame(gameLoop);
        return;
      }

      // ── Playing ──────────────────────────────────────────────────────────────
      // Update frightened timer
      if (g.frightenedActive) {
        g.frightenedTimer -= dt;
        if (g.frightenedTimer <= 0) {
          g.frightenedActive = false;
          g.frightenedEatCount = 0;
          for (const ghost of g.ghosts) {
            if (ghost.mode === "frightened") ghost.mode = "scatter";
          }
        }
      }

      // Scatter / chase cycle (only when not frightened)
      if (!g.frightenedActive) {
        g.scatterTimer += dt;
        const cyclePos = g.scatterTimer % (SCATTER_DURATION + CHASE_DURATION);
        const shouldChase = cyclePos >= SCATTER_DURATION;
        for (const ghost of g.ghosts) {
          // Don't switch modes for ghosts still waiting/leaving the house
          if (
            ghost.exitDelay > 0 ||
            ghost.mode === "leaving" ||
            ghost.mode === "eaten"
          )
            continue;
          if (ghost.mode === "scatter" && shouldChase) {
            ghost.mode = "chase";
          } else if (ghost.mode === "chase" && !shouldChase) {
            ghost.mode = "scatter";
            ghost.dir = oppositeDir(ghost.dir) ?? ghost.dir; // reverse on switch
          }
        }
      }

      // Update pac-man mouth
      g.pacMouthAngle += g.pacMouthDir * 0.07;
      if (g.pacMouthAngle >= 0.35) g.pacMouthDir = -1;
      if (g.pacMouthAngle <= 0.02) g.pacMouthDir = 1;

      // Move pac-man (tile-center-to-tile-center approach)
      if (g.pacDir !== null || g.pacNextDir !== null) {
        const speed = PACMAN_SPEED * TILE * (dt / 1000);
        const targetX = g.pacCol * TILE + TILE / 2;
        const targetY = g.pacRow * TILE + TILE / 2;
        const distToTarget =
          Math.abs(g.pacX - targetX) + Math.abs(g.pacY - targetY);

        if (distToTarget <= speed) {
          // Snap exactly to tile center
          g.pacX = targetX;
          g.pacY = targetY;

          // Try to turn into pacNextDir
          let turned = false;
          if (g.pacNextDir) {
            const { dx, dy } = dirToVec(g.pacNextDir);
            const nc = g.pacCol + dx;
            const nr = g.pacRow + dy;
            if (isWalkableForPacman(g.maze, nc, nr)) {
              g.pacDir = g.pacNextDir;
              g.pacCol = nc;
              g.pacRow = nr;
              turned = true;
            }
          }

          // If didn't turn, try to continue in current dir
          if (!turned && g.pacDir) {
            const { dx, dy } = dirToVec(g.pacDir);
            const nc = g.pacCol + dx;
            const nr = g.pacRow + dy;
            if (isWalkableForPacman(g.maze, nc, nr)) {
              g.pacCol = nc;
              g.pacRow = nr;
            }
            // Don't null out pacDir -- keep trying so Pac-Man resumes
            // as soon as the corner clears. pacNextDir is also kept alive
            // so the queued turn fires on the next valid tile.
          }

          // If pacDir was null (waiting for first key press)
          if (g.pacDir === null && g.pacNextDir) {
            const { dx, dy } = dirToVec(g.pacNextDir);
            const nc = g.pacCol + dx;
            const nr = g.pacRow + dy;
            if (isWalkableForPacman(g.maze, nc, nr)) {
              g.pacDir = g.pacNextDir;
              g.pacCol = nc;
              g.pacRow = nr;
            }
          }
        } else {
          // Move toward current target tile center
          if (g.pacDir) {
            const { dx, dy } = dirToVec(g.pacDir);
            g.pacX += dx * speed;
            g.pacY += dy * speed;
          }
        }

        // Tunnel wrap
        if (g.pacX < 0) {
          g.pacX = CANVAS_W;
          g.pacCol = COLS - 1;
        }
        if (g.pacX > CANVAS_W) {
          g.pacX = 0;
          g.pacCol = 0;
        }
      }

      // Eat dots — only eat when Pac-Man is snapped to a tile center
      const pacCenterX = g.pacCol * TILE + TILE / 2;
      const pacCenterY = g.pacRow * TILE + TILE / 2;
      const snapDist =
        Math.abs(g.pacX - pacCenterX) + Math.abs(g.pacY - pacCenterY);
      const atCenter = snapDist < 2;

      if (atCenter) {
        const pc = g.pacCol;
        const pr = g.pacRow;
        const tile = g.maze[pr]?.[pc];

        if (tile === 0) {
          g.maze[pr][pc] = 5; // 5 = eaten dot (walkable empty)
          g.dots--;
          g.score += 10;
          setScore(g.score);
        } else if (tile === 3) {
          g.maze[pr][pc] = 5; // 5 = eaten power pellet (walkable empty)
          g.dots--;
          g.score += 50;
          setScore(g.score);
          g.frightenedActive = true;
          g.frightenedTimer = FRIGHTENED_DURATION;
          g.frightenedEatCount = 0;
          for (const ghost of g.ghosts) {
            if (ghost.mode !== "eaten" && ghost.mode !== "leaving") {
              ghost.mode = "frightened";
              ghost.frightenedTimer = FRIGHTENED_DURATION;
              ghost.dir = oppositeDir(ghost.dir);
            }
          }
        }
      }

      // Level complete
      if (g.dots <= 0) {
        g.gameState = "levelcomplete";
        g.levelCompleteTimer = 0;
        setGameState("levelcomplete");
      }

      // Collide with ghosts
      for (const ghost of g.ghosts) {
        const distX = Math.abs(ghost.x - g.pacX);
        const distY = Math.abs(ghost.y - g.pacY);
        const dist = Math.sqrt(distX * distX + distY * distY);

        if (dist < TILE * 0.75) {
          if (ghost.mode === "frightened") {
            // Eat ghost
            const pts = 200 * 2 ** g.frightenedEatCount;
            g.frightenedEatCount++;
            g.score += pts;
            setScore(g.score);
            ghost.mode = "eaten";
            g.floatingTexts.push({
              x: ghost.x,
              y: ghost.y,
              text: `+${pts}`,
              timer: 800,
              maxTimer: 800,
            });
          } else if (ghost.mode !== "eaten" && ghost.mode !== "leaving") {
            // Die
            g.gameState = "dying";
            g.dyingTimer = 0;
            setGameState("dying");
          }
        }
      }

      // Update ghosts
      for (const ghost of g.ghosts) {
        updateGhost(ghost, dt, g);
      }

      // Update floating texts
      g.floatingTexts = g.floatingTexts.filter((ft) => {
        ft.timer -= dt;
        return ft.timer > 0;
      });

      // ── Render ────────────────────────────────────────────────────────────────
      drawMaze(ctx, g.maze, g.level);
      drawDots(ctx, g.maze, timestamp);

      for (const ghost of g.ghosts) {
        drawGhost(ctx, ghost, g.frightenedActive, g.frightenedTimer);
      }

      if (g.gameState === "playing") {
        drawPacman(ctx, g, false);
      }

      drawFloatingTexts(ctx, g.floatingTexts);

      g.frameReq = requestAnimationFrame(gameLoop);
    },
    [hiScore],
  );

  useEffect(() => {
    const g = gameRef.current;
    g.frameReq = requestAnimationFrame(gameLoop);
    canvasRef.current?.focus();

    return () => {
      cancelAnimationFrame(g.frameReq);
    };
  }, [gameLoop]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center min-h-screen bg-mango-50 font-body">
      {/* Header */}
      <header className="w-full max-w-lg px-4 pt-6 pb-2 flex items-center justify-between">
        <div>
          <h1 className="font-game text-2xl font-black text-mango-800 leading-none tracking-tight">
            MANGO<span className="text-mango-500"> MAN</span>
          </h1>
          <p className="text-xs text-mango-600 font-medium mt-0.5">
            a pac-man adventure
          </p>
        </div>
        {hiScore > 0 && (
          <div className="text-right">
            <div className="text-xs text-mango-500 font-semibold uppercase tracking-wider">
              Best
            </div>
            <div className="text-lg font-black text-mango-700">
              {hiScore.toLocaleString()}
            </div>
          </div>
        )}
      </header>

      {/* HUD */}
      <div
        className="w-full max-w-lg px-4 py-2 flex items-center justify-between"
        data-ocid="pacman.score_panel"
      >
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-mango-500 uppercase tracking-wider">
            Score
          </span>
          <span className="text-2xl font-black text-mango-800 tabular-nums">
            {score.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold text-mango-500 uppercase tracking-wider">
            Level
          </span>
          <span className="text-2xl font-black text-mango-800">{level}</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold text-mango-500 uppercase tracking-wider">
            Lives
          </span>
          <div className="flex gap-1 mt-0.5">
            {["life-1", "life-2", "life-3"]
              .slice(0, Math.max(0, lives))
              .map((key) => (
                <svg
                  key={key}
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  role="img"
                  aria-label="life"
                >
                  <title>life</title>
                  <circle cx="9" cy="9" r="7" fill={C.pacman} />
                  <path d="M9 9 L16 6.5 A7 7 0 0 0 9 2 Z" fill="#FFF8E7" />
                </svg>
              ))}
            {lives <= 0 && <span className="text-mango-400 text-sm">—</span>}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <main className="flex-1 flex items-start justify-center px-4 pb-4">
        <div className="relative">
          {/* Decorative border */}
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-mango-300 via-mango-400 to-mango-600 opacity-50 blur-sm" />
          <div className="relative rounded-xl overflow-hidden shadow-mango-lg border-2 border-mango-400">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              tabIndex={0}
              onClick={handleCanvasClick}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") handleCanvasClick();
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              data-ocid="pacman.canvas_target"
              className="block cursor-pointer focus:outline-none touch-none"
              style={{
                maxWidth: "100%",
                maxHeight: "calc(100vh - 200px)",
                imageRendering: "pixelated",
              }}
            />
          </div>
        </div>
      </main>

      {/* Start / Restart button (shown outside canvas too) */}
      {(gameState === "start" || gameState === "gameover") && (
        <div className="pb-4">
          <button
            type="button"
            onClick={startGame}
            data-ocid="pacman.start_button"
            className="px-8 py-3 bg-mango-500 hover:bg-mango-600 text-white font-black text-sm uppercase tracking-widest rounded-full shadow-mango transition-all duration-150 active:scale-95 hover:shadow-mango-lg"
          >
            {gameState === "gameover" ? "Play Again" : "Start Game"}
          </button>
        </div>
      )}

      {/* Mobile D-pad controls */}
      {isMobile && (
        <div className="pb-4 px-4 w-full max-w-xs flex flex-col items-center gap-1 select-none">
          {/* Up */}
          <div className="flex justify-center">
            <button
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                handleDpadPress("up");
              }}
              onClick={() => handleDpadPress("up")}
              data-ocid="pacman.dpad_up_button"
              className="w-14 h-14 flex items-center justify-center bg-mango-400 hover:bg-mango-500 active:bg-mango-600 active:scale-95 text-white rounded-xl shadow-md transition-all duration-75 text-2xl font-black border-2 border-mango-500"
              aria-label="Move up"
            >
              ▲
            </button>
          </div>
          {/* Left / Down / Right row */}
          <div className="flex justify-center gap-1">
            <button
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                handleDpadPress("left");
              }}
              onClick={() => handleDpadPress("left")}
              data-ocid="pacman.dpad_left_button"
              className="w-14 h-14 flex items-center justify-center bg-mango-400 hover:bg-mango-500 active:bg-mango-600 active:scale-95 text-white rounded-xl shadow-md transition-all duration-75 text-2xl font-black border-2 border-mango-500"
              aria-label="Move left"
            >
              ◀
            </button>
            {/* Center dead zone */}
            <div className="w-14 h-14 rounded-xl bg-mango-100 border-2 border-mango-200 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-mango-300" />
            </div>
            <button
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                handleDpadPress("right");
              }}
              onClick={() => handleDpadPress("right")}
              data-ocid="pacman.dpad_right_button"
              className="w-14 h-14 flex items-center justify-center bg-mango-400 hover:bg-mango-500 active:bg-mango-600 active:scale-95 text-white rounded-xl shadow-md transition-all duration-75 text-2xl font-black border-2 border-mango-500"
              aria-label="Move right"
            >
              ▶
            </button>
          </div>
          {/* Down */}
          <div className="flex justify-center">
            <button
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                handleDpadPress("down");
              }}
              onClick={() => handleDpadPress("down")}
              data-ocid="pacman.dpad_down_button"
              className="w-14 h-14 flex items-center justify-center bg-mango-400 hover:bg-mango-500 active:bg-mango-600 active:scale-95 text-white rounded-xl shadow-md transition-all duration-75 text-2xl font-black border-2 border-mango-500"
              aria-label="Move down"
            >
              ▼
            </button>
          </div>
        </div>
      )}

      {/* Controls info */}
      <footer className="w-full max-w-lg px-4 pt-1 pb-4">
        <div className="flex items-center justify-center gap-6 text-xs text-mango-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-mango-100 border border-mango-300 rounded text-mango-700 font-mono text-xs">
              ↑↓←→
            </kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 bg-mango-100 border border-mango-300 rounded text-mango-700 font-mono text-xs">
              WASD
            </kbd>
            <span>Move</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-mango-100 border border-mango-300 rounded text-mango-700 font-mono text-xs">
              Space
            </kbd>
            <span>Start</span>
          </span>
        </div>

        {/* Footer */}
        <div className="text-center mt-3 text-xs text-mango-400">
          © {new Date().getFullYear()}. Built with{" "}
          <span className="text-mango-500">♥</span> using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-mango-500 hover:text-mango-700 underline underline-offset-2 transition-colors"
          >
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
