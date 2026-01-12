import fs from 'fs/promises';

export enum CellType {
  Path = ' ',
  Wall = '#',
  Start = 'S',
  Goal = 'G',
}

export interface Position {
  x: number;
  y: number;
}

export interface Direction {
  dx: number;
  dy: number;
}

type DistanceMap = Map<string, number>;

export class Maze {
  private readonly grid: CellType[][];
  public readonly layout: string[];
  public readonly startPosition: Position;
  public readonly goalPosition: Position;
  public readonly height: number;
  public readonly width: number;
  public readonly pathCount: number;
  private distancesToGoal?: DistanceMap;
  private pathsFromStart?: Map<string, Position[]>;

  static async fromFile(filePath: string): Promise<Maze> {
    const content = await fs.readFile(filePath, 'utf-8');
    const layout = content.split('\n').filter((line) => line.length > 0);
    return new Maze(layout);
  }

  constructor(layout: string[]) {
    this.layout = layout;
    if (layout.length === 0) {
      throw new Error('Maze layout cannot be empty.');
    }

    this.height = layout.length;
    this.width = layout[0].length;
    this.grid = [];

    let start: Position | null = null;
    let goal: Position | null = null;
    let pathCount = 0;

    for (let y = 0; y < this.height; y++) {
      const row: CellType[] = [];
      for (let x = 0; x < this.width; x++) {
        const char = layout[y][x];
        let cell: CellType;

        switch (char) {
          case '#':
            cell = CellType.Wall;
            break;
          case 'S':
            cell = CellType.Start;
            if (start) throw new Error('Multiple start positions found.');
            start = { x, y };
            break;
          case 'G':
            cell = CellType.Goal;
            if (goal) throw new Error('Multiple goal positions found.');
            goal = { x, y };
            break;
          case ' ':
          default:
            cell = CellType.Path;
            pathCount++;
            break;
        }
        row.push(cell);
      }
      this.grid.push(row);
    }

    if (!start) throw new Error('No start position found.');
    if (!goal) throw new Error('No goal position found.');
    this.startPosition = start;
    this.goalPosition = goal;
    this.pathCount = pathCount;
  }

  public getCellType(position: Position): CellType | undefined {
    if (position.y < 0 || position.y >= this.height || position.x < 0 || position.x >= this.width) {
      return undefined;
    }
    return this.grid[position.y][position.x];
  }

  public isWalkable(position: Position): boolean {
    const cellType = this.getCellType(position);
    return cellType !== undefined && cellType !== CellType.Wall;
  }

  public getDirectionsToGoal(position: Position): Direction[] {
    if (!this.distancesToGoal) {
      this.distancesToGoal = this.calculateDistancesToGoal();
    }

    const posKey = `${position.x},${position.y}`;
    const distance = this.distancesToGoal.get(posKey);
    if (distance === undefined) {
      return [];
    }

    const directions: Direction[] = [];

    const upDist = this.distancesToGoal.get(`${position.x},${position.y - 1}`);
    if (upDist !== undefined && upDist < distance) {
      directions.push({ dx: 0, dy: -1 });
    }
    const downDist = this.distancesToGoal.get(`${position.x},${position.y + 1}`);
    if (downDist !== undefined && downDist < distance) {
      directions.push({ dx: 0, dy: 1 });
    }
    const leftDist = this.distancesToGoal.get(`${position.x - 1},${position.y}`);
    if (leftDist !== undefined && leftDist < distance) {
      directions.push({ dx: -1, dy: 0 });
    }
    const rightDist = this.distancesToGoal.get(`${position.x + 1},${position.y}`);
    if (rightDist !== undefined && rightDist < distance) {
      directions.push({ dx: 1, dy: 0 });
    }

    return directions;
  }

  public getPathFromStart(position: Position): Position[] {
    if (!this.pathsFromStart) {
      this.pathsFromStart = this.calculatePathsFromStart();
    }

    const posKey = `${position.x},${position.y}`;
    return this.pathsFromStart.get(posKey) ?? [position];
  }

