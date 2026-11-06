import type { getClamPose as typedPose } from "../../../models/clam";
import type { AnatomicalSide } from "../../../models/types";
export declare function getClamPose(
  progress: number,
  options?: { activeSide?: AnatomicalSide; mirrored?: boolean },
): ReturnType<typeof typedPose>;
