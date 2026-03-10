type JsonValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export default function StructuredData({ data }: { data: JsonValue }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
