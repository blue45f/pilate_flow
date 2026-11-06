import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SupineDraftFigure } from "./SupineDraftFigure";
import { SUPINE_PHASES } from "../models/supineDrafts";
import type { SupineDraftId } from "../models/supineDrafts";

afterEach(cleanup);
const IDS: readonly SupineDraftId[] = [
  "adult-supine-heel-slide",
  "supine-knee-fold",
];

describe("independent supine SVG draft renderer", () => {
  it("renders all five phases on either anatomical side and either view without nonfinite or imported media", () => {
    for (const draftId of IDS) {
      for (const activeSide of ["left", "right"] as const) {
        for (const mirrored of [false, true]) {
          for (const phase of SUPINE_PHASES[draftId]) {
            const { container, unmount } = render(
              <SupineDraftFigure
                draftId={draftId}
                progress={phase.sample}
                activeSide={activeSide}
                mirrored={mirrored}
              />,
            );
            const svg = screen.getByRole("img");
            expect(svg).toHaveAttribute("viewBox", "0 0 640 360");
            expect(svg).toHaveAttribute("data-motion-draft-id", draftId);
            expect(svg).toHaveAttribute("data-active-side", activeSide);
            expect(svg).toHaveAttribute("data-view-mirrored", String(mirrored));
            expect(svg).toHaveAccessibleName(new RegExp(phase.label));
            expect(svg).toHaveAccessibleDescription(/전문가 미검토 원본 도해/);
            expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
            expect(
              container.querySelectorAll(
                "image, img, video, foreignObject, script",
              ),
            ).toHaveLength(0);
            expect(
              container.querySelector(`[data-anatomical-side="${activeSide}"]`),
            ).toHaveAttribute("data-limb-role", "active");
            expect(
              container.querySelectorAll("[data-contact-id]"),
            ).toHaveLength(4);
            unmount();
          }
        }
      }
    }
  });

  it("keeps anatomical labels and contact status when the view mirrors", () => {
    const { container, rerender } = render(
      <SupineDraftFigure
        draftId="supine-knee-fold"
        progress={0.51}
        activeSide="right"
      />,
    );
    expect(
      container.querySelector('[data-leg-label="right"]'),
    ).toHaveTextContent("몸의 오른쪽 · 움직임");
    expect(
      container.querySelector('[data-leg-label="left"]'),
    ).toHaveTextContent("몸의 왼쪽 · 고정");
    expect(screen.getByText("선택한 발: 매트에서 떨어짐")).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-contact-state="lifted"]'),
    ).toHaveLength(2);
    expect(container.querySelector("[data-lift-guide]")).toBeInTheDocument();
    rerender(
      <SupineDraftFigure
        draftId="supine-knee-fold"
        progress={0.51}
        activeSide="right"
        mirrored
      />,
    );
    expect(
      container.querySelector('[data-leg-label="right"]'),
    ).toHaveTextContent("몸의 오른쪽 · 움직임");
    expect(
      screen.getByText("화면 반전 켬 · 해부학적 쪽 유지"),
    ).toBeInTheDocument();
    rerender(
      <SupineDraftFigure
        draftId="adult-supine-heel-slide"
        progress={0.51}
        activeSide="right"
        mirrored
      />,
    );
    expect(screen.getByText("선택한 뒤꿈치: 매트 접촉")).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-contact-state="sliding"]'),
    ).toHaveLength(2);
    expect(
      container.querySelectorAll('[data-contact-state="lifted"]'),
    ).toHaveLength(0);
    expect(
      container.querySelector("[data-lift-guide]"),
    ).not.toBeInTheDocument();
  });

  it("gives every storyboard frame unique accessible title and description IDs", () => {
    render(
      <>
        {IDS.flatMap((draftId) =>
          SUPINE_PHASES[draftId].map((phase) => (
            <SupineDraftFigure
              key={`${draftId}-${phase.id}`}
              draftId={draftId}
              progress={phase.sample}
            />
          )),
        )}
      </>,
    );
    const images = screen.getAllByRole("img");
    const references = images.flatMap((svg) => [
      svg.getAttribute("aria-labelledby"),
      svg.getAttribute("aria-describedby"),
    ]);
    expect(new Set(references).size).toBe(20);
    for (const id of references)
      expect(document.getElementById(id!)).toBeInTheDocument();
  });

  it("uses normalized progress in metadata and accepts a custom accessible label", () => {
    render(
      <SupineDraftFigure
        draftId="supine-knee-fold"
        progress={3}
        label="니 폴드 정지 프레임"
      />,
    );
    expect(
      screen.getByRole("img", { name: "니 폴드 정지 프레임" }),
    ).toHaveAttribute("data-progress", "1");
    expect(screen.getByRole("img")).toHaveAccessibleDescription(
      /각도·비율·시간은 제작 선택/,
    );
  });
});
