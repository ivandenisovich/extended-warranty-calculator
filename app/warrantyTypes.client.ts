// Client-safe mirror of the model's default hazard shape. Keep in sync with
// app/warrantyEngine.ts (server-only).
import type { HazardShape } from '../lib/publicTypes';

export type { HazardShape, EvaluationResult } from '../lib/publicTypes';

export const DEFAULT_HAZARD: HazardShape = {
  infantStrength: 0.6,
  infantDecay: 1.2,
  background: 0.2,
  wearOutStrength: 0.5,
  accidentalFrontLoad: 0.5,
};
