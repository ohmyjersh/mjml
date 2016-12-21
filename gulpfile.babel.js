import _ from 'lodash'
import { argv } from 'yargs'
import { cd, exec, rm } from 'shelljs'
import babel from 'gulp-babel'
import fs from 'fs'
import gulp from 'gulp'
import newer from 'gulp-newer'
import path from 'path'
import through from 'through2'


const ROOT_PATH = path.resolve(__dirname)
const PACKAGES_PATH = path.resolve(__dirname, './packages')
const packages = fs.readdirSync(PACKAGES_PATH)
  .filter(file => fs.statSync(path.resolve(PACKAGES_PATH, file)).isDirectory())
  .reduce((acc, file) => ({
    ...acc,
    [file]: path.resolve(PACKAGES_PATH, file)
  }), {})

const sharedDeps = [
  'lodash',
  'react-dom',
  'react'
]

let srcEx
let libFragment

if (path.win32 === path) {
  srcEx = /(packages\\[^\\]+)\\src\\/
  libFragment = '$1\\lib\\'
} else {
  srcEx = /(packages\/[^\/]+)\/src\//
  libFragment = '$1/lib/'
}

gulp.task('install', () => Promise.all(
    // Link all packages to the root
    _.map(packages, (directory, packageName) => new Promise(resolve => {
      cd(directory)
      exec('npm link')
      cd(ROOT_PATH)
      exec(`npm link ${packageName}`)
      resolve()
    }))
  )
  .then(() => Promise.all(
    // Remove duplicated packages and shared dependencies so they are loaded
    // from the top
    _.map(packages, directory => Promise.all(
      Object.keys(packages)
        .concat(sharedDeps)
        .map(dependencyName => new Promise(resolve => {
          rm('-rf', path.resolve(directory, 'node_modules', dependencyName))
          resolve()
        }))
    ))
  ))
)

gulp.task('build', () => {
  gulp.src(`${PACKAGES_PATH}/*/src/**/*.js`)
    .pipe(through.obj((file, encoding, callback) => {
      file.contents = new Buffer(String(file.contents).replace(/__MJML_VERSION__/g, require(path.resolve(PACKAGES_PATH, `${file.relative.split(path.sep)[0]}/package.json`)).version))
      callback(null, file)
    }))
    .pipe(through.obj((file, encoding, callback) => {
      file._path = file.path
      file.path = file.path.replace(srcEx, libFragment)
      callback(null, file)
    }))
    .pipe(newer(PACKAGES_PATH))
    .pipe(babel())
    .pipe(gulp.dest(PACKAGES_PATH))
})

gulp.task('test', () => {
  return Promise.all(
    Object.keys(packages).map(packageName => new Promise(resolve => {
      cd(packages[packageName])
      // test if there's a test directory
      exec('mocha --compilers js:babel-register')
      resolve()
    }))
  )
})

gulp.task('clean', () => Promise.all(
  // Remove package node_modules and lib directory
  _.map(packages, directory => new Promise(resolve => {
    rm('-rf', path.resolve(directory, 'node_modules'), path.resolve(directory, 'lib'))
    resolve()
  }))
))

gulp.task('version', () => {
  // Try to derive package name from directory where this was run from
  const pwd = process.env.PWD
  const pwdPackageName = Object.keys(packages).reduce((prev, name) => {
    return packages[name] === pwd ? name : prev
  }, undefined)

  // Check params
  const packageName = argv.pkg || argv.p || pwdPackageName
  const version = argv.version || argv.v

  if (!packageName || !version) {
    throw new Error('Usage: gulp version -p <package> -v <version>')
  }

  // Bump the version
  cd(packages[packageName])

  const execResult = exec(`npm version ${version}`)
  const bumpedVersion = execResult.toString().replace('\n', '').replace('v', '')

  // Commit and tag
  exec(`git add ${packages[packageName]}/package.json`)
  const message = `${packageName}@${bumpedVersion}`
  exec(`git commit -m "${message}"`)
  const tagName = `${packageName}-v${bumpedVersion}`
  exec(`git tag ${tagName}`)
})

gulp.task('publish', ['build'], () => {
  // Try to derive package name from directory where this was run from
  const pwd = process.env.PWD
  const pwdPackageName = Object.keys(packages).reduce((prev, name) => {
    return packages[name] === pwd ? name : prev
  }, undefined)

  // Check params
  const packageName = argv.pkg || argv.p || pwdPackageName
  if (!packageName) {
    throw new Error('Usage: gulp publish -p <package> -t <tag>')
  }

  // Publish
  cd(packages[packageName])

  exec(`npm publish${argv.t ? ` --tag ${argv.t}` : ''}`)
})
