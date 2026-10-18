"""Local pinned LittleJS scaffolding. No package install, CDN or source generation."""
import argparse
import hashlib
import json
import re
from pathlib import Path
import shutil
import tempfile

ROOT=Path(__file__).resolve().parents[1]
STARTERS=ROOT/'starters'
GENRES=STARTERS/'genres'
KIT=STARTERS/'kit'
PRESETS=['emptyGame','pong']


def genres():
    """Genre starters: starters/genres/<id>/starter.json, each with its game.js."""
    return {p.parent.name:json.loads(p.read_text()) for p in sorted(GENRES.glob('*/starter.json'))}


def kebab(name):
    name=re.sub(r'([a-z0-9])([A-Z])',r'\1-\2',name)
    return re.sub(r'[^A-Za-z0-9]+','-',name).strip('-').lower() or 'game'


GENRE_HTML='''<!doctype html>
<html lang="en" data-game-id="{game_id}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title data-t="game.name">{title}</title>
<link rel="stylesheet" href="static/fonts.css">
<link rel="stylesheet" href="styles/game.css">
<link rel="stylesheet" href="styles/kit.css">
</head>
<body class="game-page">
  <div id="game" class="game" data-device="keyboard" style="width:100vw;height:100dvh">
    <!-- LittleJS puts its canvas here: engineInit(..., rootElement = #game) -->
    <div id="ui" class="game-layer">
      <!-- the game kit adds one <section> per screen: title, hud, pause, settings, controls... -->
      <p id="live" class="sr-only" aria-live="polite"></p>
    </div>
  </div>
  <script src="js/littlejs.js"></script>
  <script src="js/gc-input.js"></script><!-- gaming-core starters/input.js, copied as is -->
  <script src="js/messages.js"></script>
  <script src="js/input.js"></script>
  <script src="js/menu.js"></script>
  <script src="js/kit.js"></script>
  <script src="game.js"></script>
</body>
</html>
'''


def verify():
    lock=json.loads((ROOT/'vendor/LOCK.json').read_text())
    for source in lock['sources']:
        directory=ROOT/'vendor'/source['id']
        files={str(p.relative_to(directory)):p for p in directory.rglob('*') if p.is_file()}
        if set(files)!=set(source['sha256']): raise ValueError('Vendor file set changed')
        for name,p in files.items():
            if p.is_symlink() or hashlib.sha256(p.read_bytes()).hexdigest()!=source['sha256'][name]: raise ValueError(f'Vendor drift: {name}')
    return lock


