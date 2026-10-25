import { describe, expect, it } from "vitest";
import { rebasePath } from "./paths";

describe("rebasePath", () => {
  it("moves a path inside the old folder, whatever the case or separators", () => {
    expect(rebasePath("C:\\code\\api", "c:/code/API/", "D:\\api")).toBe("D:\\api");
    expect(rebasePath("c:/code/API/web", "C:\\code\\api", "D:\\api")).toBe("D:\\api\\web");
    expect(rebasePath("C:\\code\\api\\web", "C:\\code\\api", "D:\\")).toBe("D:\\web");
  });

  it("leaves paths outside the folder alone", () => {
    expect(rebasePath("C:\\code\\apis", "C:\\code\\api", "D:\\api")).toBeNull();
    expect(rebasePath("E:\\other", "C:\\code\\api", "D:\\api")).toBeNull();
  });
});
