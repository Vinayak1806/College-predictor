import test from "node:test";
import assert from "node:assert/strict";
import { buildCollegeCatalog, buildLlmsIndex } from "./aiDiscovery.js";

test("AI discovery index links to canonical public resources and warns against guarantees", () => {
  const content = buildLlmsIndex({
    siteUrl: "https://example.com",
    stats: {
      currentInstitutes: 372,
      verifiedCutoffs: 100000,
      exactSeatTypes: 50,
      districtsCovered: 33
    }
  });

  assert.match(content, /https:\/\/example\.com\/llms-colleges\.txt/);
  assert.match(content, /never guarantee admission/i);
  assert.match(content, /Keep FE and DSE records separate/);
});

test("college catalog preserves current codes and canonical links", () => {
  const content = buildCollegeCatalog({
    siteUrl: "https://example.com",
    colleges: [{
      instituteCode: "01002",
      name: "Government College of Engineering, Amravati",
      slug: "01002-government-college-of-engineering-amravati",
      city: { name: "Amravati" },
      university: { name: "Sant Gadge Baba Amravati University" }
    }]
  });

  assert.match(content, /01002 - Government College of Engineering, Amravati/);
  assert.match(content, /https:\/\/example\.com\/colleges\/01002-government-college-of-engineering-amravati/);
});
