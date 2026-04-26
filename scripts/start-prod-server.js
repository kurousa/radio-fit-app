#!/usr/bin/env node

/**
 * Script to start production server for E2E testing
 * This script builds the app and starts the preview server
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

console.log('🏗️  Building application for production...')

// Build the application
const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
})

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed')
    process.exit(1)
  }

  console.log('✅ Build completed successfully')
  console.log('🚀 Starting preview server...')

  // Start the preview server
  const previewProcess = spawn('npm', ['run', 'preview'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  })

  console.log('📝 Server started at http://localhost:4173')
  console.log('🧪 You can now run E2E tests with: pnpm test:e2e-prod')
  console.log('⏹️  Press Ctrl+C to stop the server')

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping server...')
    previewProcess.kill('SIGINT')
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    previewProcess.kill('SIGTERM')
    process.exit(0)
  })
})

buildProcess.on('error', (error) => {
  console.error('❌ Build process error:', error)
  process.exit(1)
})
