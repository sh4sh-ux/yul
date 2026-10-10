import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAnswers, initialiseProfiles, resetDatabaseConnectionForTests, saveAnswer } from '../storage'
import { SettingsScreen } from './SettingsScreen'

const clearDatabase = async () => {
  await resetDatabaseConnectionForTests()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('yuli-learning')
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); request.onblocked = () => resolve()
  })
  await resetDatabaseConnectionForTests()
}

describe('SettingsScreen learning reset', () => {
  beforeEach(clearDatabase)
  afterEach(clearDatabase)

  it('does not change any data when the final reset confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const profiles = await initialiseProfiles()
    const profile = { ...profiles.find((item) => item.id === 'gayul')!, year: 5 }
    await saveAnswer({ id: 'keep-me', profileId: 'gayul', missionId: 'pizza', questionId: 'question', correct: false, hintsUsed: 1, answeredAt: '2026-10-10T00:00:00.000Z', answer: '1/4' })
    render(<SettingsScreen profile={profile} profiles={profiles} onEdit={vi.fn()} onProfileChange={vi.fn()} onSwitch={vi.fn()} onRestored={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '가율 기록 초기화' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('삭제 후 복구할 수 없습니다')
    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await getAnswers('gayul')).toHaveLength(1)
  })

  it('runs the confirmed reset and asks the app to refresh immediately', async () => {
    const user = userEvent.setup()
    const profiles = await initialiseProfiles()
    const profile = { ...profiles.find((item) => item.id === 'gayul')!, year: 5, xp: 30 }
    await saveAnswer({ id: 'remove-me', profileId: 'gayul', missionId: 'pizza', questionId: 'question', correct: true, hintsUsed: 0, answeredAt: '2026-10-10T00:00:00.000Z', answer: '3/4' })
    const onRestored = vi.fn().mockResolvedValue(undefined)
    render(<SettingsScreen profile={profile} profiles={profiles} onEdit={vi.fn()} onProfileChange={vi.fn()} onSwitch={vi.fn()} onRestored={onRestored} />)

    await user.click(screen.getByRole('button', { name: '가율 기록 초기화' }))
    await user.click(screen.getByRole('button', { name: '최종 확인 및 초기화' }))

    await waitFor(() => expect(onRestored).toHaveBeenCalledOnce())
    expect(await getAnswers('gayul')).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent('안전하게 초기화')
  })
})
