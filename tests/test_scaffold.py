import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('game',ROOT/'tools/game.py'); game=importlib.util.module_from_spec(spec); spec.loader.exec_module(game)


class Scaffold(unittest.TestCase):
    def test_local_engine_and_both_starters(self):
        game.verify()
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary).resolve()
            for preset in ['emptyGame','pong']:
                output=root/preset;game.init(preset,output)
                html=(output/'index.html').read_text()
                self.assertIn('src=dist/littlejs.js',html);self.assertNotIn('https://',html)
                self.assertEqual((output/'dist/littlejs.js').read_bytes(),(ROOT/'vendor/littlejs-ai/dist/littlejs.js').read_bytes())
                metadata=json.loads((output/'gaming-core.json').read_text())
                self.assertEqual(metadata['engine_sha256'],hashlib.sha256((output/'dist/littlejs.js').read_bytes()).hexdigest())
                with self.assertRaises(ValueError):game.init(preset,output)
                self.assertTrue((output/'game.js').exists())
                self.assertTrue((output/'LICENSE-littlejs-ai.txt').exists())
                self.assertTrue((output/'LICENSE-gaming-core.txt').exists())
                self.assertLess(html.index('src=dist/littlejs.js'),html.index('src=input.js'));self.assertLess(html.index('src=input.js'),html.index('src=game.js'))
                self.assertEqual((output/'input.js').read_bytes(),(ROOT/'starters/input.js').read_bytes())
                self.assertEqual((output/'game.js').read_bytes(),(ROOT/'starters'/preset/'game.js').read_bytes())
                self.assertIn('gcInput.update()',(output/'game.js').read_text())
                self.assertEqual(json.loads((output/'build.json').read_text())['sources'],['input.js','game.js'])
                for name,entry in metadata['local_files'].items():self.assertEqual(entry['sha256'],hashlib.sha256((output/name).read_bytes()).hexdigest())

    def test_reference_catalog_paths(self):
        catalog=json.loads((ROOT/'CATALOG.json').read_text())
        self.assertGreater(len(catalog['examples']),50)
        for entry in catalog['examples']+catalog['templates']+catalog['skills']+catalog['starters']:
            self.assertTrue((ROOT/entry['path']).is_file(),entry['path'])
