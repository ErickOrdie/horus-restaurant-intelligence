import { describe, expect, it } from "vitest";
import { DetectResponseSchema, countByClass, filterByConfidence, normalizeBaseUrl } from "./ai-engine-contract";

const det = (c: string, conf: number) => ({ class_name: c, confidence: conf, bbox: [0, 0, 1, 1] as [number, number, number, number] });

describe("ai engine contract", () => {
  it("drops detections below the minimum confidence", () => {
    expect(filterByConfidence([det("rice", 0.4), det("rice", 0.5), det("beef", 0.9)], 0.5)).toHaveLength(2);
  });
  it("counts detections per class", () => {
    expect(countByClass([det("cup", 0.9), det("cup", 0.8), det("bowl", 0.7)])).toEqual([{ cls: "cup", n: 2 }, { cls: "bowl", n: 1 }]);
  });
  it("rejects responses without normalized bounding boxes", () => {
    const bad = { analysis_id: "a", model: "m", version: "1", timestamp: "t", processing_ms: 10, status: "ok", detections: [{ class_name: "x", confidence: 1.4, bbox: [0, 0, 1, 1] }] };
    expect(DetectResponseSchema.safeParse(bad).success).toBe(false);
  });
  it("strips trailing slashes from the engine URL", () => {
    expect(normalizeBaseUrl(" https://engine.example.com/// ")).toBe("https://engine.example.com");
  });
});
