import { Card } from './card';
import { ThemedText } from './themed-text';

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 16, gap: 4 }}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="stat">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {detail}
      </ThemedText>
    </Card>
  );
}
