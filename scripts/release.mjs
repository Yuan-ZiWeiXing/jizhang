#!/usr/bin/env node
/**
 * 发布脚本：git commit -> bump版本 -> 构建打包 -> 发布到GitHub Releases
 * 用法：
 *   npm run release         # patch (1.0.0 -> 1.0.1)
 *   npm run release:minor   # minor (1.0.0 -> 1.1.0)
 *   npm run release:major   # major (1.0.0 -> 2.0.0)
 * 需要环境变量：GH_TOKEN
 */
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// ---- 检查 GH_TOKEN ----
const GH_TOKEN = process.env.GH_TOKEN
if (!GH_TOKEN) {
  console.error('\n❌ 缺少 GH_TOKEN 环境变量')
  console.error('   Windows: set GH_TOKEN=ghp_xxx && npm run release')
  console.error('   或在 .env.local 中设置（不会被提交）')
  process.exit(1)
}

const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || ''
const OWNER = 'Yuan-ZiWeiXing'
const REPO = 'jizhang'
const bumpType = process.argv[2] || 'patch'

// ---- 1. 先提交当前未提交的代码 ----
console.log('\n📝 检查工作区...')
try {
  const status = execSync('git status --porcelain', { cwd: root }).toString().trim()
  if (status) {
    console.log('  发现未提交文件，正在提交...')
    if (PROXY) execSync(`git config http.proxy ${PROXY}`, { cwd: root })
    execSync('git add -A', { cwd: root, stdio: 'inherit' })
    execSync('git commit -m "chore: pre-release changes"', { cwd: root, stdio: 'inherit' })
  } else {
    console.log('  工作区干净')
  }
} catch (e) {
  // 没有变更时 commit 会失败，忽略
}

// ---- 2. Bump 版本号 ----
const pkgPath = join(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const [major, minor, patch] = pkg.version.split('.').map(Number)
let newVersion
if (bumpType === 'major') newVersion = `${major + 1}.0.0`
else if (bumpType === 'minor') newVersion = `${major}.${minor + 1}.0`
else newVersion = `${major}.${minor}.${patch + 1}`

console.log(`\n🔖 版本 ${pkg.version} -> ${newVersion}`)
pkg.version = newVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

// ---- 3. 构建前端 ----
console.log('\n🔨 构建前端...')
execSync('npx vite build', { cwd: root, stdio: 'inherit' })

// ---- 4. electron-builder 打包并发布到 GitHub ----
console.log('\n📦 打包并发布到 GitHub Releases...')
execSync('npx electron-builder --win --publish always', {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    GH_TOKEN,
    // electron-builder 走系统代理
    ...(PROXY ? { HTTPS_PROXY: PROXY, https_proxy: PROXY } : {}),
  }
})

// ---- 5. Git tag + push ----
console.log('\n🚀 推送代码和标签...')
const authRemote = `https://${GH_TOKEN}@github.com/${OWNER}/${REPO}.git`
if (PROXY) execSync(`git config http.proxy ${PROXY}`, { cwd: root })
execSync('git add -A', { cwd: root, stdio: 'inherit' })
try {
  execSync(`git commit -m "chore: release v${newVersion}"`, { cwd: root, stdio: 'inherit' })
} catch {
  // 没有变更时跳过
}
try {
  execSync(`git tag v${newVersion}`, { cwd: root })
} catch {
  console.log(`  tag v${newVersion} 已存在，跳过`)
}
execSync(`git push ${authRemote} HEAD --tags`, { cwd: root, stdio: 'inherit' })

console.log(`\n✅ 发布完成！`)
console.log(`   https://github.com/${OWNER}/${REPO}/releases/tag/v${newVersion}\n`)
