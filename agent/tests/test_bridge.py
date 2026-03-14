"""Basic tests for synapse_agent.bridge module."""
import os
import pytest
from synapse_agent.bridge import _is_path_within, BLOCKED_COMMANDS, ToolBridge


class TestPathConfinement:
    """Test _is_path_within helper prevents directory traversal."""

    def test_child_within_parent(self, tmp_path):
        child = os.path.join(str(tmp_path), "subdir", "file.txt")
        assert _is_path_within(child, str(tmp_path)) is True

    def test_parent_itself(self, tmp_path):
        assert _is_path_within(str(tmp_path), str(tmp_path)) is True

    def test_outside_parent(self, tmp_path):
        outside = os.path.join(str(tmp_path), "..", "other")
        assert _is_path_within(outside, str(tmp_path)) is False

    def test_absolute_escape(self):
        if os.name == "nt":
            assert _is_path_within("C:\\Windows\\System32", "C:\\Users\\test") is False
        else:
            assert _is_path_within("/etc/passwd", "/home/user") is False


class TestBlockedCommands:
    """Verify dangerous commands are in the blocklist."""

    def test_common_dangerous_patterns(self):
        dangerous = ["rm -rf", "shutdown", "format ", "curl ", "ssh "]
        for cmd in dangerous:
            assert cmd in BLOCKED_COMMANDS, f"'{cmd}' should be blocked"

    def test_blocklist_not_empty(self):
        assert len(BLOCKED_COMMANDS) > 20


class TestToolBridge:
    """Test ToolBridge file operations with path confinement."""

    def test_list_files_confined(self, tmp_path):
        bridge = ToolBridge(work_dir=str(tmp_path))
        # Should work for work_dir itself
        result = bridge.list_files(str(tmp_path))
        assert "error" not in result

    def test_list_files_outside_blocked(self, tmp_path):
        bridge = ToolBridge(work_dir=str(tmp_path))
        if os.name == "nt":
            result = bridge.list_files("C:\\Windows")
        else:
            result = bridge.list_files("/etc")
        assert "error" in result
        assert "Access denied" in result["error"]

    def test_read_file_confined(self, tmp_path):
        test_file = tmp_path / "test.txt"
        test_file.write_text("hello world\nline 2\n")
        bridge = ToolBridge(work_dir=str(tmp_path))
        result = bridge.read_file(str(test_file))
        assert "error" not in result
        assert "hello world" in result["content"]

    def test_read_file_outside_blocked(self, tmp_path):
        bridge = ToolBridge(work_dir=str(tmp_path))
        if os.name == "nt":
            result = bridge.read_file("C:\\Windows\\System32\\drivers\\etc\\hosts")
        else:
            result = bridge.read_file("/etc/passwd")
        assert "error" in result
        assert "Access denied" in result["error"]