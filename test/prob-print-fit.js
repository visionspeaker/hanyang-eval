/**
 * 수습평가 결과표가 A4 한 장에 맞는지 확인한다.
 * 짧은 더미 의견은 글자 크기가 그대로이고, 긴 더미 의견은 줄어든 뒤에도
 * 바닥글과 서명이 페이지 안에 남는지 본다. 실제 평가 데이터는 쓰지 않는다.
 *
 *   node --check  (index.html 의 스크립트)
 *   node test/prob-print-fit.js
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "index.html");
const html = fs.readFileSync(indexPath, "utf8");
const failures = [];

function fail(msg) {
  failures.push(msg);
  console.error("FAIL", msg);
}

function extractScript(src) {
  const start = src.indexOf("<script>\n");
  const end = src.lastIndexOf("</script>");
  if (start < 0 || end < start) throw new Error("inline script not found");
  return src.slice(start + "<script>\n".length, end);
}

function extractFunction(src, name) {
  const sig = "function " + name + "(";
  const i = src.indexOf(sig);
  if (i < 0) throw new Error("missing " + name);
  const open = src.indexOf("{", i);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    const c = src[j];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(i, j + 1);
    }
  }
  throw new Error("unclosed " + name);
}

function extractTemplateConst(src, name) {
  const sig = "const " + name + " = `";
  const i = src.indexOf(sig);
  if (i < 0) throw new Error("missing " + name);
  let j = i + sig.length;
  let out = "";
  while (j < src.length) {
    if (src[j] === "\\") { out += src[j] + (src[j + 1] || ""); j += 2; continue; }
    if (src[j] === "`") return out;
    out += src[j++];
  }
  throw new Error("unclosed " + name);
}

const script = extractScript(html);
const checkFile = path.join(os.tmpdir(), "hanyang-index-script.js");
fs.writeFileSync(checkFile, script);
const checked = spawnSync(process.execPath, ["--check", checkFile], { encoding: "utf8" });
if (checked.status !== 0) {
  fail("node --check failed\n" + (checked.stderr || checked.stdout || ""));
} else {
  console.log("node --check ok");
}

const fitSrc = extractFunction(script, "fitProbSheet");
const fitCheck = path.join(os.tmpdir(), "hanyang-fit-prob.js");
fs.writeFileSync(fitCheck, fitSrc);
const fitChecked = spawnSync(process.execPath, ["--check", fitCheck], { encoding: "utf8" });
if (fitChecked.status !== 0) fail("fitProbSheet node --check failed\n" + (fitChecked.stderr || ""));

const css = extractTemplateConst(script, "PROB_PRINT_CSS");
if (!css.includes(".sheet{display:flex")) fail("print CSS is missing .sheet");
if (!css.includes("overflow:hidden")) fail("print CSS no longer clips the page box");
if (!script.includes("fitProbSheet.toString()")) fail("PROB_FIT_JS is not built from fitProbSheet");
if (!script.includes("${PROB_FIT_JS}")) fail("print window does not load PROB_FIT_JS");
if (!script.includes('<div class="page"><div class="sheet">')) fail("result sheet is missing the sheet wrapper");

const questions = [
  ["업무 습득 및 수행", "업무 이해", "담당 업무의 목적과 기본 처리 절차를 이해하고 있는가?", 5],
  ["업무 습득 및 수행", "업무 이해", "사내 시스템과 문서 양식 사용법을 익히고 있는가?", 5],
  ["업무 습득 및 수행", "습득 속도", "새로운 업무를 배우는 속도가 적정한가?", 5],
  ["업무 습득 및 수행", "습득 속도", "교육·인수인계 받은 내용을 반복 설명 없이 수행하는가?", 5],
  ["업무 습득 및 수행", "지시 이행", "지시 내용을 정확히 이해하고 수행하는가?", 5],
  ["업무 습득 및 수행", "지시 이행", "주어진 기한을 지키는가?", 5],
  ["업무 습득 및 수행", "실수 개선", "같은 실수를 반복하지 않는가?", 5],
  ["업무 습득 및 수행", "실수 개선", "실수를 숨기지 않고 알린 뒤 바로잡으려 하는가?", 5],
  ["학습 및 보고 태도", "적극성", "모르는 것을 스스로 찾아보거나 먼저 질문하는가?", 5],
  ["학습 및 보고 태도", "적극성", "새로운 업무와 교육에 적극적으로 참여하는가?", 5],
  ["학습 및 보고 태도", "피드백 수용", "지적·피드백을 열린 자세로 받아들이는가?", 5],
  ["학습 및 보고 태도", "피드백 수용", "피드백 받은 내용을 실제 행동으로 고치는가?", 5],
  ["학습 및 보고 태도", "보고·연락", "업무 진행 상황을 상급자에게 제때 보고하는가?", 5],
  ["학습 및 보고 태도", "보고·연락", "문제나 어려움이 생기면 즉시 알리고 도움을 요청하는가?", 5],
  ["근무 태도 및 조직 적응", "근태·성실", "지각·조퇴·무단결근 없이 근무하는가?", 5],
  ["근무 태도 및 조직 적응", "근태·성실", "맡은 일을 끝까지 책임지고 수행하는가?", 5],
  ["근무 태도 및 조직 적응", "소통·협조", "동료·상급자와 원활하게 소통하는가?", 5],
  ["근무 태도 및 조직 적응", "소통·협조", "팀 업무에 협조적인가?", 5],
  ["근무 태도 및 조직 적응", "규정·안전", "회사 규정과 직장 예절을 준수하는가?", 5],
  ["근무 태도 및 조직 적응", "규정·안전", "안전수칙과 작업장 정리정돈을 지키는가?", 5]
];

function evalTable() {
  let rows = '<tr><th>영역</th><th>평가항목</th><th>세부 평가 문항</th><th style="width:6%">배점</th><th style="width:9%">1차</th><th style="width:9%">2차</th></tr>';
  const areaCount = {}, itemCount = {};
  questions.forEach(q => {
    areaCount[q[0]] = (areaCount[q[0]] || 0) + 1;
    itemCount[q[0] + "|" + q[1]] = (itemCount[q[0] + "|" + q[1]] || 0) + 1;
  });
  const seenA = {}, seenI = {};
  let cur = null, pts = 0;
  function flush(name) {
    if (!name) return;
    rows += '<tr class="sum"><td colspan="3" style="text-align:right">' + name + ' 소계</td><td class="c">' + pts + '</td><td class="c">32</td><td class="c">30</td></tr>';
  }
  questions.forEach(q => {
    if (cur !== q[0]) { flush(cur); cur = q[0]; pts = 0; }
    pts += q[3];
    rows += "<tr>";
    if (!seenA[q[0]]) { rows += '<td class="area" rowspan="' + areaCount[q[0]] + '">' + q[0] + "</td>"; seenA[q[0]] = 1; }
    const ik = q[0] + "|" + q[1];
    if (!seenI[ik]) { rows += '<td class="item" rowspan="' + itemCount[ik] + '">' + q[1] + "</td>"; seenI[ik] = 1; }
    rows += "<td>" + q[2] + '</td><td class="c">' + q[3] + '</td><td class="c">A 5</td><td class="c">B 4</td></tr>';
  });
  flush(cur);
  rows += '<tr class="tot"><td colspan="3" style="text-align:right">합 계</td><td class="c">100</td><td class="c">86</td><td class="c">80</td></tr>';
  return rows;
}

const unit = "샘플 문장입니다. 평가 의견이 길어져도 결과표 한 장 안에 모두 보여야 합니다. ";
function opinion(kind) {
  if (kind === "lines") {
    const line = "줄바꿈 샘플 의견입니다.";
    return {
      c1: "<b>전환 의견: 적합</b><br>" + Array(36).fill(line).join("\n"),
      c2: "<b>전환 의견: 적합</b><br>" + Array(8).fill(line).join("\n")
    };
  }
  if (kind === "dense") {
    const line = "빽빽한 샘플 의견.";
    return {
      c1: "<b>전환 의견: 적합</b><br>" + Array(90).fill(line).join("\n"),
      c2: "<b>전환 의견: 적합</b><br>" + Array(24).fill(line).join("\n")
    };
  }
  const n = kind === "short" ? 0 : kind === "long" ? 8 : 0;
  const body = n ? unit.repeat(n) : "짧은 의견입니다.";
  const body2 = n ? unit.repeat(2) : "짧은 의견입니다.";
  return {
    c1: "<b>전환 의견: 적합</b><br>" + body,
    c2: "<b>전환 의견: 적합</b><br>" + body2
  };
}

const sig = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="#111"/></svg>'
);

function fixture(kind) {
  const op = opinion(kind);
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><style>${css}</style></head><body>
<div class="page"><div class="sheet">
  <h1>수습기간 평가 결과표</h1>
  <div class="sub">한양전공(주) · 정규직 전환 심사용</div>
  <table class="info">
    <tr><th>소 속</th><td>샘플부서</td><th>성 명</th><td>홍길동</td><th>직 위</th><td>사원</td></tr>
    <tr><th>입 사 일</th><td>2026. 8. 3.</td><th>수습기간</th><td colspan="3">2026. 8. 3. ~ 2026. 11. 2. (3개월)</td></tr>
    <tr><th>1차 평가자</th><td>김샘플 과장</td><th>2차 평가자</th><td>이샘플 부장</td><th>평가 완료일</th><td>2026. 11. 1.</td></tr>
  </table>
  <div class="sec">1. 평가 내용</div>
  <table class="ev">${evalTable()}</table>
  <div class="verdict"><div class="l">정규직 전환 판정</div><div class="r">1·2차 평균 <b>83</b>점<div class="note">판정 기준 샘플</div></div></div>
  <div class="sec">2. 평가자 의견</div>
  <table class="op">
    <tr><th>1차 평가자<br><span class="nm">김샘플</span></th><td id="c1">${op.c1}</td></tr>
    <tr><th>2차 평가자<br><span class="nm">이샘플</span></th><td id="c2">${op.c2}</td></tr>
  </table>
  <div class="sign">
    <div>1차 평가자 <span class="who"><span class="nm">김샘플</span><img src="${sig}" alt=""><span class="in">(서명)</span></span></div>
    <div>2차 평가자 <span class="who"><span class="nm">이샘플</span><img src="${sig}" alt=""><span class="in">(서명)</span></span></div>
  </div>
  <div class="foot">한양전공 인사평가 시스템 출력 · 2026. 11. 23.</div>
</div></div>
<script>
${fitSrc}
function measure() {
  var page = document.querySelector(".page");
  var foot = page.querySelector(".foot");
  var sheet = page.querySelector(".sheet");
  var rect = page.getBoundingClientRect();
  var pad = parseFloat(getComputedStyle(page).paddingBottom) || 0;
  var imgPast = 0;
  [].slice.call(page.querySelectorAll(".sign img")).forEach(function (im) {
    imgPast = Math.max(imgPast, im.getBoundingClientRect().bottom - rect.bottom);
  });
  var c1 = document.getElementById("c1");
  var ev = page.querySelector("table.ev td");
  return {
    past: Math.round((foot.getBoundingClientRect().bottom - (rect.bottom - pad)) * 10) / 10,
    imgPast: Math.round(imgPast * 10) / 10,
    rightGap: Math.round((rect.right - sheet.getBoundingClientRect().right) * 10) / 10,
    fs: getComputedStyle(c1).fontSize,
    inlineFs: c1.style.fontSize || "",
    lh: c1.style.lineHeight || "",
    fit: page.dataset.fit || "",
    len: c1.textContent.length,
    h1: getComputedStyle(page.querySelector("h1")).fontSize,
    evPad: getComputedStyle(ev).paddingTop,
    evFs: getComputedStyle(ev).fontSize
  };
}
var before = measure();
fitProbSheet();
var once = measure();
fitProbSheet();
var twice = measure();
document.documentElement.setAttribute("data-result", JSON.stringify({ before: before, once: once, twice: twice }));
<\/script></body></html>`;
}

function runChrome(args, timeout) {
  const chrome = process.env.CHROME || "google-chrome";
  return spawnSync(chrome, args, { encoding: "utf8", timeout: timeout || 15000, killSignal: "SIGKILL" });
}

function loadCase(kind) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prob-fit-"));
  const file = path.join(dir, kind + ".html");
  fs.writeFileSync(file, fixture(kind));
  const prof = path.join(dir, "profile");
  const dumped = runChrome([
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--no-first-run", "--user-data-dir=" + prof, "--dump-dom", "file://" + file
  ]);
  const out = dumped.stdout || "";
  const m = out.match(/data-result="([^"]*)"/);
  if (!m) {
    fail(kind + ": no measurement (chrome status " + dumped.status + ")");
    return null;
  }
  const data = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  const pdf = path.join(dir, kind + ".pdf");
  runChrome([
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--no-first-run", "--user-data-dir=" + prof + "-pdf",
    "--no-pdf-header-footer", "--print-to-pdf=" + pdf, "file://" + file
  ], 20000);
  let pages = 0;
  if (fs.existsSync(pdf)) {
    const buf = fs.readFileSync(pdf).toString("latin1");
    pages = (buf.match(/\/Type\s*\/Page(?!s)/g) || []).length;
  }
  data.pages = pages;
  console.log(kind, JSON.stringify({
    beforePast: data.before.past,
    fit: data.twice.fit,
    fs: data.twice.fs,
    inlineFs: data.twice.inlineFs,
    h1: data.twice.h1,
    past: data.twice.past,
    imgPast: data.twice.imgPast,
    len: data.twice.len,
    pages: data.pages
  }));
  return data;
}

function expectInside(kind, data) {
  if (data.twice.past > 1) fail(kind + ": footer still past the content box (" + data.twice.past + "px)");
  if (data.twice.imgPast > 1) fail(kind + ": signature image past the page (" + data.twice.imgPast + "px)");
  if (data.twice.rightGap < -1) fail(kind + ": sheet extends past the page horizontally");
  if (data.twice.len !== data.before.len) fail(kind + ": comment text length changed");
  if (data.twice.len < 1) fail(kind + ": comment text missing");
  if (data.once.fs !== data.twice.fs || data.once.fit !== data.twice.fit) {
    fail(kind + ": second fit changed the result");
  }
  if (data.pages !== 1) fail(kind + ": print PDF is " + data.pages + " page(s), expected 1");
}

const short = loadCase("short");
const long = loadCase("long");
const lines = loadCase("lines");
const dense = loadCase("dense");

if (short) {
  expectInside("short", short);
  if (short.before.past > 1) fail("short: baseline already overflows (" + short.before.past + ")");
  if (short.twice.fit !== "unchanged") fail("short: fit mode is " + short.twice.fit);
  if (short.twice.inlineFs) fail("short: opinion font was overridden (" + short.twice.inlineFs + ")");
  if (short.twice.fs !== "11.3px") fail("short: opinion font is " + short.twice.fs);
  if (short.twice.h1 !== "24px") fail("short: title font changed");
  if (Math.abs(parseFloat(short.twice.evPad) - 4.2) > 0.2) fail("short: table padding changed");
  if (short.twice.evFs !== "11.3px") fail("short: score font changed");
}
if (long) {
  expectInside("long", long);
  if (long.before.past <= 1) fail("long: fixture did not overflow before fitting (" + long.before.past + ")");
  if (long.twice.fit !== "shrunk") fail("long: fit mode is " + long.twice.fit);
  const fs = parseFloat(long.twice.fs);
  if (!(fs < 11.3)) fail("long: opinion font did not shrink (" + long.twice.fs + ")");
  if (long.twice.h1 !== "24px") fail("long: title shrunk for a comment that should only tighten opinion text");
  if (long.twice.evFs !== "11.3px") fail("long: score table font changed");
  if (Math.abs(parseFloat(long.twice.evPad) - 4.2) > 0.2) fail("long: score table padding changed");
  if (!long.twice.inlineFs) fail("long: missing inline opinion font");
}
if (lines) {
  expectInside("lines", lines);
  if (lines.before.past <= 1) fail("lines: fixture did not overflow before fitting");
  if (lines.twice.fit !== "shrunk") fail("lines: fit mode is " + lines.twice.fit);
  if (!(parseFloat(lines.twice.fs) < 11.3)) fail("lines: opinion font did not shrink");
}
if (dense) {
  expectInside("dense", dense);
  if (dense.before.past <= 1) fail("dense: fixture did not overflow before fitting");
  if (dense.twice.fit === "clipped") fail("dense: content still clipped");
  if (dense.twice.fit !== "shrunk") fail("dense: fit mode is " + dense.twice.fit);
}

if (failures.length) {
  console.error(failures.length + " failure(s)");
  process.exit(1);
}
console.log("prob print fit checks passed");
