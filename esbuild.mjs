import * as esbuild from 'esbuild'
import {sassPlugin} from 'esbuild-sass-plugin'


await esbuild.build({
  entryPoints: ['src/slektr.js', 'src/slektr.scss'],
  bundle: true,
  outdir: 'dist/',
  format: 'esm',
  target: ['chrome58', 'firefox57', 'safari11', 'edge16'],
  plugins: [
    sassPlugin()
  ]
})
