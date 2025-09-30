// Functional probe scheduler using closures to maintain state
export interface ProbeSchedulerInterface {
  start: () => void;
  stop: () => void;
  isActive: () => boolean;
}

// Higher-order function that creates a probe scheduler
export const createProbeScheduler = (moveAllActiveProbes: () => Promise<any[]>): ProbeSchedulerInterface => {
  let intervalId: NodeJS.Timeout | null = null;
  let isRunning = false;

  const start = () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    console.log('🚀 Probe movement scheduler started');

    intervalId = setInterval(async () => {
      try {
        const results = await moveAllActiveProbes();
        if (results.length > 0) {
          console.log(`📡 Moved ${results.length} active probes`);

          // Log destroyed probes
          const destroyedProbes = results.filter((r: any) => r.fuelExhausted);
          if (destroyedProbes.length > 0) {
            console.log(`💥 ${destroyedProbes.length} probes ran out of fuel and were destroyed`);
          }
        }
      } catch (error) {
        console.error('❌ Error in probe movement scheduler:', error);
      }
    }, 1000); // Move probes every 1 second
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    isRunning = false;
    console.log('🛑 Probe movement scheduler stopped');
  };

  const isActive = () => isRunning;

  return {
    start,
    stop,
    isActive
  };
};