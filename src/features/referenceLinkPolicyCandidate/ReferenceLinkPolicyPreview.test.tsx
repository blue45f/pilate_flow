import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ReferenceLinkPolicyFixtureHarness,
  ReferenceLinkPolicyPreview,
  createReferencePlayerDisplayController,
  evaluateReferenceLinkCandidates,
} from './index';

afterEach(() => {
  cleanup();
});

describe('ReferenceLinkPolicyPreview & playerDisplayContract — click-to-load autoplay prevention & synthetic iframe fixture', () => {
  it('never mounts an iframe before explicit user click and blocks non-user-clicked programmatic load attempts', () => {
    const report = evaluateReferenceLinkCandidates(
      'autoplay-guard-test',
      '자동재생 방지 계약 테스트',
      [
        {
          candidateId: 'yt-1',
          title: '수동 로드 테스트 영상',
          publisher: '위드필라테스',
          url: 'https://www.youtube.com/watch?v=Y_9c3NFbm1A&autoplay=1',
          tier: 'curated-youtube-pool',
          region: 'kr',
        },
      ],
    );

    const controller = createReferencePlayerDisplayController(report, {
      iframeMode: 'local-synthetic-fixture',
    });

    // Initial state has no iframe mounted
    expect(controller.getSnapshot().state).toBe('idle-unmounted');
    expect(controller.getSnapshot().iframeMounted).toBe(false);
    expect(controller.getSnapshot().userClickVerified).toBe(false);
    expect(controller.getSnapshot().syntheticIframe).toBeNull();

    // Programmatic call with userClicked: false MUST be rejected
    const loadedFalse = controller.requestLoadEmbed({ userClicked: false });
    expect(loadedFalse).toBe(false);
    expect(controller.getSnapshot().iframeMounted).toBe(false);
    expect(controller.getSnapshot().syntheticIframe).toBeNull();

    // Explicit user click mounts the synthetic iframe with autoplay=0 and rel=0
    const loadedTrue = controller.requestLoadEmbed({ userClicked: true });
    expect(loadedTrue).toBe(true);
    const snap = controller.getSnapshot();
    expect(snap.state).toBe('loaded-manual');
    expect(snap.iframeMounted).toBe(true);
    expect(snap.userClickVerified).toBe(true);
    expect(snap.syntheticIframe?.mode).toBe('local-synthetic-fixture');
    expect(snap.syntheticIframe?.iframeSrc).toContain(
      '/src/features/referenceLinkPolicyCandidate/syntheticEmbedFrame.html?videoId=Y_9c3NFbm1A&rel=0&autoplay=0',
    );
    expect(snap.syntheticIframe?.canonicalEmbedUrl).toBe(
      'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0',
    );
    expect(snap.syntheticIframe?.allowAttribute).toBe(
      'encrypted-media; gyroscope; picture-in-picture',
    );
    expect(snap.syntheticIframe?.allowAttribute).not.toContain('autoplay');
  });

  it('renders idle guard without iframe initially, mounts local synthetic iframe on user click, and transitions to external-link-only on blocked/error', () => {
    const report = evaluateReferenceLinkCandidates(
      'ui-contract-test',
      'UI 플레이어 표시 계약 테스트',
      [
        {
          candidateId: 'yt-embeddable',
          title: '인라인 수동 임베드 가능 영상',
          publisher: '위드필라테스',
          url: 'https://youtu.be/Y_9c3NFbm1A?si=track123&t=30s',
          tier: 'curated-youtube-pool',
          region: 'kr',
        },
        {
          candidateId: 'web-external-only',
          title: 'Merrithew 공식 웹사이트 자료',
          publisher: 'Merrithew',
          url: 'https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair',
          tier: 'verified-catalog-reference',
          region: 'global',
        },
      ],
    );

    render(
      <ReferenceLinkPolicyPreview
        report={report}
        iframeMode="local-synthetic-fixture"
      />,
    );

    // 1. Before user click: zero iframes in DOM, external link present
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByTestId('rlpc-idle-guard-box')).toBeInTheDocument();
    const extLink = screen.getByTestId('rlpc-external-original-link');
    expect(extLink).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=Y_9c3NFbm1A&t=30s',
    );
    expect(extLink).toHaveAttribute('target', '_blank');
    expect(extLink).toHaveAttribute('rel', 'noopener noreferrer');

    // 2. Click manual load button -> mounts local synthetic iframe fixture
    fireEvent.click(screen.getByTestId('rlpc-manual-load-embed-btn'));
    const iframe = screen.getByTestId('rlpc-synthetic-iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('src')).toBe(
      '/src/features/referenceLinkPolicyCandidate/syntheticEmbedFrame.html?videoId=Y_9c3NFbm1A&rel=0&autoplay=0&start=30',
    );
    expect(iframe.getAttribute('data-canonical-embed-url')).toBe(
      'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0&start=30',
    );
    expect(iframe.getAttribute('allow')).not.toContain('autoplay');

    // 3. Simulate publisher embed block -> unmounts iframe and separates into external-link-only fallback
    fireEvent.click(screen.getByTestId('rlpc-simulate-embed-blocked-btn'));
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByTestId('rlpc-external-only-fallback-box')).toBeInTheDocument();
    expect(screen.getByTestId('rlpc-external-original-link')).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=Y_9c3NFbm1A&t=30s',
    );

    // 4. Reset fallback -> back to idle unmounted state
    fireEvent.click(screen.getByTestId('rlpc-reset-fallback-btn'));
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByTestId('rlpc-idle-guard-box')).toBeInTheDocument();

    // 5. Select external-link-only website candidate -> immediately renders external-only fallback without load button or iframe
    fireEvent.click(screen.getByTestId('rlpc-candidate-item-web-external-only'));
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.queryByTestId('rlpc-manual-load-embed-btn')).toBeNull();
    expect(screen.getByTestId('rlpc-external-only-fallback-box')).toBeInTheDocument();
    expect(screen.getByTestId('rlpc-external-original-link')).toHaveAttribute(
      'href',
      'https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair',
    );
  });

  it('unmounts active iframe on pagehide, tab switch, or subject replacement and never auto-resumes on pageshow', () => {
    const report = evaluateReferenceLinkCandidates(
      'lifecycle-test',
      '생명주기 언마운트 테스트',
      [
        {
          candidateId: 'yt-1',
          title: '생명주기 테스트 영상',
          publisher: '위드필라테스',
          url: 'https://www.youtube.com/watch?v=Y_9c3NFbm1A',
          tier: 'curated-youtube-pool',
          region: 'kr',
        },
      ],
    );

    render(<ReferenceLinkPolicyPreview report={report} />);
    fireEvent.click(screen.getByTestId('rlpc-manual-load-embed-btn'));
    expect(document.querySelector('iframe')).not.toBeNull();

    // pagehide unmounts iframe and pageshow does NOT auto-resume
    fireEvent(window, new Event('pagehide'));
    expect(document.querySelector('iframe')).toBeNull();
    fireEvent(window, new Event('pageshow'));
    expect(document.querySelector('iframe')).toBeNull();

    // Reload manually and test keyboard tab navigation unmounting the iframe
    fireEvent.click(screen.getByTestId('rlpc-manual-load-embed-btn'));
    expect(document.querySelector('iframe')).not.toBeNull();

    const allTab = screen.getByTestId('rlpc-tab-all');
    allTab.focus();
    fireEvent.keyDown(allTab, { key: 'ArrowRight' });
    expect(screen.getByTestId('rlpc-tab-embed-capable')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('renders the fixture harness presets and switches between synthetic verification scenarios cleanly', () => {
    render(<ReferenceLinkPolicyFixtureHarness />);
    const harness = screen.getByTestId('reference-link-policy-harness');
    expect(
      within(harness).getByTestId('rlpc-catalog-sample-audit-banner'),
    ).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();

    fireEvent.click(
      within(harness).getByTestId('fixture-preset-malicious-scheme-and-ssrf-guard'),
    );
    expect(within(harness).getByTestId('metric-accepted-count')).toHaveTextContent('1건');
    expect(within(harness).getByTestId('rlpc-rejected-diag-list')).toBeInTheDocument();
  });
});
