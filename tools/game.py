"""Local pinned LittleJS scaffolding. No package install, CDN or source generation."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

ROOT=Path(__file__).resolve().parents[1]
STARTERS=ROOT/'starters'


def verify():
    lock=json.loads((ROOT/'vendor/LOCK.json').read_text())
    for source in lock['sources']:
        directory=ROOT/'vendor'/source['id']
        files={str(p.relative_to(directory)):p for p in directory.rglob('*') if p.is_file()}
        if set(files)!=set(source['sha256']): raise ValueError('Vendor file set changed')
        for name,p in files.items():
            if p.is_symlink() or hashlib.sha256(p.read_bytes()).hexdigest()!=source['sha256'][name]: raise ValueError(f'Vendor drift: {name}')
    return lock


def init(preset,output):
    lock=verify()
    output=Path(output).absolute()
    if any(p.is_symlink() for p in [output,*output.parents]): raise ValueError('Output must not contain symlinks')
    if output.exists(): raise ValueError('Output exists; edit the game instead of recreating it')
    source=ROOT/'vendor/littlejs-ai'
    output.parent.mkdir(parents=True,exist_ok=True)
    stage=Path(tempfile.mkdtemp(prefix='.gaming-core-',dir=output.parent))
    try:
        shutil.copytree(source/'examples'/preset,stage,dirs_exist_ok=True)
        (stage/'dist').mkdir()
        shutil.copyfile(source/'dist/littlejs.js',stage/'dist/littlejs.js')
        # gaming-core input layer and the starter game.js adapted to it (original MIT, see starters/)
        shutil.copyfile(STARTERS/'input.js',stage/'input.js');shutil.copyfile(STARTERS/preset/'game.js',stage/'game.js')
        html=stage/'index.html';text=html.read_text().replace('../../dist/littlejs.js','dist/littlejs.js')
        if text.count('<script src=game.js></script>')!=1: raise ValueError('Unexpected starter index.html')
        html.write_text(text.replace('<script src=game.js></script>','<script src=input.js></script>\n<script src=game.js></script>'))
        for name,origin in [('LICENSE-littlejs-ai.txt',source/'LICENSE'),('LICENSE-littlejs.txt',ROOT/'vendor/littlejs/LICENSE'),('COPYRIGHT-littlejs.txt',ROOT/'vendor/littlejs/COPYRIGHT.txt'),('LICENSE-gaming-core.txt',ROOT/'LICENSE')]: shutil.copyfile(origin,stage/name)
        build=json.loads((stage/'build.json').read_text());build['engine']='dist/littlejs.js';build['sources']=['input.js','game.js']
        (stage/'build.json').write_text(json.dumps(build,indent=2)+'\n')
        provenance={'schema':'gaming-core.scaffold/1','preset':preset,'upstream':lock['sources'][0]['revision'],'engine_version':'1.27.0','engine_sha256':hashlib.sha256((stage/'dist/littlejs.js').read_bytes()).hexdigest(),'integration_status':'starter-only; not a verified consumer','local_files':{name:{'origin':origin,'sha256':hashlib.sha256((stage/name).read_bytes()).hexdigest()} for name,origin in [('input.js','gaming-core starters/input.js (MIT)'),('game.js',f'gaming-core starters/{preset}/game.js, adapted from LittleJS-AI examples/{preset} (MIT)')]}}
        (stage/'gaming-core.json').write_text(json.dumps(provenance,indent=2)+'\n')
        (stage/'README.md').write_text('# Local LittleJS starter\n\nOpen index.html or serve this folder locally. Engine is pinned and local.\nEdit game.js; keep classic script order (engine, input.js, game.js). No npm install is needed to play.\nControls: input.js maps keyboard, mouse and gamepad to named actions; see gaming-core recipes/input-actions.md.\nThe retained build.json is upstream metadata, not a shipped build command.\nKeep all license/provenance files when copying or publishing.\n')
        (stage/'AGENTS.md').write_text('Use the pinned gaming-core recipe library and LittleJS-AI reference for this engine.\nKeep classic script globals and the existing engine version. Do not add a CDN.\nRead controls once per frame with gcInput.update() from input.js; add actions with gcInput.init.\nInspect controls, gameplay and console in a browser before claiming success.\n')
        if output.exists(): raise ValueError('Output created concurrently')
        stage.rename(output)
    finally:
        if stage.exists(): shutil.rmtree(stage)
    return {'directory':str(output),'entry':'index.html','preset':preset,'engine':'LittleJS 1.27.0','browser_verified':False}


def main():
    p=argparse.ArgumentParser(description=__doc__);a=p.add_subparsers(dest='action',required=True)
    a.add_parser('check');a.add_parser('catalog')
    q=a.add_parser('init');q.add_argument('preset',choices=['emptyGame','pong']);q.add_argument('--out',required=True)
    args=p.parse_args()
    try:
        if args.action=='init': result=init(args.preset,args.out)
        elif args.action=='check': result={'verified':[s['id'] for s in verify()['sources']]}
        else:
            verify();result=json.loads((ROOT/'CATALOG.json').read_text())
        print(json.dumps(result,indent=2));return 0
    except (ValueError,OSError,KeyError) as error:
        print(json.dumps({'error':str(error),'published':False}));return 1


if __name__=='__main__': raise SystemExit(main())
