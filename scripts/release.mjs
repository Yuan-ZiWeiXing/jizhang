#!/usr/bin/env node
/**
 * 发布脚本：提交代码 -> bump版本 -> 构建打包 -> 推送tag -> 创建Release
 * 用法：
 *   npm run release         # patch (1.0.1 -> 1.0.2)
 *   npm run release:minor   # minor
 *   npm run release:major   # major
 * 需要环境变量：GH_TOKEN
 */
import { execSync, exec } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import { HttpsProxyAgent } from 'https-proxy-agent'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const GH_TOKEN = process.env.GH_TOKEN
if (!GH_TOKEN) {
  console.error('\n❌ 缺少 GH_TOKEN')
  console.error('   set GH_TOKEN=ghp_xxx && npm run release')
  process.exit(1)
}

const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || ''
const agent = PROXY ? new HttpsProxyAgent(PROXY) : undefined
const OWNER = 'Yuan-ZiWeiXing'
const REPO = 'jizhang'
const bumpType = process.argv[2] || 'patch'

// ---- 1. 提交当前未提交的代码 ----
console.log('\n📝 检查工作区...')
const status = execSync('git status --porcelain', { cwd: root }).toString().trim()
if (status) {
  console.log('  提交未暂存的改动...')
  if (PROXY) execSync(`git config http.proxy ${PROXY}`, { cwd: root })
  execSync('git add -A', { cwd: root, stdio: 'inherit' })
  try {
    execSync('git commit -m "chore: pre-release changes"', { cwd: root, stdio: 'inherit' })
  } catch {}
}

// ---- 2. Bump 版本 ----
const pkgPath = join(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const [major, minor, patch] = pkg.version.split('.').map(Number)
const newVersion =
  bumpType === 'major' ? `${major + 1}.0.0` :
  bumpType === 'minor' ? `${major}.${minor + 1}.0` :
  `${major}.${minor}.${patch + 1}`

console.log(`\n🔖 版本 ${pkg.version} -> ${newVersion}`)
pkg.version = newVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

// ---- 3. 构建 ----
console.log('\n🔨 构建前端...')
execSync('npx vite build', { cwd: root, stdio: 'inherit' })

console.log('\n📦 打包 Windows 安装程序...')
execSync('npx electron-builder --win', { cwd: root, stdio: 'inherit' })

// ---- 4. Git commit + tag + push ----
console.log('\n🚀 提交并推送...')
const authRemote = `https://${GH_TOKEN}@github.com/${OWNER}/${REPO}.git`
// 优先用 socks5，fallback 到 http
const proxyForGit = PROXY.replace('http://', 'socks5://')
execSync(`git config http.proxy ${proxyForGit}`, { cwd: root })
execSync('git add -A', { cwd: root, stdio: 'inherit' })
try {
  execSync(`git commit -m "chore: release v${newVersion}"`, { cwd: root, stdio: 'inherit' })
} catch {}
try {
  execSync(`git tag v${newVersion}`, { cwd: root })
} catch {
  console.log(`  tag v${newVersion} 已存在，跳过`)
}
try {
  execSync(`git push ${authRemote} HEAD --tags`, { cwd: root, stdio: 'inherit' })
} catch {
  console.log('  socks5 失败，尝试 http 代理...')
  execSync(`git config http.proxy ${PROXY}`, { cwd: root })
  execSync(`git push ${authRemote} HEAD --tags`, { cwd: root, stdio: 'inherit' })
}
console.log('✅ 代码和标签已推送')

// ---- 5. 创建 GitHub Release ----
console.log('\n🎉 创建 GitHub Release...')
const releaseInfo = await githubPost(`/repos/${OWNER}/${REPO}/releases`, {
  tag_name: `v${newVersion}`,
  name: `v${newVersion}`,
  body: `## 记账本 v${newVersion}\n\n### 下载\n请下载下方的 \`记账本 Setup ${newVersion}.exe\` 安装。`,
  draft: false,
  prerelease: false,
})
console.log(`✅ Release 已创建: ${releaseInfo.html_url}`)

// ---- 6. 打开浏览器上传安装包 ----
const editUrl = `https://github.com/${OWNER}/${REPO}/releases/edit/v${newVersion}`
console.log(`\n📂 安装包位置: release\\`)
console.log(`   请上传以下文件到 GitHub Release:`)
console.log(`   - 记账本 Setup ${newVersion}.exe`)
console.log(`   - 记账本 Setup ${newVersion}.exe.blockmap`)
console.log(`   - latest.yml`)
console.log(`\n🌐 正在打开浏览器...`)
exec(`start ${editUrl}`)

console.log(`\n✅ 全部完成！v${newVersion} 已发布`)
console.log(`   ${releaseInfo.html_url}\n`)

// ---- 工具函数 ----
function githubPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request({
      hostname: 'api.github.com',
      path, method: 'POST', agent,
      headers: {
        'Authorization': `token ${GH_TOKEN}`,
        'User-Agent': 'jizhang-release',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
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
    req.write(data)
    req.end()
  })
}
