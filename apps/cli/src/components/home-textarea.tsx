export function HomeTextarea() {
  return (
    <box width="100%" border borderStyle="rounded" paddingX={1}>
      <textarea
        width="100%"
        height={3}
        placeholder="Ask anything..."
        focused
      />
    </box>
  )
}
