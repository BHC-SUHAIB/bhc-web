// Renders a JSON-LD <script>. The `<` escape prevents a script-injection
// break-out if any string field ever contains markup. Server component.
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
