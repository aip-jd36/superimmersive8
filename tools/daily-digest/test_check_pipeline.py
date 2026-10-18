"""Fixture tests for check_pipeline.py. Run: python -m unittest tools/daily-digest/test_check_pipeline.py"""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from check_pipeline import check, main  # noqa: E402

HEADER = ('| id | name | stage | next_action | status |\n'
          '|----|------|-------|-------------|--------|\n')


def doc(rows):
    return '# CRM\n\n<!-- pipeline:start -->\n' + HEADER + ''.join(r + '\n' for r in rows) + '<!-- pipeline:end -->\n'


GOOD = ['| B001 | Ann | Followed Up | See `crm/ann.md` | waiting |',
        '| B002 | Bo | Not a Fit | — | done |']


class CheckPipelineTests(unittest.TestCase):
    def test_clean(self):
        self.assertEqual(check(doc(GOOD), {'ann.md'}), [])

    def test_extra_pipe_in_cell(self):
        rows = GOOD + ['| B003 | Cy | Call | Title: Director | Founder | pending |']
        errs = check(doc(rows), {'ann.md'})
        self.assertEqual(len(errs), 1)
        self.assertIn('B003', errs[0])
        self.assertIn('6 cells, header has 5', errs[0])

    def test_duplicate_id(self):
        errs = check(doc(GOOD + ['| B001 | Dup | Replied | — | pending |']), {'ann.md'})
        self.assertEqual(len(errs), 1)
        self.assertIn('duplicate id', errs[0])

    def test_broken_reference(self):
        errs = check(doc(GOOD + ['| B004 | Di | Followed Up | `crm/missing.md` | waiting |']), {'ann.md'})
        self.assertEqual(errs, ['line 8 (B004): references crm/missing.md, which does not exist'])

    def test_unreferenced_file(self):
        errs = check(doc(GOOD), {'ann.md', 'orphan.md'})
        self.assertEqual(errs, ['crm/orphan.md is not referenced by any pipeline row'])

    def test_missing_markers(self):
        self.assertIn('not found', check('# CRM\nno table\n', set())[0])

    def test_main_exit_codes(self):
        with tempfile.TemporaryDirectory() as d:
            md = os.path.join(d, 'CRM.md')
            crm = os.path.join(d, 'crm')
            os.mkdir(crm)
            for name in ('ann.md', 'README.md'):
                open(os.path.join(crm, name), 'w').close()
            with open(md, 'w', encoding='utf-8') as fh:
                fh.write(doc(GOOD))
            self.assertEqual(main(['--crm-md', md, '--crm-dir', crm]), 0)
            with open(md, 'w', encoding='utf-8') as fh:
                fh.write(doc(GOOD + ['| B001 | x | y | z | w |']))
            self.assertEqual(main(['--crm-md', md, '--crm-dir', crm]), 1)
            self.assertEqual(main(['--crm-md', os.path.join(d, 'nope.md'), '--crm-dir', crm]), 2)


if __name__ == '__main__':
    unittest.main()
