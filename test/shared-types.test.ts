import assert from 'node:assert/strict'
import test from 'node:test'

import {
  GLITCH_THEMES,
  PRESETS,
  THEMES,
  createDefaultState,
  normalizeGlitchConfig,
  normalizeHudPosition
} from '../src/renderer/shared/types.ts'

test('default state creates independent nested settings', () => {
  const first = createDefaultState()
  const second = createDefaultState()

  first.layout.clock.offset = 0.25
  first.glitchConfig.cyber.bars.enabled = false

  assert.equal(second.layout.clock.offset, 1)
  assert.equal(second.glitchConfig.cyber.bars.enabled, true)
  assert.equal(second.performanceProfile, 'balanced')
})

test('HUD positions migrate legacy corners and clamp offsets', () => {
  const fallback = { side: 'top' as const, offset: 0.5 }

  assert.deepEqual(normalizeHudPosition('bottom-right', fallback), {
    side: 'bottom',
    offset: 1
  })
  assert.deepEqual(normalizeHudPosition({ side: 'left', offset: -4 }, fallback), {
    side: 'left',
    offset: 0
  })
  assert.deepEqual(normalizeHudPosition({ side: 'right', offset: 8 }, fallback), {
    side: 'right',
    offset: 1
  })
  assert.deepEqual(normalizeHudPosition({ side: 'diagonal', offset: 0.2 }, fallback), fallback)
})

test('glitch settings retain defaults while sanitizing persisted intensity', () => {
  const normalized = normalizeGlitchConfig({
    cyber: {
      bars: { enabled: false, intensity: 99 },
      removedEffect: { enabled: true, intensity: 1 }
    }
  })

  assert.equal(normalized.cyber.bars.enabled, false)
  assert.equal(normalized.cyber.bars.intensity, 2)
  assert.equal('removedEffect' in normalized.cyber, false)
  assert.equal(normalized.cyber.rgbSplit.enabled, true)
})

test('presets only reference registered themes and glitch styles', () => {
  const themeIds = new Set(THEMES.map((theme) => theme.id))
  const glitchIds = new Set(GLITCH_THEMES.map((theme) => theme.id))

  assert.equal(new Set(PRESETS.map((preset) => preset.id)).size, PRESETS.length)
  for (const preset of PRESETS) {
    assert.equal(themeIds.has(preset.values.colorThemeId ?? ''), true)
    assert.equal(glitchIds.has(preset.values.glitchThemeId ?? ''), true)
  }
})
