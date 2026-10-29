import { books } from '../data/books.js';
import { buildExistingActivities, registerExistingActivities } from './existingActivities.js';

export const existingActivities = buildExistingActivities(books, window.RECORDED || {});
registerExistingActivities(existingActivities);
