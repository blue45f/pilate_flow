import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { TensionDraftFigure } from "./TensionDraftFigure";
import { TENSION_PHASES } from "../models/tensionDrafts";
import type { TensionDraftId } from "../models/tensionDrafts";
afterEach(cleanup);
const IDS: readonly TensionDraftId[] = [
  "reformer-supine-strap-arm-press",
  "cadillac-supine-arm-spring-press",
];
describe("original tension renderer and SSR", () => {
  it("renders forty phase/side/mirror views with accessible normal SVG metadata and no media", () => {
    for (const draftId of IDS)
      for (const activeSide of ["left", "right"] as const)
        for (const mirrored of [false, true])
          for (const phase of TENSION_PHASES[draftId]) {
            const { container, unmount } = render(
              <TensionDraftFigure
                draftId={draftId}
                progress={phase.sample}
                activeSide={activeSide}
                mirrored={mirrored}
              />,
            );
            const svg = screen.getByRole("img");
            expect(svg).toHaveAttribute("viewBox", "0 0 640 360");
            expect(svg).toHaveAttribute("data-motion-draft-id", draftId);
            expect(svg).toHaveAttribute("data-progress", String(phase.sample));
            expect(svg).toHaveAttribute("data-active-side", activeSide);
            expect(svg).toHaveAttribute("data-view-mirrored", String(mirrored));
            expect(svg).toHaveAttribute("data-side-mode", "bilateral");
            expect(svg).toHaveAccessibleName(new RegExp(phase.label));
            expect(svg).toHaveAccessibleDescription(/전문가 검토 0/);
            expect(svg).toHaveAccessibleDescription(/힘·저항·설정/);
            expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
            expect(
              container.querySelectorAll(
                "image,img,video,foreignObject,script",
              ),
            ).toHaveLength(0);
            expect(
              container.querySelectorAll('[data-contact-target="handle-grip"]'),
            ).toHaveLength(2);
            expect(
              container.querySelectorAll(
                '[data-limb-part="arm"][data-limb-role="bilateral"]',
              ),
            ).toHaveLength(2);
            unmount();
          }
  });
  it("distinguishes tabletop/unknown ball/rope carriage from fixed feet/table/visual springs", () => {
    const { container, rerender } = render(
      <TensionDraftFigure draftId={IDS[0]} progress={0.51} />,
    );
    expect(
      container.querySelector('[data-carriage="moving"]'),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('[data-rigging="rope"]')).toHaveLength(2);
    expect(
      container.querySelector('[data-ball-kind="generic-unspecified-ball"]'),
    ).toHaveAttribute("data-ball-source-size-verified", "false");
    expect(
      container.querySelectorAll('[data-contact-target="ankle-ball"]'),
    ).toHaveLength(2);
    expect(screen.getByText("볼: 종류·크기 미확인")).toBeInTheDocument();
    expect(
      screen.getByText("기존 발 지지·도구 없음 계획과 다른 볼 변형"),
    ).toBeInTheDocument();
    rerender(<TensionDraftFigure draftId={IDS[1]} progress={0.51} mirrored />);
    expect(container.querySelector('[data-table="fixed"]')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-rigging="visual-spring"]'),
    ).toHaveLength(2);
    expect(
      container.querySelectorAll('[data-contact-target="heel-support"]'),
    ).toHaveLength(2);
    expect(container.querySelector("[data-carriage]")).not.toBeInTheDocument();
    expect(screen.getByText("스프링: 시각적 길이만 표시")).toBeInTheDocument();
  });
  it("SSR-renders forty storyboard frames with eighty unique title/description targets", () => {
    const frames = IDS.flatMap((draftId) =>
      (["left", "right"] as const).flatMap((activeSide) =>
        [false, true].flatMap((mirrored) =>
          TENSION_PHASES[draftId].map((p) => (
            <TensionDraftFigure
              key={`${draftId}-${activeSide}-${mirrored}-${p.id}`}
              draftId={draftId}
              progress={p.sample}
              activeSide={activeSide}
              mirrored={mirrored}
            />
          )),
        ),
      ),
    );
    const html = renderToStaticMarkup(<>{frames}</>),
      host = document.createElement("div");
    host.innerHTML = html;
    const svgs = Array.from(host.querySelectorAll("svg"));
    expect(svgs).toHaveLength(40);
    const refs = svgs.flatMap((svg) => [
      svg.getAttribute("aria-labelledby"),
      svg.getAttribute("aria-describedby"),
    ]);
    expect(new Set(refs).size).toBe(80);
    const ids = new Set(
      Array.from(host.querySelectorAll("[id]")).map((e) => e.id),
    );
    for (const ref of refs) expect(ids.has(ref!)).toBe(true);
    expect(html).not.toMatch(/NaN|Infinity|<image|<video|<script/);
  });
  it("SSR preserves mirrored anatomical input and clamps metadata with a custom title", () => {
    const html = renderToStaticMarkup(
        <TensionDraftFigure
          draftId={IDS[1]}
          progress={3}
          activeSide="left"
          mirrored
          label="캐딜락 원본 정지 프레임"
        />,
      ),
      host = document.createElement("div");
    host.innerHTML = html;
    const svg = host.querySelector("svg")!;
    expect(svg.getAttribute("data-progress")).toBe("1");
    expect(svg.getAttribute("data-active-side")).toBe("left");
    expect(svg.getAttribute("data-view-mirrored")).toBe("true");
    expect(host.querySelector("title")!.textContent).toBe(
      "캐딜락 원본 정지 프레임",
    );
    expect(host.textContent).toContain("실선: 몸의 왼쪽 · 점선: 몸의 오른쪽");
  });
});
