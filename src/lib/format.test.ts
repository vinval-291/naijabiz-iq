import { describe, expect, it } from "vitest";
import { formatDayMonth, formatName, formatNaira, formatNairaCompact, formatPercent } from "./format";

describe("format", () => {
  it("formats naira", () => {
    expect(formatNaira(2_760_000)).toBe("₦2,760,000");
    expect(formatNaira(-106_962)).toBe("−₦106,962");
  });

  it("formats compact naira", () => {
    expect(formatNairaCompact(2_760_000)).toBe("₦2.76M");
    expect(formatNairaCompact(2_000_000)).toBe("₦2M");
    expect(formatNairaCompact(393_038)).toBe("₦393K");
    expect(formatNairaCompact(950)).toBe("₦950");
  });

  it("formats signed percentages", () => {
    expect(formatPercent(11.9)).toBe("+12%");
    expect(formatPercent(-21.6)).toBe("−22%");
    expect(formatPercent(0.2)).toBe("0%");
  });

  it("formats dates and names", () => {
    expect(formatDayMonth("2026-10-12")).toBe("12 Oct");
    expect(formatName("ADEBAYO PROVISIONS LTD")).toBe("Adebayo Provisions Ltd");
    expect(formatName("IBEDC")).toBe("IBEDC");
    expect(formatName("MTN NIGERIA")).toBe("MTN Nigeria");
    expect(formatName("ST. ANNE'S SCHOOL CANTEEN")).toBe("St. Anne's School Canteen");
  });
});
