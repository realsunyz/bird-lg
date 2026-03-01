"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { type HTMLMotionProps, type Transition } from "motion/react";
import * as motion from "motion/react-m";

import {
  Highlight,
  HighlightItem,
  type HighlightProps,
  type HighlightItemProps,
} from "@/components/animate-ui/primitives/effects/highlight";
import { getStrictContext } from "@/lib/get-strict-context";
import { useControlledState } from "@/hooks/use-controlled-state";
import {
  AutoHeight,
  type AutoHeightProps,
} from "@/components/animate-ui/primitives/effects/auto-height";

type TabsContextType = {
  value: string | undefined;
  setValue: TabsProps["onValueChange"];
};

const [TabsProvider, useTabs] = getStrictContext<TabsContextType>("TabsContext");

type TabsProps = React.ComponentProps<typeof TabsPrimitive.Root>;

function Tabs(props: TabsProps) {
  const [value, setValue] = useControlledState({
    value: props.value,
    defaultValue: props.defaultValue,
    onChange: props.onValueChange,
  });

  return (
    <TabsProvider value={{ value, setValue }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        {...props}
        className={cn("flex flex-col gap-2", props.className)}
        onValueChange={setValue}
      />
    </TabsProvider>
  );
}

type TabsHighlightProps = Omit<HighlightProps, "controlledItems" | "value"> & {
  containerClassName?: string;
  forceUpdateBounds?: boolean;
};

function TabsHighlight({
  transition = { type: "spring", stiffness: 200, damping: 25 },
  ...props
}: TabsHighlightProps) {
  const { value } = useTabs();

  return (
    <Highlight
      data-slot="tabs-highlight"
      controlledItems
      value={value}
      transition={transition}
      click={false}
      {...props}
    />
  );
}

type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List>;

function TabsList({ className, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

type TabsHighlightItemProps = HighlightItemProps & {
  value: string;
};

function TabsHighlightItem(props: TabsHighlightItemProps) {
  return <HighlightItem data-slot="tabs-highlight-item" {...props} />;
}

type TabsTriggerProps = React.ComponentProps<typeof TabsPrimitive.Trigger>;

function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
        className,
      )}
      {...props}
    />
  );
}

type TabsContentProps = React.ComponentProps<typeof TabsPrimitive.Content> & HTMLMotionProps<"div">;

function TabsContent({
  value,
  forceMount,
  transition = { duration: 0.5, ease: "easeInOut" },
  ...props
}: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      asChild
      forceMount={forceMount}
      value={value}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        props.className,
      )}
    >
      <motion.div
        data-slot="tabs-content"
        initial={{ opacity: 0, filter: "blur(4px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={transition}
        {...props}
      />
    </TabsPrimitive.Content>
  );
}

type TabsContentsAutoProps = AutoHeightProps & {
  mode?: "auto-height";
  children: React.ReactNode;
  transition?: Transition;
};

type TabsContentsLayoutProps = Omit<HTMLMotionProps<"div">, "transition"> & {
  mode: "layout";
  children: React.ReactNode;
  transition?: Transition;
};

type TabsContentsProps = TabsContentsAutoProps | TabsContentsLayoutProps;

const defaultTransition: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 30,
};

function isAutoMode(props: TabsContentsProps): props is TabsContentsAutoProps {
  return !("mode" in props) || props.mode === "auto-height";
}

function TabsContents(props: TabsContentsProps) {
  const { value } = useTabs();

  if (isAutoMode(props)) {
    const { transition = defaultTransition, ...autoProps } = props;

    return (
      <AutoHeight data-slot="tabs-contents" deps={[value]} transition={transition} {...autoProps} />
    );
  }

  const { transition = defaultTransition, style, ...layoutProps } = props;

  return (
    <motion.div
      data-slot="tabs-contents"
      layout="size"
      layoutDependency={value}
      style={{ overflow: "hidden", ...style }}
      transition={{ layout: transition }}
      {...layoutProps}
    />
  );
}

export {
  Tabs,
  TabsHighlight,
  TabsHighlightItem,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsContents,
  type TabsProps,
  type TabsHighlightProps,
  type TabsHighlightItemProps,
  type TabsListProps,
  type TabsTriggerProps,
  type TabsContentProps,
  type TabsContentsProps,
};
