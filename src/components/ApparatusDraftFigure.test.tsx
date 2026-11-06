import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ApparatusDraftFigure } from "./ApparatusDraftFigure";
import { APPARATUS_PHASES } from "../models/apparatusDrafts";
import type { ApparatusDraftId } from "../models/apparatusDrafts";
afterEach(cleanup);
const IDS: readonly ApparatusDraftId[] = [
  "reformer-parallel-footwork",
  "chair-seated-pedal-press",
];
describe("original apparatus renderer", () => {
  it("renders forty phase/side/mirror frames with bilateral anatomical and contact metadata", () => {
    for (const draftId of IDS)
      for (const activeSide of ["left", "right"] as const)
        for (const mirrored of [false, true])
          for (const phase of APPARATUS_PHASES[draftId]) {
            const { container, unmount } = render(
              <ApparatusDraftFigure
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
            expect(svg).toHaveAttribute("data-progress", String(phase.sample));
            expect(svg).toHaveAttribute("data-side-mode", "bilateral");
            expect(svg).toHaveAccessibleName(new RegExp(phase.label));
            expect(svg).toHaveAccessibleDescription(/전문가 미검토 원본/);
            expect(svg).toHaveAccessibleDescription(/스프링 힘·설정/);
            expect(
              container.querySelector('[data-anatomical-side="left"]'),
            ).toHaveAttribute("data-limb-role", "bilateral");
            expect(
              container.querySelector('[data-anatomical-side="right"]'),
            ).toHaveAttribute("data-limb-role", "bilateral");
            expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
            expect(
              container.querySelectorAll(
                "image,img,video,foreignObject,script",
              ),
            ).toHaveLength(0);
            expect(
              screen.getByText("실선: 몸의 왼쪽 · 점선: 몸의 오른쪽"),
            ).toBeInTheDocument();
            unmount();
          }
  });
  it("distinguishes moving carriage support from a hinged Pilates-chair pedal", () => {
    const { container, rerender } = render(
      <ApparatusDraftFigure
        draftId="reformer-parallel-footwork"
        progress={0.51}
      />,
    );
    expect(
      container.querySelector('[data-carriage="moving"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-contact-frame="carriage"]'),
    ).toHaveLength(3);
    expect(
      container.querySelectorAll('[data-contact-target="footbar"]'),
    ).toHaveLength(2);
    expect(
      screen.getByText("머리·등·골반: 캐리지와 함께 이동"),
    ).toBeInTheDocument();
    rerender(
      <ApparatusDraftFigure
        draftId="chair-seated-pedal-press"
        progress={0.51}
        mirrored
      />,
    );
    expect(
      container.querySelector('[data-apparatus="pilates-chair"]'),
    ).toHaveAttribute("data-ordinary-chair", "false");
    expect(
      container.querySelector('[data-chair-pedal="hinged"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-contact-target="chair-pedal"]'),
    ).toHaveLength(2);
    expect(
      container.querySelectorAll('[data-contact-target="chair-seat"]'),
    ).toHaveLength(2);
    expect(screen.getByText("양 좌골: 좌면 지지 고정")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleDescription(
      /일반 의자가 아닌 필라테스 체어/,
    );
  });
  it("assigns unique title/description references to ten simultaneous storyboard images", () => {
    render(
      <>
        {IDS.flatMap((draftId) =>
          APPARATUS_PHASES[draftId].map((p) => (
            <ApparatusDraftFigure
              key={`${draftId}-${p.id}`}
              draftId={draftId}
              progress={p.sample}
            />
          )),
        )}
      </>,
    );
    const refs = screen
      .getAllByRole("img")
      .flatMap((svg) => [
        svg.getAttribute("aria-labelledby"),
        svg.getAttribute("aria-describedby"),
      ]);
    expect(new Set(refs).size).toBe(20);
    for (const id of refs)
      expect(document.getElementById(id!)).toBeInTheDocument();
  });
  it("normalizes progress metadata and permits an accessible label override", () => {
    render(
      <ApparatusDraftFigure
        draftId="chair-seated-pedal-press"
        progress={4}
        activeSide="left"
        label="정지한 체어 초안"
      />,
    );
    expect(
      screen.getByRole("img", { name: "정지한 체어 초안" }),
    ).toHaveAttribute("data-progress", "1");
    expect(screen.getByRole("img")).toHaveAttribute("data-active-side", "left");
  });
});
