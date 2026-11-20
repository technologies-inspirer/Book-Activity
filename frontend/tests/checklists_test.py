"""Run with python -m unittest discover -s tests -p checklists_test.py."""
import importlib.util
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('find_checklists', ROOT / 'tools/find_checklists.py')
detector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(detector)


class MaxfordChecklists(unittest.TestCase):
    def test_all_five_rows_include_the_row_touching_the_headings(self):
        for page in (28, 48, 66, 86, 104, 124):
            with self.subTest(page=page):
                checklist = detector.find('maxford-global-qaida-3-english', page, False)
                self.assertIsNotNone(checklist)
                self.assertEqual(len(checklist['rows']), 5)
                x, y, w, h = checklist['crop']
                for row in checklist['rows']:
                    self.assertLess(row['yes'][0], row['no'][0])
                    self.assertAlmostEqual(row['yes'][1], row['no'][1], delta=.15)
                    for r in row.values():
                        self.assertTrue(x <= r[0] < r[0] + r[2] <= x + w)
                        self.assertTrue(y <= r[1] < r[1] + r[3] <= y + h)

    def test_review_answer_boxes_are_not_checklists(self):
        for page in (27, 47, 65, 85, 103, 123, 133):
            with self.subTest(page=page):
                self.assertIsNone(detector.find('maxford-global-qaida-3-english', page, False))


if __name__ == '__main__':
    unittest.main()
