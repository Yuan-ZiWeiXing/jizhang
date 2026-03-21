#!/usr/bin/env node
/**
 * 发布脚本：提交代码 -> bump版本 -> 构建打包 -> 推送tag -> 创建Release -> 打开浏览器上传
 * 用法：
 *   npm run release         # patch (1.0.x -> 1.0.x+1)
 *   npm run release:minor   # minor
 *   npm run release:major   # major
 * 需要环境变量：GH_TOKEN
 */
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import { SocksProxyAgent } from 'socks-proxy-agent'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// 从 .env.local 读取配置
const envFile = join(root, '.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf-8').split('\n')) {
    const [key, ...vals] = line.trim().split('=')
    if (key && !key.startsWith('#') && vals.length) {
      process.env[key.trim()] = vals.join('=').trim()
    }
  }
}

const GH_TOKEN = process.env.GH_TOKEN
if (!GH_TOKEN) {
  console.error('\n❌ 缺少 GH_TOKEN')
  console.error('   set GH_TOKEN=ghp_xxx && npm run release')
  process.exit(1)
}

// 代理仅用于 GitHub API（Node.js），git push 走本地网络
const SOCKS_PROXY = process.env.SOCKS_PROXY || 'socks5://127.0.0.1:7898'
const agent = new SocksProxyAgent(SOCKS_PROXY)
const OWNER = 'Yuan-ZiWeiXing'
const REPO = 'jizhang'
const bumpType = process.argv[2] || 'patch'

// ---- 1. 提交未暂存的改动 ----
console.log('\n📝 检查工作区...')
const status = execSync('git status --porcelain', { cwd: root }).toString().trim()
if (status) {
  console.log('  提交未暂存的改动...')
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
// 清除代理配置，走本地网络
try { execSync('git config --unset http.proxy', { cwd: root }) } catch {}
try { execSync('git config --unset https.proxy', { cwd: root }) } catch {}
const authRemote = `https://${GH_TOKEN}@github.com/${OWNER}/${REPO}.git`
execSync('git add -A', { cwd: root, stdio: 'inherit' })
try {
  execSync(`git commit -m "chore: release v${newVersion}"`, { cwd: root, stdio: 'inherit' })
} catch {}
try {
  execSync(`git tag v${newVersion}`, { cwd: root })
} catch {
  console.log(`  tag v${newVersion} 已存在`)
}
execSync(`git push ${authRemote} HEAD --tags`, { cwd: root, stdio: 'inherit' })
console.log('✅ 代码和标签已推送')

// ---- 5. 创建 GitHub Release ----
console.log('\n🎉 创建 GitHub Release...')
const releaseInfo = await githubApi('POST', `/repos/${OWNER}/${REPO}/releases`, {
  tag_name: `v${newVersion}`,
  name: `v${newVersion}`,
  body: `## 记账本 v${newVersion}\n\n### 安装\n下载下方 \`记账本 Setup ${newVersion}.exe\` 安装即可。`,
  draft: false,
  prerelease: false,
})
console.log(`✅ Release: ${releaseInfo.html_url}`)

// ---- 6. electron-builder 上传安装包 ----
console.log('\n⬆️  上传安装包到 GitHub Release...')
execSync('npx electron-builder --win --publish always', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, GH_TOKEN },
})

console.log(`\n🎊 v${newVersion} 发布完成！`)
console.log(`   ${releaseInfo.html_url}\n`)

// ---- 工具 ----
function githubApi(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request({
      hostname: 'api.github.com',
      path, method, agent,
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
