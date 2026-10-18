import json
from pathlib import Path
import re
import subprocess
import sys
from game import verify
ROOT=Path(__file__).resolve().parents[1]
verify()
for file in ROOT.rglob('*.md'):
    if any(p.startswith('.') or p in ('vendor','node_modules') for p in file.relative_to(ROOT).parts): continue
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)',file.read_text()):
        if '://' not in target and not target.startswith('#') and not (file.parent/target.split('#')[0]).exists(): raise ValueError(f'Broken link: {file}: {target}')
subprocess.run([sys.executable,'-B','-m','unittest','discover','-s','tests','-v'],cwd=ROOT,check=True)
starter_js=sorted(str(p.relative_to(ROOT)) for p in (ROOT/'starters').rglob('*.js'))
for file in ['vendor/littlejs-ai/examples/emptyGame/game.js','vendor/littlejs-ai/examples/pong/game.js',*starter_js]:
    subprocess.run(['node','--check',file],cwd=ROOT,check=True)
subprocess.run(['node','--test','tests/input_core.cjs'],cwd=ROOT,check=True)
print('Vendor, catalog, docs, input mapping, starter and genre scaffold contracts passed; browser behavior is separate (tests/browser.cjs, tests/genres.cjs).')
