"use client";

import { CheckCircleFilled, CloseOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Grid, Progress, Typography } from "antd";
import { useState } from "react";
import type { PropertySetup, SetupStepKey } from "@/lib/api/types";

const LABELS: Record<SetupStepKey, string> = {
  details: "Property details",
  flats: "Add flats",
  apartments: "Add apartments",
  rooms: "Describe rooms",
  amenities: "Shared amenities",
  photos: "Upload photos",
};

/** Shown until the property is fully set up; each missing step is one click away. */
export function SetupChecklist({ setup, onAction }: { setup: PropertySetup; onAction: (key: SetupStepKey) => void }) {
  const [hidden, setHidden] = useState(false);
  const screens = Grid.useBreakpoint();
  if (hidden || setup.completedSteps === setup.steps.length) {
    return null;
  }
  const roomsLeft = setup.apartments - setup.apartmentsWithRooms;
  return (
    <Card size="small" style={{ marginBottom: 16, background: "#f0fbf9", borderColor: "#b7e4dc" }}>
      <Flex align="center" gap={16} wrap>
        <Flex vertical style={{ minWidth: 160 }}>
          <Typography.Text strong>Finish setting up</Typography.Text>
          <Progress percent={Math.round((setup.completedSteps / setup.steps.length) * 100)} size="small"
            format={() => `${setup.completedSteps}/${setup.steps.length}`} style={{ margin: 0 }} />
        </Flex>
        <Flex wrap gap={8} style={{ flex: 1 }}>
          {setup.steps.filter((step) => screens.md || !step.done).map((step) => step.done ? (
            <Typography.Text key={step.key} type="secondary" style={{ fontSize: 13, padding: "4px 6px" }}>
              <CheckCircleFilled style={{ color: "#16a34a" }} /> {LABELS[step.key]}
            </Typography.Text>
          ) : (
            <Button key={step.key} size="small" onClick={() => onAction(step.key)}>
              {LABELS[step.key]}{step.key === "rooms" && roomsLeft > 0 ? ` (${roomsLeft} left)` : ""} <RightOutlined />
            </Button>
          ))}
        </Flex>
        <Button type="text" size="small" icon={<CloseOutlined />} aria-label="Hide set-up checklist" onClick={() => setHidden(true)} />
      </Flex>
    </Card>
  );
}
