import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'

vi.mock('../../hooks/useTransactions', () => ({
  useTransactions: () => ({ rows: [], connection: 'live' }),
}))

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

describe('App routes', () => {
  it('shows the simulator at /add', () => {
    renderAt('/add')

    expect(screen.getByRole('heading', { name: /simulator/i })).toBeTruthy()
  })

  it('shows the dashboard at /monitor', () => {
    renderAt('/monitor')

    expect(screen.getByRole('heading', { name: /monitor/i })).toBeTruthy()
  })

  it('redirects / to the dashboard', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: /monitor/i })).toBeTruthy()
  })

  it('links to both routes', () => {
    renderAt('/add')

    expect(screen.getByRole('link', { name: /simulator/i }).getAttribute('href')).toBe('/add')
    expect(screen.getByRole('link', { name: /monitor/i }).getAttribute('href')).toBe('/monitor')
  })
})
