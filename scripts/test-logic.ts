/**
 * Logic smoke tests — run with: npx tsx scripts/test-logic.ts
 * No Firebase required; validates merge, detection, and chase list.
 */
import assert from "node:assert/strict";
import { buildChaseListRows, buildMergedTeams, computeEventSummary } from "../src/utils/teamMerge";
import { detectSchema, suggestColumnMapping } from "../src/utils/columnDetection";
import { analyzeRows, extractTeamSummary } from "../src/utils/dataAnalysis";
import { orderDisplayColumns } from "../src/utils/columnPreferences";

let passed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`  ✗ ${name}`);
    throw error;
  }
}

console.log("\nTeam merge & detection tests\n");

test("detects email column from values, not header name", () => {
  const columns = ["Contact", "College"];
  const rows = [
    { Contact: "lead@team.com", College: "MIT" },
    { Contact: "other@team.com", College: "IIT" },
  ];
  const schema = detectSchema(columns, rows);
  assert.equal(schema.teamLeadEmail, "Contact");
});

test("merges reg + submission by email overlap", () => {
  const regRows = [
    {
      id: "r1",
      rowIndex: 0,
      fields: { "Team Lead Email": "alpha@test.com", "Team Name": "Alpha" },
      issues: [],
    },
  ];
  const subRows = [
    {
      id: "s1",
      rowIndex: 0,
      fields: {
        "Email": "alpha@test.com",
        "GitHub Repository URL": "https://github.com/alpha/repo",
      },
      issues: [],
    },
  ];
  const teams = buildMergedTeams(
    regRows,
    subRows,
    ["Team Lead Email", "Team Name"],
    ["Email", "GitHub Repository URL"],
  );
  assert.equal(teams.length, 1);
  assert.equal(teams[0].status, "complete");
  assert.equal(teams[0].links.length, 1);
  assert.equal(teams[0].links[0].url, "https://github.com/alpha/repo");
});

test("flags registered_only teams for chase list", () => {
  const regRows = [
    {
      id: "r1",
      rowIndex: 0,
      fields: { "Team Lead Email": "missing@test.com", "Team Name": "NoSub" },
      issues: ["No matching project submission found"],
    },
    {
      id: "r2",
      rowIndex: 1,
      fields: { "Team Lead Email": "done@test.com", "Team Name": "Done" },
      issues: [],
    },
  ];
  const subRows = [
    {
      id: "s1",
      rowIndex: 0,
      fields: { "Team Lead Email": "done@test.com", "Demo URL": "https://demo.app" },
      issues: [],
    },
  ];
  const teams = buildMergedTeams(
    regRows,
    subRows,
    ["Team Lead Email", "Team Name"],
    ["Team Lead Email", "Demo URL"],
  );
  const chase = buildChaseListRows(teams);
  assert.equal(teams.filter((t) => t.status === "registered_only").length, 1);
  assert.equal(chase.length, 1);
  assert.equal(chase[0].primary_email, "missing@test.com");
});

test("summary counts missing submissions correctly", () => {
  const teams = buildMergedTeams(
    [
      {
        id: "r1",
        rowIndex: 0,
        fields: { Email: "a@test.com" },
        issues: [],
      },
      {
        id: "r2",
        rowIndex: 1,
        fields: { Email: "b@test.com" },
        issues: [],
      },
    ],
    [
      {
        id: "s1",
        rowIndex: 0,
        fields: { Email: "a@test.com" },
        issues: [],
      },
    ],
    ["Email"],
    ["Email"],
  );
  const summary = computeEventSummary(
    teams,
    { uploadedAt: "2026-01-01", fileName: "reg.csv", issueCount: 0, rowCount: 2 },
    { uploadedAt: "2026-01-02", fileName: "sub.csv", issueCount: 0, rowCount: 1 },
  );
  assert.equal(summary.registeredCount, 2);
  assert.equal(summary.submittedCount, 1);
  assert.equal(summary.completeCount, 1);
  assert.equal(summary.missingSubmissionCount, 1);
});

test("parses comma-separated teammate emails without invalid email flag", () => {
  const columns = ["Email", "Team Name", "Teammates Email IDs"];
  const rows = [
    {
      Email: "vishalnai56@gmail.com",
      "Team Name": "Rockstars",
      "Teammates Email IDs": "kdjadeja21@gmail.com, vishalnai00@gmail.com",
    },
  ];
  const mapping = suggestColumnMapping(columns, rows);
  const analyzed = analyzeRows("registrations", columns, [{ id: "r1", rowIndex: 0, fields: rows[0] }], mapping);
  assert.equal(analyzed[0].issues.some((i) => i.includes("Invalid email")), false);

  const team = extractTeamSummary(
    { id: "r1", rowIndex: 0, fields: rows[0], issues: analyzed[0].issues },
    columns,
    mapping,
    rows,
  );
  assert.ok(team);
  assert.equal(team.members.length, 2);
  assert.equal(team.members[0].email, "kdjadeja21@gmail.com");
  assert.equal(team.members[1].email, "vishalnai00@gmail.com");
});

