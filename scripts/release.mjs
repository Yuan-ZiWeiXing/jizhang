#!/usr/bin/env node
/**
 * 发布脚本：bump 版本 -> git commit/tag/push -> 打包 -> 创建 GitHub Release -> 上传文件
 * 用法：node scripts/release.mjs [patch|minor|major]
 * 需要环境变量 GH_TOKEN=你的 GitHub Personal Access Token
 */
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const GH_TOKEN = process.env.GH_TOKEN
if (!GH_TOKEN) {
  console.error('❌ 请设置环境变量 GH_TOKEN')
  console.error('   例：set GH_TOKEN=ghp_xxxxxxxxxxxx && node scripts/release.mjs')
  process.exit(1)
}

const OWNER = 'Yuan-ZiWeiXing'
const REPO = 'jizhang'

// 1. 读取并 bump 版本
const pkgPath = join(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const bumpType = process.argv[2] || 'patch'
const [major, minor, patch] = pkg.version.split('.').map(Number)
let newVersion
if (bumpType === 'major') newVersion = `${major + 1}.0.0`
else if (bumpType === 'minor') newVersion = `${major}.${minor + 1}.0`
else newVersion = `${major}.${minor}.${patch + 1}`

const oldVersion = pkg.version
pkg.version = newVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
console.log(`\n📦 版本 ${oldVersion} -> ${newVersion}`)

// 2. Vite 构建
console.log('\n🔨 构建前端...')
execSync('npx vite build', { cwd: root, stdio: 'inherit' })

// 3. electron-builder 打包
console.log('\n📦 打包 Windows 安装程序...')
execSync('npx electron-builder --win', { cwd: root, stdio: 'inherit' })

// 4. Git commit + tag + push
console.log('\n🚀 提交代码...')
execSync('git add -A', { cwd: root, stdio: 'inherit' })
execSync(`git commit -m "chore: release v${newVersion}"`, { cwd: root, stdio: 'inherit' })
execSync(`git tag v${newVersion}`, { cwd: root, stdio: 'inherit' })
execSync('git push origin HEAD --tags', { cwd: root, stdio: 'inherit' })
console.log(`✅ 已推送 tag v${newVersion}`)

// 5. 创建 GitHub Release
console.log('\n🎉 创建 GitHub Release...')
const releaseRes = await githubRequest('POST', `/repos/${OWNER}/${REPO}/releases`, {
  tag_name: `v${newVersion}`,
  name: `v${newVersion}`,
  body: `## 记账本 v${newVersion}\n\n自动发布`,
  draft: false,
  prerelease: false,
})
const releaseId = releaseRes.id
const uploadUrl = releaseRes.upload_url.replace('{?name,label}', '')
console.log(`✅ Release 创建成功 ID: ${releaseId}`)

// 6. 上传文件
const releaseDir = join(root, 'release')
const files = readdirSync(releaseDir).filter(f =>
  f.endsWith('.exe') || f.endsWith('.blockmap') || f === 'latest.yml'
)
console.log(`\n⬆️  上传 ${files.length} 个文件...`)
for (const file of files) {
  const filePath = join(releaseDir, file)
  const fileData = fs.readFileSync(filePath)
  const contentType = file.endsWith('.yml') ? 'text/yaml'
    : file.endsWith('.blockmap') ? 'application/octet-stream'
    : 'application/octet-stream'
  await uploadAsset(uploadUrl, file, fileData, contentType)
  console.log(`  ✅ ${file}`)
}

console.log(`\n🎊 发布完成！`)
console.log(`   https://github.com/${OWNER}/${REPO}/releases/tag/v${newVersion}\n`)

// ---- 工具函数 ----
function githubRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${GH_TOKEN}`,
        'User-Agent': 'jizhang-release-script',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        const json = JSON.parse(raw)
        if (res.statusCode >= 400) reject(new Error(`GitHub API ${res.statusCode}: ${json.message}`))
        else resolve(json)
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

function uploadAsset(uploadUrl, name, data, contentType) {
  return new Promise((resolve, reject) => {
    const url = new URL(uploadUrl + `?name=${encodeURIComponent(name)}`)
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': `token ${GH_TOKEN}`,
        'User-Agent': 'jizhang-release-script',
        'Content-Type': contentType,
        'Content-Length': data.length,
      },
    }, (res) => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`Upload failed ${res.statusCode}: ${raw}`))
        else resolve(JSON.parse(raw))
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}
