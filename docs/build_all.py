"""Regenerates every document: python build_all.py (needs python-docx reportlab python-pptx matplotlib pillow)."""
import runpy, pathlib
here = pathlib.Path(__file__).parent
import os; os.chdir(here)
for s in ("make_diagrams.py", "build_md.py", "build_report.py", "build_pptx.py"):
    runpy.run_path(str(here / s), run_name="__main__")
