import {describe,expect,it} from 'vitest'
import {collections,settings} from './catalog'
import {commonRecordHelp,recordHelp,recordIntros,settingHelp,settingIntros} from './help'

describe('field help', () => {
  it('explains every section', () => {
    expect(settings.filter(g => !g.help).map(g => g.key)).toEqual([])
    expect(collections.filter(g => !g.help).map(g => g.key)).toEqual([])
  })
  it('only names sections and fields that exist', () => {
    const orphans = (groups: typeof settings, intros: Record<string, string>, help: Record<string, Record<string, string>>) => [
      ...Object.keys(intros).filter(key => !groups.some(g => g.key === key)),
      ...Object.entries(help).flatMap(([key, fields]) => Object.keys(fields).filter(field => !groups.find(g => g.key === key)?.fields.some(f => f.key === field)).map(field => `${key}.${field}`)),
    ]
    expect(orphans(settings, settingIntros, settingHelp)).toEqual([])
    expect(orphans(collections, recordIntros, recordHelp)).toEqual([])
    expect(Object.keys(commonRecordHelp).filter(key => !collections.some(g => g.fields.some(f => f.key === key)))).toEqual([])
  })
  it('keeps help to plain guidance', () => {
    for (const g of [...settings, ...collections]) for (const text of [g.help, ...g.fields.map(f => f.help)]) if (text) expect(text.length).toBeLessThan(320)
  })
})
