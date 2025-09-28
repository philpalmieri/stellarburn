import { ProbeService } from './probeService.js';

export class ProbeScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private probeService: ProbeService) {}

  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('🚀 Probe movement scheduler started');

    this.intervalId = setInterval(async () => {
      try {
        const results = await this.probeService.moveAllActiveProbes();
        if (results.length > 0) {
          console.log(`📡 Moved ${results.length} active probes`);

          // Log destroyed probes
          const destroyedProbes = results.filter(r => r.fuelExhausted);
          if (destroyedProbes.length > 0) {
            console.log(`💥 ${destroyedProbes.length} probes ran out of fuel and were destroyed`);
          }
        }
      } catch (error) {
        console.error('❌ Error in probe movement scheduler:', error);
      }
    }, 1000); // Move probes every 1 second
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Probe movement scheduler stopped');
  }

  isActive() {
    return this.isRunning;
  }
}