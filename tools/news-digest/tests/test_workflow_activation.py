"""
SI8-INTEL-NEWS-5B6 -- workflow_dispatch experiment activation tests.

String/structural checks against the actual workflow YAML -- no PyYAML
dependency is introduced (none exists in requirements.txt today); these
assertions mirror test_boundary.py's own substring-based verification
style. No network call, no workflow dispatch, anywhere in this file.
"""

import unittest
from pathlib import Path

WORKFLOW_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".github" / "workflows" / "news-digest.yml"


class TestExperimentActivationInput(unittest.TestCase):
    def setUp(self):
        self.text = WORKFLOW_PATH.read_text(encoding="utf-8")

    def test_experiment_recency_input_declared_with_default_false(self):
        self.assertIn("experiment_recency:", self.text)
        # The input's own default line must read 'false' -- same
        # required/default shape as the pre-existing dry_run input.
        idx = self.text.index("experiment_recency:")
        block = self.text[idx: idx + 300]
        self.assertIn("required: false", block)
        self.assertIn("default: 'false'", block)

    def test_schedule_trigger_unaffected(self):
        self.assertIn("cron: '0 1 */3 * *'", self.text)
        self.assertNotIn("push:", self.text, "no push trigger may be added -- this workflow must remain schedule + workflow_dispatch only")

    def test_lookback_and_dry_run_inputs_unchanged(self):
        self.assertIn("default: '7'", self.text)
        idx = self.text.index("dry_run:")
        block = self.text[idx: idx + 200]
        self.assertIn("default: 'false'", block)

    def test_experiment_flag_only_passed_when_input_is_literal_true(self):
        self.assertIn('if [ "${{ github.event.inputs.experiment_recency }}" = "true" ]; then', self.text)
        self.assertIn('EXPERIMENT_FLAG="--experiment-recency"', self.text)

    def test_experiment_flag_appended_to_the_actual_run_command(self):
        self.assertIn("python digest.py --lookback $LOOKBACK_DAYS $DRY_RUN_FLAG $EXPERIMENT_FLAG", self.text)

    def test_no_unconditional_experiment_activation(self):
        """The literal flag string must never appear outside the
        conditional block that gates it on the input equaling 'true'."""
        self.assertNotIn("EXPERIMENT_FLAG=\"--experiment-recency\"\n" + "\n", self.text)
        # The only occurrence of the flag being set must be inside the if-block.
        self.assertEqual(self.text.count('EXPERIMENT_FLAG="--experiment-recency"'), 1)

    def test_query_taxonomy_provider_and_other_inputs_not_touched_by_this_change(self):
        # "when:7d" legitimately appears in the new input's own description
        # (documenting the already-approved NEWS-5B5 mechanism) -- these
        # checks guard against a NEW provider/edition/taxonomy parameter
        # being introduced into the workflow itself, not against mentioning
        # the existing mechanism in prose.
        for forbidden in ("gl=", "hl=", "ceid=", "KEYWORD_CLUSTERS"):
            self.assertNotIn(forbidden, self.text)


if __name__ == "__main__":
    unittest.main()
