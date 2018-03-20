/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var VersionInfo = require('./lib/versionInfo')
var execute = require('./lib/execute')
const ignoredPaths = require('./lib/ignoredPaths')
const config = require('./lib/config')
const path = require('path')

const isWindows = process.platform === 'win32'
const isDarwin = process.platform === 'darwin'
var arch = 'x64'
const isLinux = process.platform === 'linux'

var env = {
  NODE_ENV: 'production',
  CHANNEL: process.env.CHANNEL,
  REF: process.env.REF || null,
  REFERRAL_API_KEY: process.env.REFERRAL_API_KEY
}

const channel = env.CHANNEL
const ref = env.REF

var channels = { nightly: true, developer: true, beta: true, dev: true }
if (!channels[channel]) {
  throw new Error('CHANNEL environment variable must be set to nightly, developer, beta or dev')
}

var appIcon
if (isWindows) {
  appIcon = `res/${channel}/app.ico`
  if (process.env.TARGET_ARCH === 'ia32') {
    arch = 'ia32'
  }
} else if (isDarwin) {
  appIcon = `res/${channel}/app.icns`
} else {
  appIcon = `res/${channel}/app.png`
}

var appName
switch (channel) {
  case 'nightly':
    appName = 'Brave-Nightly'
    break
  case 'developer':
    appName = 'Brave-Developer'
    break
  case 'beta':
    appName = 'Brave-Beta'
    break
  case 'dev':
    appName = 'Brave'
    break
  default:
    throw new Error('CHANNEL environment variable must be set to nightly, developer, beta or dev')
}

if (isLinux) {
  appName = appName.toLowerCase()
}

if (isWindows) {
  appName = appName.replace(/-/, '')
}

var productDirName = 'brave'
if (channel !== 'dev') {
  productDirName += `-${channel}`
}

const buildDir = appName + '-' + process.platform + '-' + arch
const torS3Prefix = 'https://s3.us-east-2.amazonaws.com/demo-tor-binaries/'

var sha512Tor
if (isDarwin) {
  sha512Tor = 'af09b7f31fcb3996db3883dff0c20187fdb9653fb5d207dc7e8d3d8cd9de90f2908e47f4414c03b5633a94183425e0c9804316ece353f8174ec4897559932a4e  '
} else if (isLinux) {
  sha512Tor = 'cdcac1dbd9a1d2865cb61cb3c0d6540196d4dd576f86fcbcbd70713f75d56bf8407e931056bcba5395506cf80b4f51ed620cc9bb0c43fda6c6730d87152b51b3  '
} else {
  sha512Tor = '0fbd88d590069fdc243fcdcc84b8aa10caa921fc11d7e776334f0cbd5b0095b21046adfd291be61dc414c232bc1ff22e7e8142b0af1d20e71154f8de66be83ab  '
}

var torURL = torS3Prefix + 'tor-' + process.platform
if (isWindows) {
  torURL += '.zip'
}

console.log('Writing buildConfig.js...')
config.writeBuildConfig(
  {
    channel: channel,
    BROWSER_LAPTOP_REV: require('git-rev-sync').long(),
    nodeEnv: env.NODE_ENV,
    ref: ref || null,
    referralAPI: env.REFERRAL_API_KEY
  },
  'buildConfig.js'
)

var cmds = ['echo cleaning up target...']

if (isWindows) {
  cmds = cmds.concat([
    'cmd.exe /c for /d %x in (*-win32-x64) do rmdir /s /q "%x"',
    'cmd.exe /c for /d %x in (*-win32-ia32) do rmdir /s /q "%x"'
  ])

  // Remove the destination folder
  cmds = cmds.concat([
    '(if exist dist rmdir /s /q dist)'
  ])
} else {
  cmds = cmds.concat([
    'rm -Rf ' + '*-' + process.platform + '-' + arch,
    'rm -Rf dist',
    `rm -f *.tar.bz2`
  ])
}

cmds = cmds.concat([
  'echo done',
  'echo starting build...'
])

console.log('Building version ' + VersionInfo.braveVersion + ' in ' + buildDir + ' with Electron ' + VersionInfo.electronVersion)

