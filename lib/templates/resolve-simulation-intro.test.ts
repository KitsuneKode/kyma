import { describe, expect, it } from 'vitest'

import { resolveSimulationIntroLine } from '@/lib/templates/resolve-simulation-intro'

describe('resolveSimulationIntroLine', () => {
  it('uses tutor-specific teaching intro for tutor job family', () => {
    const intro = resolveSimulationIntroLine({
      jobFamily: 'tutor',
      simulationMode: 'teaching',
      candidateName: 'Alex',
    })

    expect(intro).toContain('Mia')
    expect(intro).toContain('Alex')
    expect(intro).not.toContain('{candidateName}')
  })

  it('uses software engineering intro instead of tutor Mia script', () => {
    const intro = resolveSimulationIntroLine({
      jobFamily: 'software_engineering',
      simulationMode: 'teaching',
      candidateName: 'Jordan',
    })

    expect(intro).toContain('Alex')
    expect(intro).not.toContain('Mia')
    expect(intro).not.toContain('fractions')
  })

  it('falls back to mode-generic intro for unknown job family', () => {
    const intro = resolveSimulationIntroLine({
      jobFamily: 'unknown_family',
      simulationMode: 'roleplay',
      candidateName: 'Sam',
    })

    expect(intro).toContain('Sam')
    expect(intro).toContain('roleplay')
    expect(intro).not.toContain('Mia')
  })
})
