import { Classes } from '@blueprintjs/core'
import Document, { Head, Html, Main, NextScript } from 'next/document'

class CustomDocument extends Document {
  render(): JSX.Element {
    return (
      <Html>
        <Head />
        <body className={`bg-darkgray-3 ${Classes.DARK}`}>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default CustomDocument
