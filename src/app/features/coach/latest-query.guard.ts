export class LatestQueryGuard {
  private sequence = 0;
  private activeKey = '';

  begin(key: string): number | null {
    if (key === this.activeKey) return null;
    this.activeKey = key;
    return ++this.sequence;
  }

  isCurrent(request: number): boolean { return request === this.sequence; }

  finish(request: number): void {
    if (this.isCurrent(request)) this.activeKey = '';
  }
}
