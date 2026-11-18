# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///

"""Locates skill script directories so any script can import a sibling skill.

Skills are folders, not Python packages, and they appear side by side either in
the source tree or installed under an agent skill directory (such as
``~/.*/skills``, ``~/.*/config/skills``, or ``$RDKIT_SKILLS_ROOT``). Every
layout keeps the skills as siblings, so walking up from ``__file__`` locates the
shared root when running in tree, with install-root discovery as a fallback.
Nothing else in the family should hardcode an install path.

Two ways to use it.

From a companion skill script, after adding ``/opt/skills/rdkit-general/scripts``
relative to ``__file__`` onto ``sys.path``::

    from skill_paths import add_skill_scripts
    add_skill_scripts("cheminformatics-core")
    from descriptors import calculate_cns_mpo

From standalone scratch code (for example in ``/tmp``), prepend the
colon-separated path list printed by ``skill_paths.py`` to ``PYTHONPATH`` on the
same command line (so fresh subshells receive it and any existing ``PYTHONPATH``
is preserved; ``scripts/skill_paths.py`` is relative to the ``rdkit-general``
skill directory)::

    PYTHONPATH="$(python3 scripts/skill_paths.py)${PYTHONPATH:+:$PYTHONPATH}" python3 app.py

Script basenames are unique across the skills, so that flat path is unambiguous.
"""

import os
import sys
from typing import List, Tuple

# The skill family this module resolves. Basename uniqueness is enforced
# across these by the doc consistency test, which is what makes a flat
# PYTHONPATH safe.
SKILL_PREFIXES = ("rdkit-", "rdkit_", "cheminformatics-", "cheminformatics_")

# Directories under scripts/ that hold generated or vendored content rather
# than importable modules.
_SKIP_DIRS = frozenset({"__pycache__", "mol_cache", "images", "tex"})

_MARKER = os.path.join("rdkit-general", "scripts")


def _discover_install_roots() -> Tuple[str, ...]:
  """Discovers candidate skill roots from $RDKIT_SKILLS_ROOT and ~/.*/*skills."""
  roots: List[str] = ["/opt/skills"]
  env_root = os.environ.get("RDKIT_SKILLS_ROOT", "")
  if env_root:
    roots.append(env_root)
  home = os.path.expanduser("~")
  try:
    entries = sorted(os.listdir(home))
  except OSError:
    entries = []
  for entry in entries:
    if entry.startswith("."):
      roots.append(os.path.join(home, entry, "skills"))
      roots.append(os.path.join(home, entry, "config", "skills"))
  return tuple(roots)


def _resolve_install_root() -> str:
  """Selects the active fallback install root when outside a sibling tree."""
  candidates = _discover_install_roots()
  env_root = os.environ.get("RDKIT_SKILLS_ROOT", "")
  if env_root and os.path.isdir(env_root):
    return env_root
  for cand in candidates:
    if os.path.isdir(os.path.join(cand, _MARKER)):
      return cand
  for cand in candidates:
    if os.path.isdir(cand):
      return cand
  return env_root or os.path.join(os.path.expanduser("~"), "skills")


INSTALL_ROOT = _resolve_install_root()


def skills_root() -> str:
  """Returns the directory holding the skill folders as siblings.

  Walks up from this file looking for ``rdkit-general/scripts``, which every
  layout contains. Falls back to ``_resolve_install_root()`` when this file has
  been copied somewhere outside such a tree.
  """
  node = os.path.dirname(os.path.abspath(__file__))
  while node != os.path.dirname(node):
    if os.path.isdir(os.path.join(node, _MARKER)):
      return node
    node = os.path.dirname(node)
  return _resolve_install_root()


def skill_dir(skill: str, *subdirs: str) -> str:
  """Returns the absolute path of a directory inside a skill folder.

  Args:
    skill: skill folder name, e.g. ``cheminformatics-core``.
    *subdirs: path components below the skill folder, e.g. ``"scripts"``.

  Returns:
    Absolute path. Existence is not checked; callers that need the directory
    should use `add_skill_scripts`.
  """
  root = skills_root()
  primary = os.path.join(root, skill, *subdirs)
  if os.path.exists(primary):
    return primary
  alt = skill.replace("_", "-") if "_" in skill else skill.replace("-", "_")
  alt_path = os.path.join(root, alt, *subdirs)
  return alt_path if os.path.exists(alt_path) else primary


def add_skill_scripts(skill: str, *subdirs: str) -> str:
  """Puts a skill's script directory on ``sys.path`` and returns it.

  Appended rather than inserted: a copy sitting beside the calling script
  must keep priority over one resolved through here.

  Args:
    skill: skill folder name, e.g. ``cheminformatics-core``.
    *subdirs: optional subdirectories below ``scripts/``.

  Returns:
    The absolute path that was added.

  Raises:
    FileNotFoundError: if the directory does not exist. Reported rather than
      ignored, because the import that follows would otherwise fail with a
      `ModuleNotFoundError` that says nothing about the missing skill.
  """
  alt = skill.replace("_", "-") if "_" in skill else skill.replace("-", "_")
  path = skill_dir(skill, "scripts", *subdirs)
  if not os.path.isdir(path):
    path = skill_dir(alt, "scripts", *subdirs)
  if subdirs and not os.path.isdir(path):
    path = skill_dir(skill, "scripts")
  if not os.path.isdir(path):
    raise FileNotFoundError(
        f"{path} does not exist. Resolved from skills root {skills_root()}; "
        f"check that the {skill} skill is installed alongside rdkit-general: "
        "https://github.com/google-deepmind/science-skills#getting-started-with-gdm-science-skills"
    )
  if path not in sys.path:
    sys.path.append(path)
  return path


def script_dirs() -> List[str]:
  """Returns every skill directory that holds importable modules."""
  root = skills_root()
  if not os.path.isdir(root):
    return []
  found = []
  for skill in sorted(os.listdir(root)):
    if not skill.startswith(SKILL_PREFIXES):
      continue
    scripts = os.path.join(root, skill, "scripts")
    if not os.path.isdir(scripts):
      continue
    for dirpath, dirnames, filenames in os.walk(scripts):
      dirnames[:] = sorted(
          d for d in dirnames if d not in _SKIP_DIRS and not d.startswith(".")
      )
      if any(f.endswith(".py") for f in filenames):
        found.append(dirpath)
  return found


def main() -> None:
  print(os.pathsep.join(script_dirs()))


if __name__ == "__main__":
  main()
