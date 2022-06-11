export class Point {
  constructor(public readonly x: number, public readonly y: number) {}

  static get zero(): Point {
    return new Point(0, 0)
  }

  static get west(): Point {
    return new Point(-1, 0)
  }

  static get east(): Point {
    return new Point(1, 0)
  }

  static get north(): Point {
    return new Point(0, -1)
  }

  static get south(): Point {
    return new Point(0, 1)
  }

  static from(value: string): Point {
    const [x, y] = value.split(',').map((v) => parseInt(v, 10))
    return new Point(x, y)
  }

  static surround(size: number): Point[] {
    const points = []
    // top and bottom
    for (let x = 0; x < size; x++) {
      points.push(new Point(x, 0), new Point(x, size - 1))
    }
    // middle rows
    for (let y = 1; y < size - 1; y++) {
      points.push(new Point(0, y), new Point(size - 1, y))
    }
    return points
  }

  clamp(size: number): Point {
    return new Point(
      Math.max(0, Math.min(size - 1, this.x)),
      Math.max(0, Math.min(size - 1, this.y))
    )
  }

  add(other: Point): Point {
    return new Point(this.x + other.x, this.y + other.y)
  }

  sub(other: Point): Point {
    return new Point(this.x - other.x, this.y - other.y)
  }

  mul(other: Point): Point {
    return new Point(this.x * other.x, this.y * other.y)
  }

  div(other: Point): Point {
    return new Point(this.x / other.x, this.y / other.y)
  }

  equals(other: Point): boolean {
    return this.x === other.x && this.y === other.y
  }

  toString(): string {
    return `Point(${this.x}, ${this.y})`
  }

  left(): Point {
    // rotate 90 degrees counter-clockwise
    return new Point(this.y, -this.x)
  }

  right(): Point {
    // rotate 90 degrees clockwise
    return new Point(-this.y, this.x)
  }

  get zero(): boolean {
    return this.x === 0 && this.y === 0
  }

  get north(): boolean {
    return this.x === 0 && this.y === -1
  }

  get south(): boolean {
    return this.x === 0 && this.y === 1
  }

  get west(): boolean {
    return this.x === -1 && this.y === 0
  }
}
