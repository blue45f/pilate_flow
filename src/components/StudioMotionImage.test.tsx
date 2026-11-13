import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudioMotionImage } from './StudioMotionImage';

afterEach(cleanup);
describe('lossless motion frame delivery', () => {
  it('offers a lossless source at native dimensions, preserves the original, and recovers from a failed source', () => {
    const onError = vi.fn();
    const { container, rerender } = render(<StudioMotionImage src="/motion-studio3d/footwork-start.png" alt="시작 자세" onError={onError} />);
    const img = screen.getByRole('img', { name: '시작 자세' });
    expect(img).toHaveAttribute('src', '/motion-studio3d/footwork-start.png');
    expect(img).toHaveAttribute('width', '900');
    expect(img).toHaveAttribute('height', '585');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(container.querySelector('source')).toHaveAttribute('srcset', '/motion-studio3d/footwork-start.webp');
    fireEvent.error(img);
    expect(container.querySelector('source')).toBeNull();
    expect(onError).not.toHaveBeenCalled();
    fireEvent.error(img);
    expect(onError).toHaveBeenCalledTimes(1);
    rerender(<StudioMotionImage src="/motion-studio3d/footwork-mid.png" alt="중간 자세" />);
    expect(container.querySelector('source')).toHaveAttribute('srcset', '/motion-studio3d/footwork-mid.webp');
  });
  it('leaves external or unlisted images on their supplied source without inventing another asset', () => {
    const { container } = render(<StudioMotionImage src="https://example.test/unknown.png" alt="참조" />);
    expect(container.querySelector('source')).toBeNull();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.test/unknown.png');
    expect(screen.getByRole('img')).not.toHaveAttribute('width');
  });
});
