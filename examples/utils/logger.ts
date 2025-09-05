export interface LoggerOptions {
  showTimestamps?: boolean;
  showDuration?: boolean;
}

export class ExampleLogger {
  private startTime: number = Date.now();
  private options: Required<LoggerOptions>;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      showTimestamps: options.showTimestamps ?? false,
      showDuration: options.showDuration ?? true,
    };
  }

  private formatTime(): string {
    if (!this.options.showTimestamps) return '';
    return `[${new Date().toLocaleTimeString()}] `;
  }

  private formatDuration(startTime: number): string {
    if (!this.options.showDuration) return '';
    const duration = Date.now() - startTime;
    return ` [${duration}ms]`;
  }

  header(title: string): void {
    console.log(`\n🚀 ${title}`);
    console.log('━'.repeat(60));
  }

  section(title: string): void {
    console.log(`\n${title}`);
  }

  success(message: string, duration?: number): void {
    const time = this.formatTime();
    const dur = duration ? ` [${duration}ms]` : '';
    console.log(`${time}├─ ✅ ${message}${dur}`);
  }

  error(message: string, error?: any): void {
    const time = this.formatTime();
    console.log(`${time}├─ ❌ ${message}`);
    if (error) {
      console.log(`${time}│   ${error.message || error}`);
    }
  }

  info(message: string): void {
    const time = this.formatTime();
    console.log(`${time}├─ ℹ️  ${message}`);
  }

  warning(message: string): void {
    const time = this.formatTime();
    console.log(`${time}├─ ⚠️  ${message}`);
  }

  final(message: string): void {
    const time = this.formatTime();
    console.log(`${time}└─ ${message}`);
  }

  json(label: string, data: any): void {
    console.log(`\n📄 ${label}:`);
    console.log(JSON.stringify(data, null, 2));
  }

  summary(stats: {
    total: number;
    successful: number;
    failed: number;
    totalTime: number;
    averageTime?: number;
  }): void {
    console.log('\n━'.repeat(60));
    console.log('✨ SUMMARY');
    console.log(`Total Methods: ${stats.total}`);
    console.log(`Successful: ${stats.successful}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Success Rate: ${((stats.successful / stats.total) * 100).toFixed(1)}%`);
    console.log(`Total Time: ${stats.totalTime}ms`);
    if (stats.averageTime) {
      console.log(`Average Time: ${stats.averageTime.toFixed(0)}ms`);
    }
    console.log('━'.repeat(60));
  }

  async measure<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.success(`${operation}`, duration);
      return { result, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.error(`${operation}`, error);
      throw error;
    }
  }

  async measureGroup<T>(
    groupName: string,
    operations: Array<{
      name: string;
      fn: () => Promise<T>;
    }>
  ): Promise<Array<{ result: T; duration: number }>> {
    this.section(`\n📊 ${groupName.toUpperCase()}`);
    
    const results = [];
    for (const op of operations) {
      try {
        const result = await this.measure(op.name, op.fn);
        results.push(result);
      } catch (error) {
        results.push({ result: null as T, duration: 0 });
      }
    }
    
    return results;
  }
}