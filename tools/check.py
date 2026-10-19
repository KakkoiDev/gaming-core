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
# testing protocol (test-core): every starter has its scenarios, every recipe card says where its scenarios are
for starter in ['emptyGame','pong','kit',*(f'genres/{p.name}' for p in sorted((ROOT/'starters/genres').iterdir()) if p.is_dir())]:
    scenarios=ROOT/'starters'/starter/'SCENARIOS.md'
    if not scenarios.exists() or '### Scenario: ' not in scenarios.read_text(): raise ValueError(f'No scenarios: {scenarios} needs "### Scenario: <title>" + Given/When/Then lines')
    test=ROOT/'tests/e2e'/(starter+'.cjs')
    if not test.exists(): raise ValueError(f'No scenario tests: {test}')
for card in sorted((ROOT/'recipes').rglob('*.md')):
    if card.name=='README.md': continue
    if not re.search(r'^(Scenarios:|No scenarios|## Scenarios)',card.read_text(),re.M): raise ValueError(f'{card}: say where its scenarios are ("Scenarios: ..." or "No scenarios: <why>")')
subprocess.run([sys.executable,'-B','-m','unittest','discover','-s','tests','-v'],cwd=ROOT,check=True)
starter_js=sorted(str(p.relative_to(ROOT)) for p in (ROOT/'starters').rglob('*.js'))
for file in ['vendor/littlejs-ai/examples/emptyGame/game.js','vendor/littlejs-ai/examples/pong/game.js',*starter_js]:
    subprocess.run(['node','--check',file],cwd=ROOT,check=True)
subprocess.run(['node','--test','tests/input_core.cjs'],cwd=ROOT,check=True)
print('Vendor, catalog, docs, input mapping, starter and genre scaffold contracts passed; browser behavior is separate (node tests/e2e.cjs, then sh tests/protocol.sh).')
