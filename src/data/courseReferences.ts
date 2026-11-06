import source from './courseCollectionSource.json';
import amendments from './coursePublisherAmendments.json';
import {
  applyCoursePublisherAmendments,
  readCourseReferences,
} from '../utils/courseReferences';

/** Whole-course discovery links. Never an exercise, motion or recommendation inventory. */
export const COURSE_REFERENCES = applyCoursePublisherAmendments(
  readCourseReferences(source),
  amendments,
);
