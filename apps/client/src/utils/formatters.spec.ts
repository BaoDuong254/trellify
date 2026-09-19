import { describe, expect, it } from "vitest";

import { cloudinaryImage, cloudinaryThumb, formatDateTime } from "src/utils/formatters";

describe("cloudinaryThumb", () => {
  it("inserts a square retina transformation after the upload segment", () => {
    expect(cloudinaryThumb("https://res.cloudinary.com/demo/image/upload/v1769749094/users/avatar.jpg", 36)).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,g_face,w_72,h_72,f_auto,q_auto/v1769749094/users/avatar.jpg"
    );
  });

  it("leaves URLs outside Cloudinary untouched", () => {
    expect(cloudinaryThumb("https://example.com/avatar.png", 36)).toBe("https://example.com/avatar.png");
  });

  it("returns undefined for a missing avatar", () => {
    expect(cloudinaryThumb(null, 36)).toBeUndefined();
    expect(cloudinaryThumb("", 36)).toBeUndefined();
  });
});

describe("cloudinaryImage", () => {
  it("caps the width at twice the rendered size and lets Cloudinary pick the format", () => {
    expect(cloudinaryImage("https://res.cloudinary.com/demo/image/upload/v1769530250/covers/cover.png", 272)).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_limit,w_544,f_auto,q_auto/v1769530250/covers/cover.png"
    );
  });

  it("leaves URLs outside Cloudinary untouched", () => {
    expect(cloudinaryImage("https://example.com/cover.png", 272)).toBe("https://example.com/cover.png");
  });
});

describe("formatDateTime", () => {
  it("formats weekday, date and time", () => {
    const date = new Date(2026, 8, 18, 11, 30);

    expect(formatDateTime(date)).toBe("Fri, Sep 18, 2026, 11:30 AM");
    expect(formatDateTime(date.getTime())).toBe("Fri, Sep 18, 2026, 11:30 AM");
    expect(formatDateTime(date.toISOString())).toBe("Fri, Sep 18, 2026, 11:30 AM");
  });

  it("returns an empty string for missing or invalid values", () => {
    expect(formatDateTime(undefined)).toBe("");
    expect(formatDateTime("not a date")).toBe("");
  });
});
