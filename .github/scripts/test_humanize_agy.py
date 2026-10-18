#!/usr/bin/env python3
"""Test the Antigravity (agy) adapter for the humanize hook. Added in the ramtoshiya fork."""

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

PLUGIN = Path(__file__).parents[2] / "plugins/humanize"
ADAPTER = PLUGIN / "hooks/scripts/agy.py"
SEMICOLON = chr(59)


def run_adapter(name, args, workspace="."):
    """Run the adapter with one agy PreToolUse payload."""
    payload = {"toolCall": {"name": name, "args": args}, "stepIdx": 1, "workspacePaths": [workspace]}
    output = subprocess.run(
        [sys.executable, ADAPTER], input=json.dumps(payload), capture_output=True, check=True, text=True
    ).stdout
    return json.loads(output)


class HumanizeAgyTest(unittest.TestCase):
    """Test that agy calls reach humanize and always get a decision agy accepts."""

    def test_warns_without_overriding_permissions_for_each_agy_tool(self):
        """Map write, replace, multi-replace, and shell arguments to the text humanize checks."""
        with tempfile.TemporaryDirectory() as tmp:
            notes = Path(tmp, "notes.md")
            notes.write_text("one\ntwo\nthree\n")
            cases = (
                (
                    "write_to_file",
                    {"TargetFile": str(notes), "CodeContent": f"Plain text{SEMICOLON} more."},
                    "semicolon",
                ),
                (
                    "replace_file_content",
                    {"TargetFile": str(notes), "TargetContent": "two", "ReplacementContent": "we leverage it"},
                    '"leverage"',
                ),
                (
                    "multi_replace_file_content",
                    {
                        "TargetFile": str(notes),
                        "ReplacementChunks": [
                            {"TargetContent": "one", "ReplacementContent": "ONE"},
                            {"TargetContent": "three", "ReplacementContent": "a vibrant place"},
                        ],
                    },
                    '"vibrant"',
                ),
                ("run_command", {"CommandLine": 'git commit -m "Leverage the cache"', "Cwd": tmp}, '"leverage"'),
            )
            for name, args, rule in cases:
                with self.subTest(name):
                    result = run_adapter(name, args, tmp)
                    self.assertEqual(result["decision"], "ask")
                    self.assertIn(rule, result["reason"])
                    self.assertIn("advisory only, call not blocked", result["reason"])

    def test_clean_and_failed_checks_defer_to_agy_permissions(self):
        """Answer "ask", because agy denies a call when the hook reply has no decision."""
        with tempfile.TemporaryDirectory() as tmp:
            clean = run_adapter("write_to_file", {"TargetFile": f"{tmp}/notes.md", "CodeContent": "Plain text."})
            self.assertEqual(clean, {"decision": "ask"})
            missing = {"TargetFile": f"{tmp}/missing.md", "TargetContent": "a", "ReplacementContent": "b"}
            failed = run_adapter("replace_file_content", missing)
            self.assertEqual(failed["decision"], "ask")
            self.assertIn("could not check", failed["reason"])

    def test_registered_command_answers_when_uv_cannot_start(self):
        """Keep agy tools usable when uv is missing from PATH."""
        hook = json.loads((PLUGIN / "agy/hooks.json").read_text())["humanize"]["PreToolUse"][0]["hooks"][0]
        with tempfile.TemporaryDirectory() as empty:
            output = subprocess.run(
                ["/bin/sh", "-c", hook["command"]],
                input="{}",
                capture_output=True,
                check=True,
                cwd=PLUGIN,
                env={**os.environ, "PATH": empty},
                text=True,
            ).stdout
        self.assertEqual(json.loads(output)["decision"], "ask")


if __name__ == "__main__":
    unittest.main()
