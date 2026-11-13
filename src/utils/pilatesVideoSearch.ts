import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import type { RawVerifiedYouTubeItem } from '../data/exerciseYouTubeCatalog';
import type { ApparatusType } from '../types/pilates';
import { matchesDiscoverySearch } from './discoverySearch';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function filterPilatesVideos(
  videos: readonly RawVerifiedYouTubeItem[],
  query: string,
  apparatus: ApparatusType | 'all',
  region: 'all' | 'kr' | 'global',
): RawVerifiedYouTubeItem[] {
  return videos.filter(
    (video) =>
      VIDEO_ID.test(video.videoId) &&
      (apparatus === 'all' || video.apparatus.includes(apparatus)) &&
      (region === 'all' || video.region === region) &&
      matchesDiscoverySearch(
        [
          video.title,
          video.authorName,
          ...video.keywords,
          ...video.apparatus.map((item) => APPARATUS_LABELS[item].ko),
        ],
        query,
      ),
  );
}
