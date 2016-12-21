var mjml = require('./lib/index')

const inputMJML = `<mjml>
  <mj-body>
    <mj-container background-color="#d6dde5">
      <mj-column>
        <mj-button
            align="left"
            border="2px solid #F9A73E"
            font-size="16px"
            font-weight="400"
            padding="0 68px 26px 68px"
            font-family="'Open Sans', sans-serif"
            background-color="#ffffff"
            href="<%=@tip.link.to_s%>"
            color="#F9A73E">READ MORE</mj-button>
      </mj-column>
    </mj-container>
  </mj-body>
</mjml>`

try {
  const { html, errors } = mjml.mjml2html(inputMJML, { beautify: true, level: "soft" })

  if (errors) {
    console.log(errors.map(e => e.formattedMessage).join('\n'))
  }

  console.log(html)
} catch(e) {
  if (e.getMessages) {
  console.log(e.getMessages())
  } else {
    throw e
  }
}