def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def init_genre(genre,output):
    """A genre starter: the GameKit page (index.html, styles, fonts placeholder, kit scripts) and the genre's game.js."""
    lock=verify();meta=genres()[genre]
    output=Path(output).absolute()
    if any(p.is_symlink() for p in [output,*output.parents]): raise ValueError('Output must not contain symlinks')
    if output.exists(): raise ValueError('Output exists; edit the game instead of recreating it')
    source=ROOT/'vendor/littlejs-ai'
    output.parent.mkdir(parents=True,exist_ok=True)
    stage=Path(tempfile.mkdtemp(prefix='.gaming-core-',dir=output.parent))
    try:
        copies={'js/littlejs.js':(source/'dist/littlejs.js','LittleJS-AI dist/littlejs.js 1.27.0 (MIT)'),
                'js/gc-input.js':(STARTERS/'input.js','gaming-core starters/input.js (MIT)')}
        for path in sorted(KIT.rglob('*')):
            if path.is_file(): copies[str(path.relative_to(KIT))]=(path,f'gaming-core starters/kit/{path.relative_to(KIT)} (MIT; styles/game.css is the designer\'s GameKit stylesheet)')
        folder=GENRES/genre
        for path in sorted(folder.rglob('*')):
            if path.is_file() and path.name!='starter.json': copies[str(path.relative_to(folder))]=(path,f'gaming-core starters/genres/{genre}/{path.relative_to(folder)} (MIT)')
        for name,(origin,_) in copies.items():
            (stage/name).parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(origin,stage/name)
        (stage/'index.html').write_text(GENRE_HTML.format(game_id=kebab(output.name),title=meta['title']))
        for name,origin in [('LICENSE-littlejs-ai.txt',source/'LICENSE'),('LICENSE-littlejs.txt',ROOT/'vendor/littlejs/LICENSE'),('COPYRIGHT-littlejs.txt',ROOT/'vendor/littlejs/COPYRIGHT.txt'),('LICENSE-gaming-core.txt',ROOT/'LICENSE')]: shutil.copyfile(origin,stage/name)
        scripts=['js/littlejs.js','js/gc-input.js','js/messages.js','js/input.js','js/menu.js','js/kit.js','game.js']
        (stage/'build.json').write_text(json.dumps({'title':meta['title'],'name':kebab(output.name),'engine':'js/littlejs.js','sources':scripts[1:]},indent=2)+'\n')
        provenance={'schema':'gaming-core.scaffold/1','preset':genre,'kind':'genre','game_id':kebab(output.name),'card':meta.get('card'),'upstream':lock['sources'][0]['revision'],'engine_version':'1.27.0','engine_sha256':sha(stage/'js/littlejs.js'),
            'integration_status':'starter-only; not a verified consumer','fonts':'static/fonts.css is a placeholder (Silkscreen and DotGothic16 not vendored)',
            'local_files':{name:{'origin':origin,'sha256':sha(stage/name)} for name,(_,origin) in copies.items()}}
        (stage/'gaming-core.json').write_text(json.dumps(provenance,indent=2)+'\n')
        (stage/'README.md').write_text(f'# {meta["title"]}\n\nA gaming-core genre starter ({genre}). Open index.html or serve this folder locally; no install, no CDN.\n'
            'Edit game.js. The HTML layer (menus, HUD, prompts) is the game kit in js/ and styles/, the designer\'s GameKit blocks.\n'
            'Controls go through js/gc-input.js (gaming-core input, saved under <game-id>.input); texts are keys in js/messages.js and game.js, English and Japanese.\n'
            'static/fonts.css is a placeholder until the pixel fonts are fetched with your yes. Keep all license/provenance files.\n')
        (stage/'AGENTS.md').write_text(f'This game was scaffolded from the gaming-core {genre} starter. Read its recipe (gaming-core {meta.get("recipe","recipes/genres.md")}) first.\n'
            'Keep classic script order and LittleJS 1.27.0. Do not add a CDN. Read input with inputUpdate() once per tick; add actions in GAME_ACTIONS.\n'
            'Words, menus and numbers are HTML from js/kit.js, never drawn on the canvas. Add texts in both languages.\n'
            'Play the game in a browser (move, score, win or lose) before claiming success.\n')
        if output.exists(): raise ValueError('Output created concurrently')
        stage.rename(output)
    finally:
        if stage.exists(): shutil.rmtree(stage)
    return {'directory':str(output),'entry':'index.html','preset':genre,'kind':'genre','engine':'LittleJS 1.27.0','browser_verified':False}


def init(preset,output):
    if preset in genres(): return init_genre(preset,output)
    if preset not in PRESETS: raise ValueError(f'Unknown preset {preset}; choose one of {PRESETS+list(genres())}')
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
    q=a.add_parser('init');q.add_argument('preset',choices=PRESETS+list(genres()));q.add_argument('--out',required=True)
    a.add_parser('genres')
    args=p.parse_args()
    try:
        if args.action=='init': result=init(args.preset,args.out)
        elif args.action=='check': result={'verified':[s['id'] for s in verify()['sources']]}
        elif args.action=='genres': result={'genres':[{'id':k,**{x:v[x] for x in ('title','card','recipe','orientation') if x in v}} for k,v in genres().items()]}
        else:
            verify();result=json.loads((ROOT/'CATALOG.json').read_text())
        print(json.dumps(result,indent=2));return 0
    except (ValueError,OSError,KeyError) as error:
        print(json.dumps({'error':str(error),'published':False}));return 1


if __name__=='__main__': raise SystemExit(main())
