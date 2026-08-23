const THEME = {
  red: "FFFF2525",
  black: "FF090909",
  ink: "FF171717",
  muted: "FF66645F",
  paper: "FFFAFAF8",
  white: "FFFFFFFF",
  line: "FFD9D9D4",
};

function text(value) {
  return value == null ? "" : String(value).trim();
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

function excelDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? text(value) : date;
}

function safeFilePart(value) {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function localDatePart(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function createSheet(name, title, subtitle, columns, rows) {
  return { name, title, subtitle, columns, rows };
}

function findTeamLeader(team) {
  const members = team.members || [];
  return (
    members.find((member) =>
      ["captain", "team leader", "leader"].includes(
        text(member.role).toLowerCase(),
      ),
    ) ||
    members.find((member) => Number(member.member_order) === 1) ||
    members[0] ||
    {}
  );
}

function createPanelSheet(registrations, generatedAt) {
  const columns = [
    { key: "id", header: "Registration ID", width: 16 },
    { key: "name", header: "Full Name", width: 24 },
    { key: "email", header: "Email", width: 30 },
    { key: "phone", header: "Phone", width: 18 },
    { key: "participantType", header: "Participant Type", width: 28 },
    { key: "organisation", header: "Organisation", width: 32 },
    { key: "department", header: "Department / Branch", width: 24 },
    { key: "panel", header: "Panel Selection", width: 26 },
    { key: "industrySector", header: "Industry Sector", width: 22 },
    {
      key: "industrySectorOther",
      header: "Industry Sector Details",
      width: 28,
    },
    { key: "organisationType", header: "Organisation Type", width: 24 },
    {
      key: "organisationTypeOther",
      header: "Organisation Details",
      width: 28,
    },
    { key: "confirmed", header: "Information Confirmed", width: 22 },
    { key: "updates", header: "Updates Opt-In", width: 18 },
    { key: "registered", header: "Registered At", width: 23 },
  ];
  const rows = registrations.map((item) => ({
    id: item.id,
    name: text(item.name),
    email: text(item.email),
    phone: text(item.phone),
    participantType: text(item.participant_type),
    organisation: text(item.organisation),
    department: text(item.department),
    panel: text(item.panel_selection),
    industrySector: text(item.industry_sector),
    industrySectorOther: text(item.industry_sector_other),
    organisationType: text(item.organisation_type),
    organisationTypeOther: text(item.organisation_type_other),
    confirmed: yesNo(item.information_confirmed),
    updates: yesNo(item.updates_opt_in),
    registered: excelDate(item.created_at),
  }));
  return createSheet(
    "Panel Registrations",
    "AI CONCLAVE 2026 · PANEL REGISTRATIONS",
    `${rows.length} registrations · Exported ${generatedAt.toLocaleString("en-IN")}`,
    columns,
    rows,
  );
}

function createHackathonSheets(registrations, generatedAt) {
  const teams = registrations.filter((item) => item.record_type === "team");
  const legacy = registrations.filter((item) => item.record_type !== "team");
  const teamColumns = [
    { key: "name", header: "Team Name", width: 28 },
    { key: "category", header: "Category", width: 16 },
    { key: "leader", header: "Captain", width: 24 },
    {
      key: "institution",
      header: "College / School",
      width: 36,
    },
    { key: "size", header: "Team Size", width: 14 },
    { key: "sector", header: "Sector", width: 18 },
    { key: "solution", header: "Solution Type", width: 18 },
    { key: "code", header: "Team Code", width: 20 },
    { key: "leaderEmail", header: "Captain Email", width: 30 },
    { key: "leaderPhone", header: "Captain Phone", width: 18 },
  ];
  const teamRows = teams.map((team) => {
    const leader = findTeamLeader(team);
    return {
      name: text(team.team_name),
      category: text(team.participant_category),
      institution: text(leader.institution),
      size: Number(team.members?.length || team.team_size || 0),
      sector: text(team.sector_track),
      solution: text(team.solution_type),
      code: text(team.team_code),
      leader: text(leader.full_name),
      leaderEmail: text(leader.email),
      leaderPhone: text(leader.phone),
    };
  });
  const sheets = [
    createSheet(
      "Hackathon Teams",
      "AI CONCLAVE 2026 · HACKATHON TEAMS",
      `${teamRows.length} teams · Exported ${generatedAt.toLocaleString("en-IN")}`,
      teamColumns,
      teamRows,
    ),
  ];

  const memberColumns = [
    { key: "teamCode", header: "Team Code", width: 20 },
    { key: "teamName", header: "Team Name", width: 28 },
    { key: "category", header: "Category", width: 16 },
    { key: "sector", header: "Sector", width: 18 },
    { key: "solution", header: "Solution Type", width: 18 },
    { key: "order", header: "Member No.", width: 14 },
    { key: "role", header: "Role", width: 15 },
    { key: "name", header: "Full Name", width: 24 },
    { key: "email", header: "Email", width: 30 },
    { key: "phone", header: "Phone", width: 18 },
    { key: "institution", header: "Institution", width: 34 },
    { key: "course", header: "Course / Department", width: 25 },
    { key: "year", header: "Year / Grade", width: 16 },
  ];
  const memberRows = teams.flatMap((team) =>
    (team.members || []).map((member) => ({
      teamCode: text(team.team_code),
      teamName: text(team.team_name),
      category: text(team.participant_category),
      sector: text(team.sector_track),
      solution: text(team.solution_type),
      order: Number(member.member_order || 0),
      role: text(member.role),
      name: text(member.full_name),
      email: text(member.email),
      phone: text(member.phone),
      institution: text(member.institution),
      course: text(member.department_or_course),
      year: text(member.year_or_grade),
    })),
  );
  sheets.push(
    createSheet(
      "Team Members",
      "AI CONCLAVE 2026 · HACKATHON STUDENTS",
      `${memberRows.length} students across ${teamRows.length} teams · Exported ${generatedAt.toLocaleString("en-IN")}`,
      memberColumns,
      memberRows,
    ),
  );

  if (legacy.length) {
    const legacyColumns = [
      { key: "id", header: "Registration ID", width: 16 },
      { key: "name", header: "Full Name", width: 24 },
      { key: "email", header: "Email", width: 30 },
      { key: "phone", header: "Phone", width: 18 },
      { key: "organisation", header: "Organisation", width: 32 },
      { key: "track", header: "Track", width: 24 },
      { key: "sector", header: "Sector", width: 18 },
      { key: "subcategory", header: "Subcategory", width: 26 },
      { key: "registered", header: "Registered At", width: 23 },
    ];
    const legacyRows = legacy.map((item) => ({
      id: item.id,
      name: text(item.name),
      email: text(item.email),
      phone: text(item.phone),
      organisation: text(item.organisation),
      track: Array.isArray(item.tracks)
        ? item.tracks.join(", ")
        : text(item.tracks),
      sector: text(item.challenge_area),
      subcategory: text(item.subcategory),
      registered: excelDate(item.created_at),
    }));
    sheets.push(
      createSheet(
        "Legacy Registrations",
        "AI CONCLAVE 2026 · LEGACY HACKATHON RECORDS",
        `${legacyRows.length} legacy records · Exported ${generatedAt.toLocaleString("en-IN")}`,
        legacyColumns,
        legacyRows,
      ),
    );
  }
  return sheets;
}

function escapeXml(value) {
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(number) {
  let result = "";
  for (
    let current = number;
    current > 0;
    current = Math.floor((current - 1) / 26)
  )
    result = String.fromCharCode(((current - 1) % 26) + 65) + result;
  return result;
}

function toExcelSerial(date) {
  return (
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    ) /
      86_400_000 +
    25_569
  );
}

function cellXml(reference, value, style = 5) {
  if (value instanceof Date)
    return `<c r="${reference}" s="6"><v>${toExcelSerial(value)}</v></c>`;
  if (typeof value === "number" && Number.isFinite(value))
    return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value ?? "")}</t></is></c>`;
}

function worksheetXml(sheet) {
  const lastColumn = columnName(sheet.columns.length);
  const lastRow = Math.max(4, sheet.rows.length + 4);
  const bandRow = sheet.columns
    .map((_, index) => `<c r="${columnName(index + 1)}3" s="3"/>`)
    .join("");
  const headerRow = sheet.columns
    .map((column, index) =>
      cellXml(`${columnName(index + 1)}4`, column.header, 4),
    )
    .join("");
  const dataRows = sheet.rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 5;
      const cells = sheet.columns
        .map((column, columnIndex) =>
          cellXml(
            `${columnName(columnIndex + 1)}${rowNumber}`,
            row[column.key],
          ),
        )
        .join("");
      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");
  const columns = sheet.columns
    .map(
      (column, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`,
    )
    .join("");
  const autoFilter = sheet.rows.length
    ? `<autoFilter ref="A4:${lastColumn}${lastRow}"/>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>${columns}</cols>
  <sheetData>
    <row r="1" ht="34" customHeight="1">${cellXml("A1", sheet.title, 1)}</row>
    <row r="2" ht="24" customHeight="1">${cellXml("A2", sheet.subtitle, 2)}</row>
    <row r="3" ht="8" customHeight="1">${bandRow}</row>
    <row r="4" ht="32" customHeight="1">${headerRow}</row>
    ${dataRows}
  </sheetData>
  ${autoFilter}
  <mergeCells count="2"><mergeCell ref="A1:${lastColumn}1"/><mergeCell ref="A2:${lastColumn}2"/></mergeCells>
  <pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
</worksheet>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="dd mmm yyyy, hh:mm AM/PM"/></numFmts>
  <fonts count="3">
    <font><sz val="10"/><name val="Arial"/><color rgb="${THEME.ink}"/></font>
    <font><b/><sz val="18"/><name val="Courier New"/><color rgb="${THEME.black}"/></font>
    <font><b/><sz val="10"/><name val="Courier New"/><color rgb="${THEME.white}"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="${THEME.paper}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="${THEME.red}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="${THEME.black}"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left/><right/><top/><bottom style="medium"><color rgb="${THEME.red}"/></bottom><diagonal/></border>
    <border><left/><right/><top/><bottom style="thin"><color rgb="${THEME.line}"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="7">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function workbookXml(sheets) {
  const sheetList = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView/></bookViews><sheets>${sheetList}</sheets><calcPr calcId="191029"/>
</workbook>`;
}