  private calculateDistancesToGoal(): DistanceMap {
    const distances: DistanceMap = new Map();
    const queue: Position[] = [this.goalPosition];
    const goalKey = `${this.goalPosition.x},${this.goalPosition.y}`;

    distances.set(goalKey, 0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentKey = `${current.x},${current.y}`;
      const currentDistance = distances.get(currentKey)!;

      const neighbors: Position[] = [
        { x: current.x, y: current.y - 1 }, // up
        { x: current.x, y: current.y + 1 }, // down
        { x: current.x - 1, y: current.y }, // left
        { x: current.x + 1, y: current.y }, // right
      ];

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (this.isWalkable(neighbor) && !distances.has(neighborKey)) {
          distances.set(neighborKey, currentDistance + 1);
          queue.push(neighbor);
        }
      }
    }

    return distances;
  }

  private calculatePathsFromStart(): Map<string, Position[]> {
    const pathMap = new Map<string, Position[]>();
    const parentMap = new Map<string, Position | null>();
    const costMap = new Map<string, number>();
    const startKey = `${this.startPosition.x},${this.startPosition.y}`;
    const goalKey = `${this.goalPosition.x},${this.goalPosition.y}`;

    // Cost to pass through goal is high (total cells) to prefer paths that avoid G
    const goalPassCost = this.width * this.height;

    // Priority queue: [cost, position]
    const queue: Array<{ cost: number; pos: Position }> = [{ cost: 0, pos: this.startPosition }];
    parentMap.set(startKey, null);
    costMap.set(startKey, 0);

    while (queue.length > 0) {
      // Find minimum cost entry
      let minIdx = 0;
      for (let i = 1; i < queue.length; i++) {
        if (queue[i].cost < queue[minIdx].cost) minIdx = i;
      }
      const { cost: currentCost, pos: current } = queue.splice(minIdx, 1)[0];
      const currentKey = `${current.x},${current.y}`;

      // Skip if we've already found a better path
      if (costMap.has(currentKey) && costMap.get(currentKey)! < currentCost) continue;

      const dx = Math.abs(this.goalPosition.x - current.x);
      const dy = Math.abs(this.goalPosition.y - current.y);

      // Reduce dependency on maze orientation
      const neighbors: Position[] =
        dy >= dx
          ? [
              { x: current.x, y: current.y - 1 }, // up
              { x: current.x, y: current.y + 1 }, // down
              { x: current.x - 1, y: current.y }, // left
              { x: current.x + 1, y: current.y }, // right
            ]
          : [
              { x: current.x - 1, y: current.y }, // left
              { x: current.x + 1, y: current.y }, // right
              { x: current.x, y: current.y - 1 }, // up
              { x: current.x, y: current.y + 1 }, // down
            ];

      for (const neighbor of neighbors) {
        if (!this.isWalkable(neighbor)) continue;

        const neighborKey = `${neighbor.x},${neighbor.y}`;
        // Add high cost when passing through goal (current is goal and moving to neighbor)
        const stepCost = currentKey === goalKey ? goalPassCost : 1;
        const newCost = currentCost + stepCost;

        if (!costMap.has(neighborKey) || newCost < costMap.get(neighborKey)!) {
          costMap.set(neighborKey, newCost);
          parentMap.set(neighborKey, current);
          queue.push({ cost: newCost, pos: neighbor });
        }
      }
    }

    // Convert parent pointers to path arrays
    for (const [posKey] of parentMap) {
      const path: Position[] = [];
      const [x, y] = posKey.split(',').map(Number);
      let current: Position | null = { x, y };

      while (current !== null) {
        path.unshift(current);
        const key: string = `${current.x},${current.y}`;
        current = parentMap.get(key) ?? null;
      }

      pathMap.set(posKey, path);
    }

    return pathMap;
  }
}
