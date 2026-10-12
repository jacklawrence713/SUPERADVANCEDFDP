import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const afdpSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8')

describe('Desktop Navigation Interactions', () => {
  
  it('desktop sidebar renders only when isDesktop is true', () => {
    expect(afdpSrc).toContain('isDesktop&&React.createElement("div"')
    expect(afdpSrc).toContain('width:220,flexShrink:0,position:"sticky"')
  })

  it('desktop sidebar has proper overflow handling for scrollable content', () => {
    const sidebarMatch = afdpSrc.match(/isDesktop&&React\.createElement\("div",\{style:\{[^}]*position:"sticky"[^}]*overflowY/)
    expect(sidebarMatch).toBeTruthy()
  })

  it('desktop sidebar navigation buttons have onClick handlers', () => {
    expect(afdpSrc).toContain('[["trade","Trade Analyzer"')
    expect(afdpSrc).toMatch(/\.map\(function\(item\)\{[^}]*var active=tab===item\[0\][^}]*return React\.createElement\("button",\{[^}]*onClick:function/)
  })

  it('navigation handlers call setTab correctly', () => {
    expect(afdpSrc).toContain('setTab(item[0])')
    expect(afdpSrc).toContain('trackEvent("tab_change"')
  })

  it('mobile navigation does not render on desktop (isDesktop check)', () => {
    expect(afdpSrc).toContain('!isDesktop&&React.createElement("div",{style:{position:"fixed",bottom:0')
  })

  it('desktop and mobile have separate navigation buttons', () => {
    const desktopNav = afdpSrc.substring(
      afdpSrc.indexOf('isDesktop&&React.createElement("div",{style:{width:220'),
      afdpSrc.indexOf('isDesktop&&React.createElement("div",{style:{width:220') + 5000
    )
    const desktopButtons = desktopNav.match(/\[\["trade","Trade Analyzer/)?.[0]
    expect(desktopButtons).toBeTruthy()
  })

  it('navigation buttons have cursor:pointer style for desktop', () => {
    const navSection = afdpSrc.substring(
      afdpSrc.indexOf('[["trade","Trade Analyzer"'),
      afdpSrc.indexOf('[["trade","Trade Analyzer"') + 3000
    )
    expect(navSection).toContain('cursor:"pointer"')
  })

  it('navigation buttons are clickable (no pointer-events:none)', () => {
    const navSection = afdpSrc.substring(
      afdpSrc.indexOf('[["trade","Trade Analyzer"'),
      afdpSrc.indexOf('[["trade","Trade Analyzer"') + 3000
    )
    expect(navSection).not.toContain('pointerEvents:"none"')
  })

  it('root container uses flex row layout on desktop', () => {
    expect(afdpSrc).toContain('flexDirection:isDesktop?"row":"column"')
  })

  it('sidebar is direct child of root flex container', () => {
    expect(afdpSrc).toContain('height:"100vh",color:T.text')
    expect(afdpSrc).toContain('display:"flex",flexDirection:isDesktop?"row":"column"')
  })

  it('content area takes flex:1 to fill remaining space on desktop', () => {
    expect(afdpSrc).toContain('flex:1,minWidth:0,overflowY:"auto"')
  })

  it('tab content renders based on tab state', () => {
    expect(afdpSrc).toContain('tab==="trade"&&React.createElement')
    expect(afdpSrc).toContain('tab==="league"&&React.createElement')
    expect(afdpSrc).toContain('tab==="rankings"&&React.createElement')
    expect(afdpSrc).toContain('tab==="reports"&&React.createElement')
  })

  it('sidebar buttons protected tabs use canAccessLeagueFeatures', () => {
    const navSection = afdpSrc.substring(
      afdpSrc.indexOf('[["trade","Trade Analyzer"'),
      afdpSrc.indexOf('[["trade","Trade Analyzer"') + 3000
    )
    expect(navSection).toContain('canAccessLeagueFeatures(user)')
  })

  it('isDesktop state updates on window resize', () => {
    expect(afdpSrc).toContain('window.addEventListener("resize"')
    expect(afdpSrc).toContain('setIsDesktop(window.innerWidth>=1024)')
  })

})