test("cross-check only runs when other dataset has rows", () => {
  const mapping = suggestColumnMapping(["Email"], [{ Email: "a@test.com" }]);
  const analyzed = analyzeRows(
    "registrations",
    ["Email"],
    [{ id: "r1", rowIndex: 0, fields: { Email: "a@test.com" } }],
    mapping,
    undefined,
  );
  assert.equal(analyzed[0].issues.some((i) => i.includes("No matching")), false);
});

test("submission: comma-separated teammate emails parse correctly", () => {
  const columns = [
    "Email",
    "Team Name",
    "Teammates Email IDs",
    "GitHub Repository URL",
    "Live Demo URL",
  ];
  const row = {
    Email: "vishalnai56@gmail.com",
    "Team Name": "Rockstars",
    "Teammates Email IDs": "kdjadeja21@gmail.com, vishalnai00@gmail.com",
    "GitHub Repository URL": "https://github.com/team/repo",
    "Live Demo URL": "https://demo.app",
  };
  const mapping = suggestColumnMapping(columns, [row]);
  const analyzed = analyzeRows(
    "submissions",
    columns,
    [{ id: "s1", rowIndex: 0, fields: row }],
    mapping,
  );

  assert.equal(analyzed[0].issues.some((i) => i.includes("Invalid email")), false);
  assert.equal(analyzed[0].issues.some((i) => i.includes("Invalid URL")), false);

  const team = extractTeamSummary(
    { id: "s1", rowIndex: 0, fields: row, issues: analyzed[0].issues },
    columns,
    mapping,
    [row],
  );
  assert.ok(team);
  assert.equal(team.teamLeadEmail, "vishalnai56@gmail.com");
  assert.equal(team.members.length, 2);
});

test("submission: cross-check matches registration via teammate email", () => {
  const columns = ["Email", "Teammates Email IDs"];
  const row = {
    Email: "lead@team.com",
    "Teammates Email IDs": "teammate@team.com, other@team.com",
  };
  const mapping = suggestColumnMapping(columns, [row]);
  const analyzed = analyzeRows(
    "submissions",
    columns,
    [{ id: "s1", rowIndex: 0, fields: row }],
    mapping,
    new Set(["teammate@team.com"]),
  );
  assert.equal(analyzed[0].issues.some((i) => i.includes("No matching registration")), false);
});

test("submission-only upload does not flag missing registration", () => {
  const columns = ["Email", "Teammates Email IDs", "GitHub URL"];
  const row = {
    Email: "solo@team.com",
    "Teammates Email IDs": "a@team.com, b@team.com",
    "GitHub URL": "https://github.com/solo/repo",
  };
  const mapping = suggestColumnMapping(columns, [row]);
  const analyzed = analyzeRows(
    "submissions",
    columns,
    [{ id: "s1", rowIndex: 0, fields: row }],
    mapping,
    undefined,
  );
  assert.equal(analyzed[0].issues.some((i) => i.includes("No matching")), false);
  assert.equal(analyzed[0].issues.some((i) => i.includes("Invalid")), false);
});

test("submission merge matches reg when teammate email overlaps", () => {
  const regRows = [
    {
      id: "r1",
      rowIndex: 0,
      fields: {
        Email: "lead@team.com",
        "Teammates Email IDs": "shared@team.com, other@team.com",
      },
      issues: [],
    },
  ];
  const subRows = [
    {
      id: "s1",
      rowIndex: 0,
      fields: {
        Email: "different@team.com",
        "Teammates Email IDs": "shared@team.com",
        "GitHub URL": "https://github.com/project",
      },
      issues: [],
    },
  ];
  const teams = buildMergedTeams(
    regRows,
    subRows,
    ["Email", "Teammates Email IDs"],
    ["Email", "Teammates Email IDs", "GitHub URL"],
  );
  assert.equal(teams.length, 1);
  assert.equal(teams[0].status, "complete");
});

test("teammate email column is never chosen as primary email", () => {
  const columns = ["Teammates Email IDs", "Email"];
  const rows = [
    {
      "Teammates Email IDs": "a@t.com, b@t.com",
      Email: "lead@team.com",
    },
  ];
  const schema = detectSchema(columns, rows);
  assert.equal(schema.teamLeadEmail, "Email");
});

test("column order pins email and hides columns", () => {
  const columns = ["College", "Team Lead Email", "Track", "GitHub URL"];
  const rows = [{ "Team Lead Email": "a@test.com", College: "X", Track: "AI", "GitHub URL": "https://github.com/x" }];
  const ordered = orderDisplayColumns(columns, { hidden: ["Track"], pinned: ["Team Lead Email"] }, rows);
  assert.deepEqual(ordered, ["Team Lead Email", "College", "GitHub URL"]);
});

console.log(`\n${passed} tests passed.\n`);