function workbookRelationshipsXml(sheets) {
  const relationships = sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
}

function contentTypesXml(sheets) {
  const overrides = sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}
</Types>`;
}

function packageWorkbook(sheets, zipSync, strToU8) {
  const files = {
    "[Content_Types].xml": strToU8(contentTypesXml(sheets)),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    "xl/workbook.xml": strToU8(workbookXml(sheets)),
    "xl/_rels/workbook.xml.rels": strToU8(
      workbookRelationshipsXml(sheets),
    ),
    "xl/styles.xml": strToU8(stylesXml()),
  };
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(
      worksheetXml(sheet),
    );
  });
  return zipSync(files, { level: 6 });
}

export async function createRegistrationsWorkbook(routeId, registrations) {
  if (!registrations.length)
    throw new Error("There are no registrations to export.");
  const generatedAt = new Date();
  const sheets =
    routeId === "hackathon"
      ? createHackathonSheets(registrations, generatedAt)
      : [createPanelSheet(registrations, generatedAt)];
  const { strToU8, zipSync } = await import("fflate");
  const bytes = packageWorkbook(sheets, zipSync, strToU8);
  const datePart = localDatePart(generatedAt);
  return {
    bytes,
    filename: `ai-conclave-2026-${safeFilePart(routeId)}-registrations-${datePart}.xlsx`,
  };
}

function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function downloadRegistrationsWorkbook(routeId, registrations) {
  const { bytes, filename } = await createRegistrationsWorkbook(
    routeId,
    registrations,
  );
  downloadBytes(bytes, filename);
}
