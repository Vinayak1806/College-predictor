import test from "node:test";
import assert from "node:assert/strict";
import { dsePredictSchema } from "./validation.js";

test("DSE prediction accepts optional university preferences", () => {
  const parsed = dsePredictSchema.safeParse({
    diplomaPercentage: 89.2,
    diplomaBranch: "Computer Engineering",
    category: "OBC",
    gender: "MALE",
    preferredUniversities: ["Savitribai Phule Pune University"]
  });

  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.data.preferredUniversities, ["Savitribai Phule Pune University"]);
});