cmds = cmds.concat([
  '"./node_modules/.bin/webpack"',
  'npm run checks',
  `node ./node_modules/electron-packager/cli.js . ${appName}` +
    ' --overwrite=true' +
    ' --ignore="' + ignoredPaths.join('|') + '"' +
    ' --platform=' + process.platform +
    ' --arch=' + arch +
    ` --name="${appName}"` +
    ' --version=' + VersionInfo.electronVersion +
    ' --icon=' + appIcon +
    ' --asar=true' +
    ' --app-version=' + VersionInfo.braveVersion +
    ' --build-version=' + VersionInfo.electronVersion +
    ' --protocol="http" --protocol-name="HTTP Handler"' +
    ' --protocol="https" --protocol-name="HTTPS Handler"' +
    ` --product-dir-name="${productDirName}"` +
    ' --version-string.CompanyName="Brave Software"' +
    ` --version-string.ProductName="${appName}"` +
    ' --version-string.Copyright="Copyright 2017, Brave Software"' +
    ` --version-string.FileDescription="${appName}"`
])

function BuildManifestFile () {
  const fs = require('fs')
  const fileContents = fs.readFileSync('./res/Update.VisualElementsManifest.xml', 'utf8')
  const versionedFileContents = fileContents.replace(/{{braveVersion}}/g, 'app-' + VersionInfo.braveVersion)
  fs.writeFileSync('temp.VisualElementsManifest.xml', versionedFileContents, 'utf8')
}

if (isLinux) {
  cmds.push('ncp ./app/extensions ' + path.join(buildDir, 'resources', 'extensions'))
} else if (isDarwin) {
  const macAppName = `${appName}.app`
  cmds.push('ncp ./app/extensions ' + path.join(buildDir, macAppName, 'Contents', 'Resources', 'extensions'))
} else if (isWindows) {
  BuildManifestFile()
  cmds.push('move .\\temp.VisualElementsManifest.xml "' + path.join(buildDir, 'resources', 'Update.VisualElementsManifest.xml') + '"')
  cmds.push('copy .\\res\\start-tile-70.png "' + path.join(buildDir, 'resources', 'start-tile-70.png') + '"')
  cmds.push('copy .\\res\\start-tile-150.png "' + path.join(buildDir, 'resources', 'start-tile-150.png') + '"')
  cmds.push('makensis.exe -DARCH=' + arch + ` res/${channel}/braveDefaults.nsi`)
  cmds.push('ncp ./app/extensions ' + path.join(buildDir, 'resources', 'extensions'))

  // Make sure the Brave.exe binary is squirrel aware so we get squirrel events and so that Squirrel doesn't auto create shortcuts.
  cmds.push(`"node_modules/rcedit/bin/rcedit.exe" ./${appName}-win32-` + arch + `/${appName}.exe --set-version-string "SquirrelAwareVersion" "1"`)
}

// Verify tor binaries and bundle with Brave
var torPath
if (isDarwin) {
  torPath = path.join(buildDir, `${appName}.app`, 'Contents', 'Resources', 'extensions', 'bin')
} else {
  torPath = path.join(buildDir, 'resources', 'extensions', 'bin')
}

cmds.push('mkdirp ' + torPath)
cmds.push('curl -o ' + path.join(torPath, 'tor') + ' ' + torURL)
cmds.push('shasum -a 512 -c <<< "' + sha512Tor + path.join(torPath, 'tor') + '"')

if (isWindows) {
  cmds.push('unzip ' + path.join(torPath, 'tor') + ' -d ' + path.join(buildDir, 'resources', 'extensions', 'bin'))
}

if (isDarwin) {
  const macAppName = `${appName}.app`
  cmds.push('mkdirp ' + path.join(buildDir, macAppName, 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules', 'node-anonize2-relic-emscripten'))
  cmds.push('ncp ' + path.join('node_modules', 'node-anonize2-relic-emscripten', 'anonize2.js.mem') + ' ' + path.join(buildDir, macAppName, 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules', 'node-anonize2-relic-emscripten', 'anonize2.js.mem'))
} else {
  cmds.push('mkdirp ' + path.join(buildDir, 'resources', 'app.asar.unpacked', 'node_modules', 'node-anonize2-relic-emscripten'))
  cmds.push('ncp ' + path.join('node_modules', 'node-anonize2-relic-emscripten', 'anonize2.js.mem') + ' ' + path.join(buildDir, 'resources', 'app.asar.unpacked', 'node_modules', 'node-anonize2-relic-emscripten', 'anonize2.js.mem'))
}

execute(cmds, env, (err) => {
  if (err) {
    console.error('buildPackage failed', err)
    process.exit(1)
  }
  config.clearBuildConfig()
  console.log('done')
})
