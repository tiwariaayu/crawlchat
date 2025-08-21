import { Group, type GroupProps } from "@chakra-ui/react";

export function RGroup({
  children,
  ...restProps
}: { children: React.ReactNode } & GroupProps) {
  return (
    <Group flexDir={["column", "column", "row"]} gap={2} {...restProps}>
      {children}
    </Group>
  );
}
