import { memo } from "react";
import { SentinelNodeComponent } from "./SentinelNode";

export const sentinelNodeTypes = {
  sentinel: memo(SentinelNodeComponent),
};
