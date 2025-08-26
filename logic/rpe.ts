export type Recommendation = {
  nextLoad: number;
  note: string;
  deltaPercent: number;
};

function roundToStep(value: number, step = 0.1): number {
  return Math.round(value / step) * step;
}

export function recommendNextLoad(currentLoad: number, targetRpe: number, actualRpe: number): Recommendation {
  let delta = 0;
  if (actualRpe <= targetRpe - 1) {
    delta = +0.025; // +2.5%
  } else if (actualRpe >= targetRpe + 1) {
    delta = -0.025; // -2.5%
  } else {
    delta = 0; // same load
  }
  const raw = Math.max(0, currentLoad * (1 + delta));
  const nextLoad = roundToStep(raw, 0.1);
  const note = delta > 0 ? 'Facile → +2.5%' : delta < 0 ? 'Dur → −2.5%' : 'OK → même charge';
  return { nextLoad, note, deltaPercent: delta * 100 };
}

