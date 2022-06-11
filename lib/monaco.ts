import { Monaco } from '@monaco-editor/react'
import stripJsonComments from 'strip-json-comments'
import { gooseMonarch } from './gooose.monarch'
import { oneDarkTheme } from './oneDark.theme'

export const initMonaco = async (monaco: Monaco): Promise<void> => {
  monaco.languages.register({
    id: 'goose',
    aliases: ['Goose'],
    extensions: ['.goose', '.goos'],
    mimetypes: ['text/x-goose'],
  })

  monaco.editor.defineTheme('oneDark', oneDarkTheme)

  const languageConfiguration = await fetch(
    'https://raw.githubusercontent.com/wiisportsresort/goose/main/extension/language-configuration.json'
  )

  monaco.languages.setLanguageConfiguration(
    'goose',
    JSON.parse(stripJsonComments(await languageConfiguration.text()))
  )

  monaco.languages.setMonarchTokensProvider('goose', gooseMonarch)

  monaco.editor.setTheme('oneDark')
}
